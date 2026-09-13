import {memoryMedia} from './memory-media.js';

export function mountMemoryPlayer(host,memory,{onError=()=>{},volume=.65}={}){
 const items=memoryMedia(memory);let index=0,timer=null,paused=false,disposed=false,serial=0;
 const soundtrack=memory.soundtrack?.src?new Audio(memory.soundtrack.src):null;let audioBlocked=false;
 if(soundtrack){soundtrack.loop=true;soundtrack.preload='auto';soundtrack.volume=Math.max(0,Math.min(1,volume));soundtrack.addEventListener('error',()=>onError('The soundtrack could not load. You can still browse these photos.'));}
 const playSoundtrack=()=>{if(!soundtrack||paused||disposed||document.hidden)return;soundtrack.play().then(()=>{audioBlocked=false;if(disposed||paused||document.hidden)soundtrack.pause();}).catch(()=>{if(!disposed){audioBlocked=true;onError('Press Space to start the memory soundtrack.');}});};
 const stage=host.querySelector('.memory-media'),counter=host.querySelector('.slide-counter'),toggle=host.querySelector('[data-slide="pause"]');
 const clear=()=>{clearTimeout(timer);timer=null;};
 const schedule=()=>{clear();if(!disposed&&!paused&&!document.hidden&&items.length>1&&items[index].type==='image')timer=setTimeout(()=>show(index+1),2000);};
 function update(){if(counter)counter.textContent=`${index+1} / ${items.length}`;if(toggle)toggle.textContent=paused?'Play slideshow':'Pause slideshow';}
 function show(next){
  clear();stage.querySelector('video')?.pause();index=(next+items.length)%items.length;const token=++serial,a=items[index],el=document.createElement(a.type==='video'?'video':'img');
  if(a.type==='video'){
   el.id='memory-player';el.playsInline=true;el.preload='auto';el.tabIndex=0;el.muted=!!soundtrack;
   el.addEventListener('ended',()=>{if(!disposed&&token===serial&&!paused&&items.length>1)show(index+1);});
  }else{el.alt=`${memory.title}${items.length>1?` — photo ${index+1}`:''}`;el.addEventListener('load',()=>{if(token===serial)schedule();});}
  el.addEventListener('error',()=>{if(token===serial){clear();onError('This item could not be loaded. Use the arrows to continue.');}});
  stage.replaceChildren(el);el.src=a.src;update();
  if(a.type==='video'&&!paused)el.play().catch(()=>onError('Press Space to play this memory.'));
 }
 function togglePause(){if(audioBlocked&&!paused){playSoundtrack();return;}paused=!paused;clear();if(paused)soundtrack?.pause();else playSoundtrack();const video=stage.querySelector('video');if(video){if(paused)video.pause();else video.play().catch(()=>onError('Press Space to play this memory.'));}else if(!paused)schedule();update();}
 const click=e=>{const action=e.target.closest('[data-slide]')?.dataset.slide;if(action==='pause')togglePause();if(action==='next')show(index+1);if(action==='previous')show(index-1);};
 const visibility=()=>{if(document.hidden){clear();stage.querySelector('video')?.pause();soundtrack?.pause();}else if(!paused){playSoundtrack();const video=stage.querySelector('video');if(video)video.play().catch(()=>{});else schedule();}};
 host.addEventListener('click',click);document.addEventListener('visibilitychange',visibility);show(0);playSoundtrack();
 return {toggle:togglePause,next:()=>show(index+1),previous:()=>show(index-1),dispose(){disposed=true;serial++;clear();stage.querySelector('video')?.pause();if(soundtrack){soundtrack.pause();soundtrack.removeAttribute('src');soundtrack.load();}host.removeEventListener('click',click);document.removeEventListener('visibilitychange',visibility);}};
}
