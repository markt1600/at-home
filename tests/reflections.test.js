import test from 'node:test';
import assert from 'node:assert/strict';
import {reflectionSurfaces} from '../src/house-reflections.js';
import {BALCONY_DOORS,planPoint} from '../src/house-layout.js';
import {MirrorHaunting,REFLECTION_TIMING} from '../src/mirror.js';

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

test('walking near glass triggers after the cooldown even when entering early, without a run limit',()=>{
 const h=new MirrorHaunting(()=>0,REFLECTION_TIMING),walk={active:true,near:true,moving:true};
 assert.equal(h.tick(1,walk),null);
 h.tick(100,{...walk,active:false});assert.equal(h.cooldown,3);
 assert.equal(h.tick(3,walk).type,'show');
 for(let i=0;i<18;i++){
  assert.equal(h.tick(5.4,walk).type,'hide');
  assert.equal(h.tick(11,walk),null);
  // Remaining nearby during the wait must not swallow the next encounter.
  assert.equal(h.tick(1,walk).type,'show');
 }
 assert.equal(h.count,19);
 h.reset();assert.equal(h.count,0);assert.equal(h.cooldown,4);
});

test('a ready reflection still needs a nearby approach or movement and never interrupts another clip',()=>{
 const h=new MirrorHaunting(()=>0,REFLECTION_TIMING),still={active:true,near:true,moving:false};
 h.tick(1,still);assert.equal(h.tick(20,still),null);
 assert.equal(h.tick(1,{...still,near:false,moving:true}),null);
 assert.equal(h.tick(.1,still).type,'show');
 assert.equal(h.tick(1,{...still,moving:true}),null);
 assert.equal(h.tick(5,still).type,'hide');
 assert.equal(h.tick(100,still),null);
 assert.equal(h.tick(.1,{...still,moving:true}).type,'show');
});
