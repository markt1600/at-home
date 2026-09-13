import {memoryMedia} from './memory-media.js';

export function mountMemoryPlayer(host,memory,{onError=()=>{}}={}){
 const items=memoryMedia(memory);let index=0,timer=null,paused=false,disposed=false,serial=0;
 const stage=host.querySelector('.memory-media'),counter=host.querySelector('.slide-counter'),toggle=host.querySelector('[data-slide="pause"]');
 const clear=()=>{clearTimeout(timer);timer=null;};
 const schedule=()=>{clear();if(!disposed&&!paused&&!document.hidden&&items.length>1&&items[index].type==='image')timer=setTimeout(()=>show(index+1),2000);};
 function update(){if(counter)counter.textContent=`${index+1} / ${items.length}`;if(toggle)toggle.textContent=paused?'Play slideshow':'Pause slideshow';}
 function show(next){
  clear();stage.querySelector('video')?.pause();index=(next+items.length)%items.length;const token=++serial,a=items[index],el=document.createElement(a.type==='video'?'video':'img');
  if(a.type==='video'){
   el.id='memory-player';el.playsInline=true;el.preload='auto';el.tabIndex=0;
   el.addEventListener('ended',()=>{if(!disposed&&token===serial&&!paused&&items.length>1)show(index+1);});
  }else{el.alt=`${memory.title}${items.length>1?` — photo ${index+1}`:''}`;el.addEventListener('load',()=>{if(token===serial)schedule();});}
  el.addEventListener('error',()=>{if(token===serial){clear();onError('This item could not be loaded. Use the arrows to continue.');}});
  stage.replaceChildren(el);el.src=a.src;update();
  if(a.type==='video'&&!paused)el.play().catch(()=>onError('Press Space to play this memory.'));
 }
 function togglePause(){paused=!paused;clear();const video=stage.querySelector('video');if(video){if(paused)video.pause();else video.play().catch(()=>onError('Press Space to play this memory.'));}else if(!paused)schedule();update();}
 const click=e=>{const action=e.target.closest('[data-slide]')?.dataset.slide;if(action==='pause')togglePause();if(action==='next')show(index+1);if(action==='previous')show(index-1);};
 const visibility=()=>{if(document.hidden){clear();stage.querySelector('video')?.pause();}else if(!paused){const video=stage.querySelector('video');if(video)video.play().catch(()=>{});else schedule();}};
 host.addEventListener('click',click);document.addEventListener('visibilitychange',visibility);show(0);
 return {toggle:togglePause,next:()=>show(index+1),previous:()=>show(index-1),dispose(){disposed=true;serial++;clear();stage.querySelector('video')?.pause();host.removeEventListener('click',click);document.removeEventListener('visibilitychange',visibility);}};
}
