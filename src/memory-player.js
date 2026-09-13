import {memoryMedia} from './memory-media.js';

export function mountMemoryPlayer(host,memory,{onError=()=>{},volume=.65}={}){
 const items=memoryMedia(memory);let index=0,requested=0,timer=null,paused=false,disposed=false,serial=0,loading=false;
 const photos=new Map();
 const soundtrack=memory.soundtrack?.src?new Audio(memory.soundtrack.src):null;let audioBlocked=false;
 if(soundtrack){soundtrack.loop=true;soundtrack.preload='auto';soundtrack.volume=Math.max(0,Math.min(1,volume));soundtrack.addEventListener('error',()=>onError('The soundtrack could not load. You can still browse these photos.'));}
 const playSoundtrack=()=>{if(!soundtrack||paused||disposed||document.hidden)return;soundtrack.play().then(()=>{audioBlocked=false;if(disposed||paused||document.hidden)soundtrack.pause();}).catch(()=>{if(!disposed){audioBlocked=true;onError('Press Space to start the memory soundtrack.');}});};
 const stage=host.querySelector('.memory-media'),counter=host.querySelector('.slide-counter'),toggle=host.querySelector('[data-slide="pause"]');
 const clear=()=>{clearTimeout(timer);timer=null;};
 const schedule=()=>{clear();if(!disposed&&!loading&&!paused&&!document.hidden&&items.length>1&&items[index].type==='image')timer=setTimeout(()=>show(index+1),2000);};
 // Decode offscreen, then move the already decoded element into the stage.
 // Keep the old photograph in place for as long as a slow connection needs.
 function photo(i){
  if(photos.has(i))return photos.get(i);
  const promise=new Promise((resolve,reject)=>{
   const el=document.createElement('img');el.alt=`${memory.title}${items.length>1?` — photo ${i+1}`:''}`;
   el.onload=async()=>{try{if(el.decode)await el.decode();resolve(el);}catch(error){reject(error);}};
   el.onerror=()=>reject(new Error('Photo could not load'));el.src=items[i].src;
  });photos.set(i,promise);promise.catch(()=>{if(photos.get(i)===promise)photos.delete(i);});return promise;
 }
 function prefetch(){const keep=new Set([index,(index-1+items.length)%items.length]);for(let ahead=1;ahead<=Math.min(2,items.length-1);ahead++){const i=(index+ahead)%items.length;keep.add(i);if(items[i].type==='image')photo(i).catch(()=>{});}for(const key of photos.keys())if(!keep.has(key))photos.delete(key);}
 function update(){if(counter)counter.textContent=`${index+1} / ${items.length}`;if(toggle)toggle.textContent=paused?'Play slideshow':'Pause slideshow';}
 async function show(next){
  clear();requested=(next+items.length)%items.length;const target=requested,token=++serial,a=items[target];loading=true;stage.setAttribute('aria-busy','true');
  let el;
  if(a.type==='image'){
   try{el=await photo(target);}catch{if(!disposed&&token===serial){loading=false;requested=index;stage.setAttribute('aria-busy','false');onError('This photo could not be loaded. The previous photo is still here; use the arrows to try another.');}return;}
   if(disposed||token!==serial)return;
  }else el=document.createElement('video');
  stage.querySelector('video')?.pause();index=target;loading=false;stage.setAttribute('aria-busy','false');
  if(a.type==='video'){
   el.id='memory-player';el.playsInline=true;el.preload='auto';el.tabIndex=0;el.muted=!!soundtrack;
   el.addEventListener('ended',()=>{if(!disposed&&token===serial&&!paused&&items.length>1)show(index+1);});
  }
  el.addEventListener('error',()=>{if(token===serial){clear();onError('This item could not be loaded. Use the arrows to continue.');}});
  stage.replaceChildren(el);onError('');update();prefetch();
  if(a.type==='video'){el.src=a.src;if(!paused&&!document.hidden)el.play().catch(()=>{if(!disposed&&token===serial)onError('Press Space to play this memory.');});}else schedule();
 }
 function togglePause(){if(audioBlocked&&!paused){playSoundtrack();return;}paused=!paused;clear();if(paused)soundtrack?.pause();else playSoundtrack();const video=stage.querySelector('video');if(video){if(paused)video.pause();else video.play().catch(()=>onError('Press Space to play this memory.'));}else if(!paused)schedule();update();}
 const click=e=>{const action=e.target.closest('[data-slide]')?.dataset.slide;if(action==='pause')togglePause();if(action==='next')show(requested+1);if(action==='previous')show(requested-1);};
 const visibility=()=>{if(document.hidden){clear();stage.querySelector('video')?.pause();soundtrack?.pause();}else if(!paused){playSoundtrack();const video=stage.querySelector('video');if(video)video.play().catch(()=>{});else schedule();}};
 host.addEventListener('click',click);document.addEventListener('visibilitychange',visibility);show(0);playSoundtrack();
 return {toggle:togglePause,next:()=>show(requested+1),previous:()=>show(requested-1),dispose(){disposed=true;serial++;clear();photos.clear();stage.querySelector('video')?.pause();if(soundtrack){soundtrack.pause();soundtrack.removeAttribute('src');soundtrack.load();}host.removeEventListener('click',click);document.removeEventListener('visibilitychange',visibility);}};
}
