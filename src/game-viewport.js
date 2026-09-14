// Keep the canvas and controls in the same visible viewport, including iOS
// address-bar changes, keyboard dismissal, page restoration and rotation.
export const hasTouchInput=(win=window)=>win.navigator.maxTouchPoints>0||win.matchMedia('(any-pointer: coarse)').matches;
export function viewportBounds(win=window){
 const v=win.visualViewport,scale=v?.scale||1,zoomed=Math.abs(scale-1)>.01;
 // Browser zoom is not a smaller phone. Keep renderer dimensions stable even
 // if a browser restores a previously zoomed page before the gesture guard runs.
 return {width:Math.max(1,Math.round(v?.width*scale||win.innerWidth)),height:Math.max(1,Math.round(v?.height*scale||win.innerHeight)),left:zoomed?0:v?.offsetLeft||0,top:zoomed?0:v?.offsetTop||0};
}
export function installGameViewport(win=window,root=document.documentElement){
 let touch=hasTouchInput(win),last='';const listeners=[];
 const update=()=>{touch ||= hasTouchInput(win);root.classList.toggle('touch-device',touch);const b=viewportBounds(win),key=JSON.stringify(b);if(last===key)return;last=key;for(const [name,value] of Object.entries(b))root.style.setProperty('--view-'+name,value+'px');};
 const on=(target,type,fn)=>{target?.addEventListener(type,fn);listeners.push(()=>target?.removeEventListener(type,fn));};
 const touched=e=>{if(e.pointerType==='touch'){touch=true;update();}};
 for(const type of ['resize','orientationchange','pageshow'])on(win,type,update);
 for(const type of ['resize','scroll'])on(win.visualViewport,type,update);
 on(win.document,'visibilitychange',update);on(win,'pointerdown',touched);on(win.matchMedia('(any-pointer: coarse)'),'change',update);update();
 return ()=>listeners.forEach(remove=>remove());
}
export function fitRenderer(renderer,camera,width,height,force=false){
 const size=renderer.getSize({set(x,y){this.x=x;this.y=y;return this;}});
 if(force||size.x!==width||size.y!==height){renderer.setRenderTarget(null);renderer.resetState();renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
 // Reflection passes and restored WebGL contexts must not leave a sub-viewport.
 renderer.setRenderTarget(null);renderer.setScissorTest(false);renderer.setViewport(0,0,width,height);
}
