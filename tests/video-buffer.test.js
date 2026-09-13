import test from 'node:test';
import assert from 'node:assert/strict';
import {bufferedAhead,manageVideoBuffer} from '../src/video-buffer.js';

class Video extends EventTarget{
 constructor(){super();this.currentTime=0;this.duration=60;this.readyState=2;this.paused=true;this.ends=[];this.buffered={get length(){return this.v.ends.length;},v:this,start:i=>this.ends[i][0],end:i=>this.ends[i][1]};this.plays=0;}
 play(){this.paused=false;this.plays++;return Promise.resolve();}pause(){this.paused=true;}removeAttribute(){}load(){}fire(event){this.dispatchEvent(new Event(event));}
}
test('video buffers before starting, waits longer after an underrun, and respects pause/close',async()=>{
 const v=new Video(),status=[],b=manageVideoBuffer(v,{onStatus:s=>status.push(s)});
 try{
  b.resume();assert.equal(v.plays,0);v.ends=[[0,2]];v.fire('progress');assert.equal(v.plays,0);
  v.ends=[[0,7]];v.fire('progress');await new Promise(setImmediate);assert.equal(v.plays,1);assert.equal(status.at(-1),'');
  v.currentTime=7;v.fire('waiting');assert.equal(v.paused,true);v.ends=[[0,15]];v.fire('progress');assert.equal(v.paused,true,'larger refill after stall');
  v.ends=[[0,20]];v.fire('progress');await new Promise(setImmediate);assert.equal(v.paused,false);
  b.pause();v.fire('progress');assert.equal(v.paused,true,'user pause wins over progress');
  b.resume();await new Promise(setImmediate);assert.equal(v.paused,false);
 }finally{b.dispose();}const calls=v.plays;v.fire('progress');assert.equal(v.plays,calls);assert.equal(v.paused,true);
});
test('short video starts when all of it is buffered; disjoint future ranges do not count',()=>{
 const v=new Video();v.duration=3;v.ends=[[0,2.99],[25,30]];assert.equal(bufferedAhead(v),2.99);const b=manageVideoBuffer(v,{slow:true});try{b.resume();assert.equal(v.plays,1);}finally{b.dispose();}
 v.currentTime=10;assert.equal(bufferedAhead(v),0);
});
test('a browser that suspends preloading can start with two seconds instead of waiting forever',()=>{
 const v=new Video(),b=manageVideoBuffer(v,{slow:true});try{b.resume();v.ends=[[0,3]];v.fire('progress');assert.equal(v.plays,0);v.fire('suspend');assert.equal(v.plays,1);}finally{b.dispose();}
});
