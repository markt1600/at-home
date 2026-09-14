export function installTouchLook(canvas,world){
 let drag=null;
 const reset=()=>{drag=null;world.touchMove={x:0,z:0};world.keys={};};
 canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch'||world.paused||world.mode!=='play'||drag)return;
  e.preventDefault();drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,time:e.timeStamp,moved:false};canvas.setPointerCapture(e.pointerId);
 });
 canvas.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId||world.paused)return;
  if(!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<8)return;
  drag.moved=true;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(world.telescope.active)world.telescope.pan(dx*2,dy*2);
  else{world.yaw-=dx*.005;world.pitch=Math.max(-1.3,Math.min(1.05,world.pitch-dy*.005));}
  drag.x=e.clientX;drag.y=e.clientY;
 });
 canvas.addEventListener('pointerup',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const tap=!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<8&&e.timeStamp-drag.time<650;drag=null;
  if(tap&&!world.paused&&world.mode==='play'&&!world.telescope.active)world.onTap?.(e.clientX,e.clientY);
 });
 for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(drag?.id===e.pointerId)drag=null;});
 for(const event of ['blur','resize','orientationchange','pageshow'])window.addEventListener(event,reset);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
}

export function installTouchStick(element,world){
 const knob=element.querySelector('.touch-knob');let pointer=null,origin=null;
 const reset=()=>{pointer=null;origin=null;world.touchMove={x:0,z:0};knob.style.transform='translate(0,0)';};
 const move=e=>{if(e.pointerId!==pointer||world.paused||world.telescope?.active)return;const dx=e.clientX-origin.x,dz=e.clientY-origin.y,r=46,length=Math.hypot(dx,dz),scale=Math.min(1,r/(length||1)),x=dx*scale,z=dz*scale;world.touchMove={x:Math.abs(x)<5?0:x/r,z:Math.abs(z)<5?0:z/r};knob.style.transform=`translate(${x}px,${z}px)`;};
 const down=e=>{if(pointer!==null||world.paused||world.telescope?.active)return;e.preventDefault();pointer=e.pointerId;const b=element.getBoundingClientRect();origin={x:b.left+b.width/2,y:b.top+b.height/2};element.setPointerCapture(pointer);move(e);};
 const up=e=>{if(e.pointerId===pointer)reset();};
 const hidden=()=>{if(document.hidden)reset();};
 element.addEventListener('pointerdown',down);element.addEventListener('pointermove',move);
 for(const event of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(event,up);
 for(const event of ['blur','resize','orientationchange','pageshow'])window.addEventListener(event,reset);window.visualViewport?.addEventListener('resize',reset);document.addEventListener('visibilitychange',hidden);
 return ()=>{reset();element.removeEventListener('pointerdown',down);element.removeEventListener('pointermove',move);for(const event of ['pointerup','pointercancel','lostpointercapture'])element.removeEventListener(event,up);for(const event of ['blur','resize','orientationchange','pageshow'])window.removeEventListener(event,reset);window.visualViewport?.removeEventListener('resize',reset);document.removeEventListener('visibilitychange',hidden);};
}
