import {memoryMedia} from './memory-media.js';
import {manageVideoBuffer} from './video-buffer.js';
import {downloadVideo} from './video-download.js';

export function mountMemoryPlayer(host,memory,{onError=()=>{},volume=.65}={}){
 const items=memoryMedia(memory);let index=0,requested=0,timer=null,paused=false,disposed=false,serial=0,loading=false;
 const photos=new Map();let videoBuffer=null,download=null,downloadUrl=null;
 const releaseDownload=()=>{download?.abort();download=null;if(downloadUrl){URL.revokeObjectURL(downloadUrl);downloadUrl=null;}};
 const soundtrack=memory.soundtrack?.src?new Audio(memory.soundtrack.src):null;let audioBlocked=false;
 if(soundtrack){soundtrack.loop=true;soundtrack.preload='auto';soundtrack.volume=Math.max(0,Math.min(1,volume));soundtrack.addEventListener('error',()=>onError('The soundtrack could not load. You can still browse these photos.'));}
 const playSoundtrack=()=>{if(!soundtrack||paused||disposed||document.hidden)return;soundtrack.play().then(()=>{audioBlocked=false;if(disposed||paused||document.hidden)soundtrack.pause();}).catch(()=>{if(!disposed){audioBlocked=true;onError('Tap Play memory, or press Space, to start the soundtrack.');}});};
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
 function update(){if(counter)counter.textContent=`${index+1} / ${items.length}`;if(toggle)toggle.textContent=paused?'Play memory':'Pause memory';host.querySelectorAll('[data-video]').forEach(b=>b.hidden=items[index].type!=='video');}
 async function show(next){
  clear();requested=(next+items.length)%items.length;const target=requested,token=++serial,a=items[target];loading=true;stage.setAttribute('aria-busy','true');
  let el;
  if(a.type==='image'){
   try{el=await photo(target);}catch{if(!disposed&&token===serial){loading=false;requested=index;stage.setAttribute('aria-busy','false');onError('This photo could not be loaded. The previous photo is still here; use the arrows to try another.');}return;}
   if(disposed||token!==serial)return;
  }else el=document.createElement('video');
  videoBuffer?.dispose();videoBuffer=null;releaseDownload();index=target;loading=false;stage.setAttribute('aria-busy','false');
  if(a.type==='video'){
   el.id='memory-player';el.playsInline=true;el.preload='auto';el.tabIndex=0;el.muted=!!soundtrack;el.volume=Math.max(0,Math.min(1,volume));
   el.addEventListener('ended',()=>{if(!disposed&&token===serial&&!paused&&items.length>1)show(index+1);});
  }
  stage.replaceChildren(el);onError('');update();prefetch();
  if(a.type==='video'){
   const connection=globalThis.navigator?.connection;
   videoBuffer=manageVideoBuffer(el,{slow:connection?.saveData||['slow-2g','2g','3g'].includes(connection?.effectiveType),onStatus:message=>{if(!disposed&&token===serial&&!download)onError(message);},onPreloadLimited:()=>loadFirst(true),onBlocked:()=>{paused=true;onError('Tap Play memory, or press Space, to start.');update();}});
   el.src=a.src;el.load();if(!paused&&!document.hidden)videoBuffer.resume();
  }else schedule();
 }
 function togglePause(){if(audioBlocked&&!paused){playSoundtrack();return;}paused=!paused;clear();if(paused)soundtrack?.pause();else playSoundtrack();if(videoBuffer&&!download){if(paused)videoBuffer.pause();else videoBuffer.resume();}else if(!paused)schedule();update();}
 async function loadFirst(automatic=false){
  if(download||!videoBuffer)return;const controller=new AbortController();download=controller;const token=serial,el=stage.querySelector('video'),time=el.currentTime;videoBuffer.pause();soundtrack?.pause();
  const button=host.querySelector('[data-video="download"]');if(button){button.disabled=true;button.textContent='Downloading…';}
  try{
   const blob=await downloadVideo(items[index].src,{signal:controller.signal,maxBytes:automatic?128*1024*1024:Infinity,onProgress:(bytes,total)=>{if(!disposed&&token===serial)onError(total?`Downloading before playback… ${Math.round(bytes/total*100)}%`:`Downloading before playback… ${(bytes/1048576).toFixed(1)} MB`);}});
   if(disposed||token!==serial)return;download=null;if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=URL.createObjectURL(blob);
   el.addEventListener('loadedmetadata',()=>{if(disposed||token!==serial)return;el.currentTime=time;if(!paused&&!document.hidden){videoBuffer.resume();playSoundtrack();}},{once:true});el.src=downloadUrl;el.load();onError('Video downloaded. Ready to play.');
  }catch(error){if(!controller.signal.aborted)onError(error.message==='Full download needs confirmation'?'This is a large video. Tap Load video first to download it completely before playback.':'The download was interrupted. Tap Load video first to try again.');}
  finally{if(download===controller)download=null;if(button){button.disabled=false;button.textContent='Load video first';}}
 }
 const click=e=>{const action=e.target.closest('[data-slide]')?.dataset.slide;if(action==='pause')togglePause();if(action==='next')show(requested+1);if(action==='previous')show(requested-1);const videoAction=e.target.closest('[data-video]')?.dataset.video;if(videoAction==='retry'&&!download){paused=false;videoBuffer?.retry();update();}if(videoAction==='download')loadFirst();};
 const visibility=()=>{if(document.hidden){clear();videoBuffer?.pause();soundtrack?.pause();}else if(!paused){playSoundtrack();if(videoBuffer&&!download)videoBuffer.resume();else if(!download)schedule();}};
 host.addEventListener('click',click);document.addEventListener('visibilitychange',visibility);show(0);playSoundtrack();
 return {toggle:togglePause,next:()=>show(requested+1),previous:()=>show(requested-1),dispose(){disposed=true;serial++;clear();photos.clear();releaseDownload();videoBuffer?.dispose();if(soundtrack){soundtrack.pause();soundtrack.removeAttribute('src');soundtrack.load();}host.removeEventListener('click',click);document.removeEventListener('visibilitychange',visibility);}};
}
