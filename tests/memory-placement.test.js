import test from 'node:test';
import assert from 'node:assert/strict';
import {memorySpotAtPlan,positionToPlan} from '../src/memory-placement.js';
import {planPoint} from '../src/house-layout.js';

test('floor plan positions round-trip and use the correct sunken, raised and stair elevations',()=>{
 for(const [p,y] of [[[507,620],0],[[493,846],.45],[[632,583],.75],[[486,505.5],.375]]){
  const spot=memorySpotAtPlan(...p);assert.ok(spot);assert.ok(Math.abs(spot.position[1]-y)<1e-6);
  assert.deepEqual(positionToPlan(spot.position),p);
 }
});
test('memory pins cannot be placed outside, in inaccessible storage, or inside a solid partition',()=>{
 for(const p of [[0,0],[970,880],[945,509],[740,415],[NaN,300]])assert.equal(memorySpotAtPlan(...p),null,JSON.stringify(p));
 const doorway=memorySpotAtPlan(766,415);assert.ok(doorway,'open doorways stay selectable');
 const [x,z]=planPoint(766,415);assert.deepEqual(doorway.position,[x,.75,z]);
});
