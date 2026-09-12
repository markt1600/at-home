import test from 'node:test';
import assert from 'node:assert/strict';
import {reflectionSurfaces} from '../src/house-reflections.js';
import {BALCONY_DOORS,planPoint} from '../src/house-layout.js';

test('balcony reflections cover only the parked glass leaves and leave the walkway open',()=>{
 const surfaces=reflectionSurfaces();
 for(const door of BALCONY_DOORS){
  const leaves=surfaces.filter(p=>p.id.startsWith(door.id));assert.equal(leaves.length,2);
  const [x,z]=planPoint(...door.center);
  for(const pane of leaves){
   assert.equal(pane.position[0],x);
   assert.ok(Math.abs(pane.position[2]-z)-pane.width/2>door.width/4);
   assert.ok(Math.abs(pane.position[2]-z)+pane.width/2<door.width/2);
   assert.ok(pane.position[1]-pane.height/2>door.base);
   assert.ok(pane.position[1]+pane.height/2<door.base+2.38);
  }
 }
});
