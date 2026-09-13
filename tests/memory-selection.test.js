import test from 'node:test';
import assert from 'node:assert/strict';
import {selectMemory} from '../src/memory-selection.js';
const p={x:0,y:1.7,z:0},near={id:'near',position:[.2,0,0]},far={id:'far',position:[0,0,-1]};
test('aim wins over proximity and list order; otherwise use the closest ring',()=>{
 assert.deepEqual(selectMemory([near,far],p,{x:0,y:-1.673,z:-1},0),{memory:far,aimed:true});
 assert.equal(selectMemory([far,near],p,{x:0,y:0,z:-1},0).memory,near);
 assert.equal(selectMemory([far,near],p,{x:0,y:1,z:-1},0).memory,near);
});
test('rings outside the activation zone or on another floor cannot be activated',()=>{
 assert.equal(selectMemory([{id:'distant',position:[0,0,-2]},{id:'upstairs',position:[0,.75,0]}],p,{x:0,y:-1,z:-1},0).memory,null);
});
