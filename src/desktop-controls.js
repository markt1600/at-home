// A mouse click uses the centre-dot action, just like E. Require a mouse press
// on the canvas so touch-generated clicks and clicks closing UI cannot leak in.
export function installDesktopInteraction(canvas,world){
 let armed=false;
 const available=()=>world.mode==='play'&&!world.paused&&!world.telescope.active;
 const reset=()=>{armed=false;};
 canvas.addEventListener('pointerdown',e=>{
  armed=e.pointerType==='mouse'&&e.button===0&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.defaultPrevented&&available();
 });
 canvas.addEventListener('click',e=>{
  const activate=armed&&e.button===0&&(!e.pointerType||e.pointerType==='mouse')&&!e.sourceCapabilities?.firesTouchEvents&&!e.defaultPrevented&&available();
  reset();if(!activate)return;
  world.onInteract?.();
  // An action may open a dialog or enter the telescope, releasing pointer lock.
  if(available())world.lock();
 });
 canvas.addEventListener('pointercancel',reset);window.addEventListener('blur',reset);
 document.addEventListener('visibilitychange',reset);
}
