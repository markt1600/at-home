import test from 'node:test';
import assert from 'node:assert/strict';
import {reflectionSurfaces} from '../src/house-reflections.js';
import {BALCONY_DOORS,planPoint} from '../src/house-layout.js';
import {MirrorHaunting} from '../src/mirror.js';

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

test('longer reflection performances freeze while paused and share a bounded cooldown',()=>{
 const h=new MirrorHaunting(()=>0,{duration:5.3,limit:2,cooldown:38,variation:28});
 h.tick(12,{active:true,near:false});assert.equal(h.tick(.1,{active:true,near:true}).type,'show');
 h.tick(2,{active:true,near:true});assert.equal(h.remaining,3.3);
 h.tick(100,{active:false,near:false});assert.equal(h.remaining,3.3);
 assert.equal(h.tick(3.4,{active:true,near:true}).type,'hide');
 h.tick(37,{active:true,near:false});assert.equal(h.tick(.1,{active:true,near:true}),null);
 h.tick(2,{active:true,near:false});assert.equal(h.tick(.1,{active:true,near:true}).type,'show');
 h.tick(6,{active:true,near:true});h.tick(100,{active:true,near:false});assert.equal(h.tick(.1,{active:true,near:true}),null);
});
