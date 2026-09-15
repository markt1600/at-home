import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHouseModel} from '../scripts/house-model.mjs';
import {HandInteractionBody} from '../src/hand-interaction-body.js';
import {installPetBone} from '../src/pet-bone-model.js';
import {PetRoaming} from '../src/pet-roaming.js';
import {PETS,newLife} from '../src/life.js';
import {floorHeight,HOUSE_VIEWS} from '../src/house-layout.js';
import {inWalkableArea} from '../src/navigation.js';
import {armBox} from '../src/hand-arm-pose.js';

const w=createHouseModel({optimize:false});w.handInteraction=new HandInteractionBody(w);w.petRoaming=new PetRoaming(w.colliders,()=>.4);w.actors=new Map();
for(const pet of PETS.filter(p=>!p.stationary))w.petRoaming.register(pet.id,pet.plan);
const bone=installPetBone(w),rig=w.boneThrow;
function setup(){
 w.handInteraction.cancel();bone.bind(newLife());w.focus('living');const [x,,z]=HOUSE_VIEWS.living;
 for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const p={x:x+dx*.7,z:z+dz*.7};if(!inWalkableArea(p.x,p.z,true,w.colliders))continue;
  bone.place(p);bone.persist();bone.updateModel();w.camera.lookAt(bone.x,bone.y,bone.z);w.yaw=w.camera.rotation.y;w.pitch=w.camera.rotation.x;
  if(rig.start())return {x:bone.x,z:bone.z};
 }
 throw Error('No open living-room pickup');
}
function tick(dt=.025){w.handInteraction.update(dt);w.petRoaming.update(dt,{player:w.camera.position});bone.update(dt,w.camera.position);rig.update(dt);bone.updateModel();w.handInteraction.updateArms();}
function until(predicate){for(let i=0;i<1200&&!predicate();i++)tick();assert.ok(predicate());}

test('first-person pickup bends the body, grips one bone, then launches from the hand before Leo chases',()=>{
 const saved=setup();assert.equal(bone.phase,'pickup');assert.equal(rig.start(),false);assert.ok(rig.hands.every(h=>!h.visible));assert.deepEqual(bone.life.bone,saved);
 until(()=>rig.held);assert.ok(w.camera.position.y-floorHeight(w.camera.position.x,w.camera.position.z)<1.05);assert.equal(bone.mesh.parent,rig.hands[1]);assert.equal(bone.phase,'pickup');assert.equal(w.petRoaming.pets.get('sunny').command,null);assert.deepEqual(bone.life.bone,saved);
 const before=bone.mesh.getWorldPosition(new THREE.Vector3()),time=rig.time,camera=w.camera.position.clone();tick(0);assert.equal(rig.time,time);assert.deepEqual(w.camera.position,camera);assert.ok(before.distanceTo(bone.mesh.getWorldPosition(new THREE.Vector3()))<.0001);
 w.yaw+=.4;w.pitch+=.2;const yaw=w.yaw,pitch=w.pitch;until(()=>rig.time>2.8);assert.equal(w.yaw,yaw);assert.equal(w.pitch,pitch);assert.ok(w.camera.position.y-floorHeight(w.camera.position.x,w.camera.position.z)>1.6);assert.equal(bone.mesh.parent,rig.hands[1]);
 until(()=>rig.released);assert.equal(bone.phase,'throw');assert.equal(bone.mesh.parent,w.scene);assert.ok(bone.mesh.position.distanceTo(new THREE.Vector3(bone.launch.x,bone.launch.y,bone.launch.z))<.001);assert.ok(w.petRoaming.pets.get('sunny').command);assert.ok(bone.launch.y>floorHeight(bone.launch.x,bone.launch.z)+.6);
 until(()=>!rig.active);assert.equal(w.handInteraction.active,false);assert.ok(rig.hands.every(h=>!h.visible));
 const phases=new Set();for(let i=0;i<3600&&bone.phase!=='rest';i++){tick();phases.add(bone.phase);}assert.ok(phases.has('return'));assert.equal(bone.phase,'rest');assert.ok(Math.hypot(bone.x-w.camera.position.x,bone.z-w.camera.position.z)<1.05);assert.deepEqual(bone.life.bone,{x:bone.x,z:bone.z});
});

test('cancelling before or after grasp returns the sole bone to its saved floor position and releases movement',()=>{
 for(const grasp of [false,true]){const saved=setup();if(grasp)until(()=>rig.held);w.handInteraction.cancel();assert.equal(bone.phase,'rest');assert.equal(bone.mesh.parent,w.scene);assert.equal(rig.held,false);assert.equal(rig.active,false);assert.equal(w.handInteraction.active,false);assert.deepEqual(bone.life.bone,saved);assert.deepEqual({x:bone.x,z:bone.z},saved);assert.equal(w.petRoaming.pets.get('sunny').command,null);}
});

test('an unreachable fetch at release restores the bone and finishes the body animation',()=>{
 const saved=setup();until(()=>rig.held);const command=w.petRoaming.command;w.petRoaming.command=()=>false;
 try{until(()=>!rig.active);assert.equal(bone.phase,'rest');assert.deepEqual(bone.life.bone,saved);assert.equal(bone.mesh.parent,w.scene);assert.equal(w.handInteraction.active,false);}finally{w.petRoaming.command=command;}
});

test('an obstructed arm stops the pickup without clipping or losing the saved bone',()=>{
 const saved=setup();until(()=>w.handInteraction.settled);
 w.handInteraction.obstacles.push(armBox(rig.root,[-1,-1,-1],[1,2,2],'blocked pickup space'));tick();
 assert.ok(w.handInteraction.lastBlockedPose);assert.equal(w.handInteraction.active,false);assert.equal(w.handInteraction.arms.visible,false);assert.equal(rig.active,false);assert.equal(bone.phase,'rest');assert.equal(bone.mesh.parent,w.scene);assert.deepEqual(bone.life.bone,saved);
});
