import test from 'node:test';
import assert from 'node:assert/strict';
import {mountMemoryPlayer} from '../src/memory-player.js';
test('slides remain visible until the next image is loaded and decoded; stale requests cannot replace newer choices',async t=>{
 const pending=new Map(),timers=new Map();let timerId=0;
 const stage={child:null,setAttribute(){},querySelector(){return null;},replaceChildren(el){this.child=el;}},counter={},toggle={};
 const host={querySelectorAll:()=>[],querySelector:s=>s==='.memory-media'?stage:s==='.slide-counter'?counter:toggle,addEventListener(){},removeEventListener(){}};
 t.mock.method(globalThis,'setTimeout',fn=>{timers.set(++timerId,fn);return timerId;});t.mock.method(globalThis,'clearTimeout',id=>timers.delete(id));
 const previous=globalThis.document;
 globalThis.document={hidden:false,addEventListener(){},removeEventListener(){},createElement(){return {addEventListener(){},decode:()=>Promise.resolve(),set src(value){this.source=value;pending.set(value,this);}};}};
 t.after(()=>{globalThis.document=previous;});const errors=[];
 const player=mountMemoryPlayer(host,{title:'Test',media:['a','b','c'].map(src=>({src,type:'image'}))},{onError:e=>errors.push(e)});
 await pending.get('a').onload();await Promise.resolve();assert.equal(stage.child.source,'a');assert.ok(pending.has('b'),'next image preloaded');assert.equal(timers.size,1);
 [...timers.values()][0]();assert.equal(stage.child.source,'a');assert.equal(timers.size,0,'no timer while waiting');
 let decode;pending.get('b').decode=()=>new Promise(r=>decode=r);const loadingB=pending.get('b').onload();await Promise.resolve();assert.equal(stage.child.source,'a','download alone is not enough');decode();await loadingB;await Promise.resolve();assert.equal(stage.child.source,'b');assert.equal(timers.size,1);
 const next=player.next();assert.equal(stage.child.source,'b');await player.previous();assert.equal(stage.child.source,'b');await pending.get('c').onload();await next;assert.equal(stage.child.source,'b','stale image ignored');
 player.toggle();await player.next();assert.equal(stage.child.source,'c');assert.equal(timers.size,0,'manual navigation while paused does not restart timer');
 player.dispose();assert.equal(timers.size,0);assert.ok(errors.every(e=>e===''));
});
test('failed images retain the current photograph and allow navigation or retry',async t=>{
 const pending=new Map(),stage={child:null,setAttribute(){},querySelector(){return null;},replaceChildren(el){this.child=el;}},host={querySelectorAll:()=>[],querySelector:s=>s==='.memory-media'?stage:null,addEventListener(){},removeEventListener(){}};
 const previous=globalThis.document;globalThis.document={hidden:false,addEventListener(){},removeEventListener(){},createElement(){return {addEventListener(){},set src(s){this.source=s;pending.set(s,this);}};}};t.after(()=>{globalThis.document=previous;});
 const errors=[],player=mountMemoryPlayer(host,{title:'Test',media:['a','b'].map(src=>({src,type:'image'}))},{onError:e=>errors.push(e)});await pending.get('a').onload();await Promise.resolve();player.toggle();
 const failed=player.next();pending.get('b').onerror();await failed;assert.equal(stage.child.source,'a');assert.match(errors.at(-1),/could not be loaded/);
 const retry=player.next();await pending.get('b').onload();await retry;assert.equal(stage.child.source,'b');player.dispose();
});
