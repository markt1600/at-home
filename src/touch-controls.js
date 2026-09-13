export function installTouchStick(element,world){
 const knob=element.querySelector('.touch-knob');let pointer=null,origin=null;
 const reset=()=>{pointer=null;origin=null;world.touchMove={x:0,z:0};knob.style.transform='translate(0,0)';};
 const move=e=>{if(e.pointerId!==pointer||world.paused||world.telescope?.active)return;const dx=e.clientX-origin.x,dz=e.clientY-origin.y,r=46,length=Math.hypot(dx,dz),scale=Math.min(1,r/(length||1)),x=dx*scale,z=dz*scale;world.touchMove={x:Math.abs(x)<5?0:x/r,z:Math.abs(z)<5?0:z/r};knob.style.transform=`translate(${x}px,${z}px)`;};
 const down=e=>{if(pointer!==null||world.paused||world.telescope?.active)return;e.preventDefault();pointer=e.pointerId;const b=element.getBoundingClientRect();origin={x:b.left+b.width/2,y:b.top+b.height/2};element.setPointerCapture(pointer);move(e);};
 const up=e=>{if(e.pointerId===pointer)reset();};
 const hidden=()=>{if(document.hidden)reset();};
 element.addEventListener('pointerdown',down);element.addEventListener('pointermove',move);
 for(const event of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(event,up);
 window.addEventListener('blur',reset);document.addEventListener('visibilitychange',hidden);
 return ()=>{reset();element.removeEventListener('pointerdown',down);element.removeEventListener('pointermove',move);for(const event of ['pointerup','pointercancel','lostpointercapture'])element.removeEventListener(event,up);window.removeEventListener('blur',reset);document.removeEventListener('visibilitychange',hidden);};
}
