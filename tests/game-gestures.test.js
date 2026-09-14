import test from 'node:test';
import assert from 'node:assert/strict';
import {installGameGestures} from '../src/game-gestures.js';
import {installGameViewport,viewportBounds} from '../src/game-viewport.js';

test('native pinch gestures are cancelled without consuming single-finger scrolling or pointer controls',()=>{
 const doc=new EventTarget(),stop=installGameGestures(doc);
 for(const type of ['gesturestart','gesturechange','gestureend']){
  const e=new Event(type,{cancelable:true});doc.dispatchEvent(e);assert.ok(e.defaultPrevented,type);
 }
 const touch=count=>{const e=Object.assign(new Event('touchmove',{cancelable:true}),{touches:Array(count).fill({})});doc.dispatchEvent(e);return e;};
 assert.equal(touch(1).defaultPrevented,false);assert.equal(touch(2).defaultPrevented,true);
 for(const type of ['pointerdown','pointermove','pointerup','touchstart','touchend','click']){
  const e=new Event(type,{cancelable:true});doc.dispatchEvent(e);assert.equal(e.defaultPrevented,false,`${type} remains available for game controls`);
 }
 assert.doesNotThrow(()=>doc.dispatchEvent(new Event('gesturechange')));
 stop();const e=new Event('gesturestart',{cancelable:true});doc.dispatchEvent(e);assert.equal(e.defaultPrevented,false);
});

test('zoom cannot shrink or offset the game viewport, but rotation and the keyboard still resize it',()=>{
 const win=Object.assign(new EventTarget(),{innerWidth:390,innerHeight:844,navigator:{maxTouchPoints:5},document:new EventTarget(),matchMedia:()=>new EventTarget(),visualViewport:Object.assign(new EventTarget(),{width:390,height:844,scale:1,offsetLeft:0,offsetTop:0})});
 const styles={};let writes=0;const stop=installGameViewport(win,{classList:{toggle(){}},style:{setProperty:(name,value)=>{styles[name]=value;writes++;}}});
 const normal=viewportBounds(win),initialWrites=writes;
 Object.assign(win.visualViewport,{width:195,height:422,scale:2,offsetLeft:80,offsetTop:100});win.visualViewport.dispatchEvent(new Event('resize'));
 assert.deepEqual(viewportBounds(win),normal);assert.equal(writes,initialWrites,'a pinch does not relayout the controls');
 Object.assign(win.visualViewport,{width:844,height:390,scale:1,offsetLeft:0,offsetTop:0});Object.assign(win,{innerWidth:844,innerHeight:390});win.dispatchEvent(new Event('orientationchange'));
 assert.equal(styles['--view-width'],'844px');assert.equal(styles['--view-height'],'390px');
 Object.assign(win.visualViewport,{height:210,offsetTop:12});win.visualViewport.dispatchEvent(new Event('resize'));
 assert.equal(styles['--view-height'],'210px');assert.equal(styles['--view-top'],'12px');
 Object.assign(win.visualViewport,{height:390,offsetTop:0});win.dispatchEvent(new Event('pageshow'));assert.equal(styles['--view-height'],'390px');assert.equal(styles['--view-top'],'0px');stop();
});
