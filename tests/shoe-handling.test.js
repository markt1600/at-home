import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHouseModel} from '../scripts/house-model.mjs';
import {HandInteractionBody} from '../src/hand-interaction-body.js';
import {floorHeight} from '../src/house-layout.js';

const w=createHouseModel({optimize:false}),tidy=w.shoeTidy,rig=tidy.animation;
w.handInteraction=new HandInteractionBody(w);w.houseRoot.updateMatrixWorld(true);
function setup(index=0){tidy.reset();const entry=tidy.shoes[index],p=tidy.bench.localToWorld(entry.start.clone().add(new THREE.Vector3(0,0,.8)));w.camera.position.copy(p);w.camera.position.y=floorHeight(p.x,p.z)+1.67;w.yaw=.2;w.pitch=-.4;assert.equal(tidy.pickUp(entry),true);return entry;}
function tick(dt=.025){w.handInteraction.update(dt);w.houseInteractions.update(dt);w.handInteraction.updateArms();assert.equal(w.handInteraction.lastBlockedPose,null,JSON.stringify(w.handInteraction.lastBlockedPose));}
function until(predicate){for(let i=0;i<800&&!predicate();i++)tick();assert.ok(predicate());}

test('shoe pickup bends, grips the same shoe and releases movement; placement lowers and releases it into its own slot',()=>{
 const e=setup();assert.equal(tidy.held,null);assert.equal(e.group.parent,tidy.bench);assert.equal(tidy.pickUp(tidy.shoes[1]),false);
 until(()=>rig.attached);assert.equal(e.group.parent,rig.hands[1]);assert.equal(e.tidy,false);assert.ok(w.camera.position.y-floorHeight(w.camera.position.x,w.camera.position.z)<1.05);
 const pos=w.camera.position.clone(),time=rig.time;tick(0);assert.deepEqual(w.camera.position,pos);assert.equal(rig.time,time);
 w.yaw+=.8;w.pitch+=.2;const yaw=w.yaw,pitch=w.pitch;w.keys={KeyW:true};w.touchMove={x:1,z:1};tick();assert.equal(w.yaw,yaw);assert.equal(w.pitch,pitch);assert.equal(rig.followView,false);assert.deepEqual(w.keys,{});assert.deepEqual(w.touchMove,{x:0,z:0});
 until(()=>!rig.active);assert.equal(w.yaw,yaw);assert.equal(w.pitch,pitch);assert.equal(tidy.held,e);assert.equal(w.handInteraction.active,false);assert.equal(e.group.visible,false,'the carried shoe stays with the withdrawn hand below the view');
 assert.equal(tidy.place(),true);assert.equal(tidy.place(),false);assert.equal(e.group.parent,rig.hands[1]);until(()=>rig.released);
 assert.equal(e.group.parent,tidy.bench);assert.ok(e.group.position.distanceTo(tidy.slot(e))<1e-8);assert.ok(e.group.visible);assert.equal(e.tidy,true);assert.equal(tidy.held,null);
 until(()=>!rig.active);assert.equal(w.handInteraction.active,false);assert.ok(rig.hands.every(h=>!h.visible));
});

test('cancelling pickup restores its floor shoe; cancelling placement preserves the held or already placed shoe',()=>{
 for(const contact of [false,true]){
  const e=setup();if(contact)until(()=>rig.attached);w.handInteraction.cancel();assert.equal(e.group.parent,tidy.bench);assert.ok(e.group.position.equals(e.start));assert.ok(e.group.visible);assert.equal(tidy.held,null);assert.equal(e.tidy,false);assert.equal(rig.active,false);
 }
 for(const released of [false,true]){
  const e=setup();until(()=>!rig.active);assert.ok(tidy.place());until(()=>released?rig.released:rig.time>1.4);w.handInteraction.cancel();
  assert.equal(tidy.held,released?null:e);assert.equal(e.tidy,released);assert.equal(rig.active,false);assert.equal(w.handInteraction.active,false);
  if(!released){assert.ok(tidy.place(),'cancelled placement can be retried');until(()=>!rig.active);assert.equal(e.tidy,true);}
 }
 tidy.reset();assert.ok(tidy.shoes.every(e=>e.group.parent===tidy.bench&&e.group.visible&&!e.tidy&&e.group.position.equals(e.start)));
});

test('hands and carried shoes clear the bench seat and side panels throughout representative pickup and placement paths',()=>{
 const v=new THREE.Vector3();
 for(const index of [0,6,8,21]){
  setup(index);let placed=false;
  for(let frame=0;frame<1600;frame++){
   tick();
   if(rig.active&&w.handInteraction.settled&&frame%4===0){
    for(const hand of rig.hands)if(hand.visible)hand.traverse(mesh=>{
     if(!mesh.isMesh)return;mesh.updateWorldMatrix(true,false);
     for(const solid of w.handInteraction.obstacles.filter(s=>/bench|shoe shelf/.test(s.name))){
      const matrix=solid.inverse.clone().multiply(mesh.matrixWorld),p=mesh.geometry.attributes.position;
      for(let n=0;n<p.count;n++){v.fromBufferAttribute(p,n).applyMatrix4(matrix);assert.equal(['x','y','z'].every(a=>v[a]>solid.min[a]+.002&&v[a]<solid.max[a]-.002),false,`shoe ${index}, ${rig.stage} ${rig.time}: ${mesh.parent.name} inside ${solid.name} at ${v.toArray()}`);}
     }
    });
   }
   if(!rig.active){if(placed)break;assert.ok(tidy.place());placed=true;}
  }
  assert.equal(tidy.shoes[index].tidy,true);
 }
});
