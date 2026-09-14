// Safari's native pinch gestures need an explicit guard as well as touch-action.
// Install before loading the house. Do not stop pointer events: two thumbs must
// still be able to walk, look and tap Interact at the same time.
export function installGameGestures(doc=document){
 const options={passive:false,capture:true};
 const prevent=e=>{if(e.cancelable)e.preventDefault();};
 const multiTouch=e=>{if(e.touches?.length>1)prevent(e);};
 const events=[['gesturestart',prevent],['gesturechange',prevent],['gestureend',prevent],['touchmove',multiTouch]];
 for(const [type,handler] of events)doc.addEventListener(type,handler,options);
 return ()=>{for(const [type,handler] of events)doc.removeEventListener(type,handler,options);};
}
