import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createInteractionHand} from '../src/interaction-hand.js';

const world={mat:(color,roughness)=>new THREE.MeshStandardMaterial({color,roughness})};
const point=(hand,name,offset=new THREE.Vector3())=>hand.worldToLocal(hand.getObjectByName(name).localToWorld(offset.clone()));

test('left and right thumb joints and finger proportions mirror throughout the grip',()=>{
 const hands=[-1,1].map(side=>createInteractionHand(world,new THREE.Group(),side,{articulated:true}));
 for(const grip of [0,.25,.5,.75,1]){
  hands.forEach(h=>{h.userData.grip(grip);h.updateMatrixWorld(true);});
  for(const name of ['Thumb base','Thumb tip','Index','Middle','Ring','Little']){
   const a=point(hands[0],name),b=point(hands[1],name);b.x=-b.x;
   assert.ok(a.distanceTo(b)<1e-8,`${name} at grip ${grip}`);
  }
  const a=point(hands[0],'Thumb tip',new THREE.Vector3(0,0,-.025)),b=point(hands[1],'Thumb tip',new THREE.Vector3(0,0,-.025));b.x=-b.x;assert.ok(a.distanceTo(b)<1e-8);
 }
 for(const [i,side] of [-1,1].entries()){
  const h=hands[i];h.userData.grip(0);h.updateMatrixWorld(true);
  assert.ok(point(h,'Index').x*-side>point(h,'Little').x*-side,'index is on the thumb edge');
  const base=point(h,'Thumb base'),open=point(h,'Thumb tip',new THREE.Vector3(0,0,-.025));
  assert.ok(open.x*-side>base.x*-side,'open thumb extends outward');assert.ok(open.z<base.z,'open thumb extends forward');
  h.userData.grip(1);h.updateMatrixWorld(true);const closed=point(h,'Thumb tip',new THREE.Vector3(0,0,-.025));
  assert.ok(closed.x*-side<base.x*-side,'grip opposes the thumb toward the fingers');assert.ok(closed.y<open.y-.02,'grip curls on the palm side');
  assert.ok(closed.z<base.z,'thumb cannot bend back toward the wrist');
 }
});

test('batched hands preserve the posed geometry under rotated station parents',()=>{
 for(const side of [-1,1]){
  const parent=new THREE.Group();parent.position.set(3,1.2,-4);parent.rotation.set(.2,1.8,-.1);parent.updateMatrixWorld(true);
  const posed=createInteractionHand(world,parent,side,{articulated:true,grip:.08}),batched=createInteractionHand(world,parent,side);
  const a=new THREE.Box3().setFromObject(posed,true),b=new THREE.Box3().setFromObject(batched,true);
  assert.ok(a.min.distanceTo(b.min)<1e-7);assert.ok(a.max.distanceTo(b.max)<1e-7);
  assert.equal(batched.children.length,2,'thumb detail keeps skin and nails in two draw calls');
  for(const mesh of batched.children){assert.ok(mesh.isMesh);assert.ok(mesh.geometry.attributes.position.count>0);for(const value of mesh.geometry.attributes.normal.array)assert.ok(Number.isFinite(value));}
 }
});
