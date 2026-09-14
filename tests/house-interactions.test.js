import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHouseModel} from '../scripts/house-model.mjs';
import {PetRoaming} from '../src/pet-roaming.js';
import {planPoint} from '../src/house-layout.js';

test('every new household control is selectable from a walkable position, but not remotely',()=>{
 const w=createHouseModel(),r=new PetRoaming(w.colliders);w.houseRoot.updateMatrixWorld(true);
 const controls=w.houseInteractions;assert.ok(controls.items.has('claw-machine'));assert.ok(controls.items.has('lift'));
 for(const item of controls.items.values()){
  if(item.available)continue;
  const nearby=[...r.nodes.values()].filter(n=>Math.hypot(n.x-item.pos.x,n.z-item.pos.z)<1.9);
  const view=nearby.find(n=>{w.camera.position.set(n.x,n.y+1.67,n.z);w.camera.lookAt(item.pos);return controls.select()===item.id;});
  assert.ok(view,`${item.id} must have a reachable control`);
  w.camera.position.set(item.pos.x+20,item.pos.y,item.pos.z);w.camera.lookAt(item.pos);assert.notEqual(controls.select(),item.id);
 }
});

test('lift arrives, opens, holds, and closes; taps stop; the bath fills and drains without overflowing',()=>{
 const w=createHouseModel(),controls=w.houseInteractions,lift=controls.items.get('lift');let arrivals=0;w.onLiftArrival=()=>arrivals++;
 lift.activate();assert.equal(lift.state,'calling');controls.update(0);assert.equal(lift.state,'calling');
 for(let i=0;i<36;i++)controls.update(.1);assert.equal(lift.state,'open');assert.equal(arrivals,1);assert.ok(lift.leaves[1].leaf.position.x>1);
 lift.activate();for(let i=0;i<55;i++)controls.update(.1);assert.equal(lift.state,'open');for(let i=0;i<40;i++)controls.update(.1);assert.equal(lift.state,'closed');
 for(const item of controls.items.values())if(item.water){item.activate();assert.ok(item.running);assert.ok(item.water.visible);controls.update(.2);item.activate();assert.ok(!item.running);assert.ok(!item.water.visible);}
 const bath=controls.items.get('bath-tap');bath.activate();for(let i=0;i<400;i++)controls.update(.1);assert.equal(bath.getLevel(),1);assert.ok(!bath.running);
 controls.items.get('bath-drain').activate();for(let i=0;i<220;i++)controls.update(.1);assert.equal(bath.getLevel(),0);
 const fridge=controls.items.get('fridge');w.camera.position.set(0,10,0);fridge.activate();for(let i=0;i<20;i++)controls.update(.1);assert.ok(fridge.door.rotation.y<-1.5);fridge.activate();for(let i=0;i<30;i++)controls.update(.1);assert.ok(Math.abs(fridge.door.rotation.y)<.001);
});

test('floor-height infills no longer fight the wine-cellar and doorway floor surfaces',()=>{
 const w=createHouseModel();w.houseRoot.updateMatrixWorld(true);
 for(const [px,pz] of [[468,396.6],[468,397.4],[766,414.5],[766,415.5],[708,481.5],[708,482.5],[652.5,563],[653.5,563]]){
  const [x,z]=planPoint(px,pz),hits=new THREE.Raycaster(new THREE.Vector3(x,.9,z),new THREE.Vector3(0,-1,0),0,.18).intersectObject(w.houseRoot,true).filter(h=>Math.abs(h.point.y-.75)<.001);
  assert.equal(hits.length,1,`single floor at ${px}, ${pz}`);
 }
});

test('pets do not choose busy doorway thresholds as resting destinations',()=>{
 const w=createHouseModel(),r=new PetRoaming(w.colliders,()=>.4),[x,z]=planPoint(468,397),n=r.nearest(x,z);
 assert.ok(!r.restingSpot(n));const p=r.register('sunny',[468,397]);p.wait=0;r.route(p);assert.ok(p.path.length);assert.ok(r.restingSpot(p.path.at(-1)));
 const distance=p.distance;for(let i=0;i<500;i++)r.update(.1,{player:{x:p.x+.1,y:p.y+1.67,z:p.z+1.4}});assert.ok(p.distance-distance>1,'Leo leaves the doorway');
});
