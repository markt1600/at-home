import test from 'node:test';
import assert from 'node:assert/strict';
import {SpaMusic} from '../src/spa-music.js';

function sound(){
 const oscillators=[],gains=[],parameter=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}});
 const ctx={currentTime:10,createGain(){const g={gain:parameter(),connect(){},disconnect(){this.disconnected=true;}};gains.push(g);return g;},createOscillator(){const o={frequency:parameter(),connect(){},disconnect(){},start(at){this.startAt=at;},stop(at){this.stopAt=at;}};oscillators.push(o);return o;}};
 return {ctx,master:{},async start(){},oscillators,gains};
}
test('spa music fades out all sounding and future notes on cancellation, and can restart',async()=>{
 const s=sound(),music=new SpaMusic(s);await music.play();const first=[...s.oscillators],firstBus=music.bus;assert.ok(first.length>8);assert.ok(first.some(o=>o.startAt>30));
 s.ctx.currentTime=12;music.stop();assert.ok(first.every(o=>o.stopAt===12.45));assert.equal(music.nodes.length,0);assert.equal(music.bus,null);
 await music.play();assert.notEqual(music.bus,firstBus);assert.ok(music.nodes.every(o=>!first.includes(o)));music.stop();
});
test('a slow audio permission/resume cannot begin music after the massage was cancelled',async()=>{
 const s=sound(),music=new SpaMusic(s);let resume;s.start=()=>new Promise(resolve=>resume=resolve);const pending=music.play();music.stop();resume();await pending;assert.equal(s.oscillators.length,0);
});
