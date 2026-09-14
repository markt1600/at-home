import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {installTouchLook} from '../src/touch-controls.js';
import {pickTouchInteraction} from '../src/touch-targets.js';
import {HouseInteractions} from '../src/house-interactions.js';
import {createHouseModel} from '../scripts/house-model.mjs';
import {PetRoaming} from '../src/pet-roaming.js';
import {floorHeight,planPoint} from '../src/house-layout.js';

test('short touch taps activate once; camera drags, holds, cancellations and paused gestures do not',t=>{
 const oldWindow=globalThis.window,oldDocument=globalThis.document;
 globalThis.window=new EventTarget();globalThis.document=new EventTarget();
 t.after(()=>{globalThis.window=oldWindow;globalThis.document=oldDocument;});
 const canvas=Object.assign(new EventTarget(),{setPointerCapture(){}}),taps=[];
 const world={mode:'play',paused:false,yaw:0,pitch:0,telescope:{active:false},onTap:(...p)=>taps.push(p)};
 installTouchLook(canvas,world);
 const send=(type,x,y,time,id=1)=>{const e=new Event(type);Object.defineProperties(e,Object.fromEntries(Object.entries({pointerType:'touch',pointerId:id,clientX:x,clientY:y,timeStamp:time}).map(([k,value])=>[k,{value}])));canvas.dispatchEvent(e);};
 send('pointerdown',100,100,0);send('pointermove',103,101,30);send('pointerup',103,101,100);
 assert.deepEqual(taps,[[103,101]]);assert.equal(world.yaw,0);
 send('pointerdown',100,100,200);send('pointermove',150,120,240);send('pointermove',100,100,280);send('pointerup',100,100,300);
 assert.equal(taps.length,1,'returning a drag to its origin is not a tap');
 send('pointerdown',100,100,400);send('pointerup',100,100,1100);assert.equal(taps.length,1);
 send('pointerdown',100,100,1200);send('pointercancel',100,100,1210);send('pointerup',100,100,1220);assert.equal(taps.length,1);
 send('pointerdown',100,100,1300);window.dispatchEvent(new Event('resize'));send('pointerup',100,100,1320);assert.equal(taps.length,1);
 send('pointerdown',100,100,1400);world.paused=true;send('pointerup',100,100,1420);assert.equal(taps.length,1);
 world.paused=false;send('pointerdown',100,100,1500);send('pointerup',100,100,1520,2);assert.equal(taps.length,1);send('pointerup',100,100,1530);assert.equal(taps.length,2);
 world.telescope.active=true;send('pointerdown',100,100,1600);send('pointerup',100,100,1620);assert.equal(taps.length,2);
});

const aimRay=(origin,target)=>new THREE.Raycaster(origin,target.clone().sub(origin).normalize(),0,6);
test('touch reaches each household control in the optimized house and can close the open fridge door',()=>{
 const w=createHouseModel(),r=new PetRoaming(w.colliders),controls=w.houseInteractions;w.houseRoot.updateMatrixWorld(true);
 for(const item of controls.items.values()){
  if(item.available)continue;
  const view=[...r.nodes.values()].filter(n=>Math.hypot(n.x-item.pos.x,n.z-item.pos.z)<1.9).find(n=>{
   const origin=new THREE.Vector3(n.x,n.y+1.67,n.z);return controls.selectRay(aimRay(origin,item.pos))?.id===item.id;
  });assert.ok(view,`${item.id} can be tapped`);
  const far=item.pos.clone().add(new THREE.Vector3(10,0,0));assert.notEqual(controls.selectRay(aimRay(far,item.pos))?.id,item.id);
 }
 const fridge=controls.items.get('fridge');w.camera.position.set(0,10,0);fridge.activate();for(let i=0;i<30;i++)controls.update(.1);w.houseRoot.updateMatrixWorld(true);
 const target=fridge.door.localToWorld(new THREE.Vector3(.52,1.5,.04)),normal=new THREE.Vector3(0,0,1).transformDirection(fridge.door.matrixWorld),ray=aimRay(target.clone().addScaledVector(normal,.7),target);
 assert.equal(controls.selectRay(ray)?.id,'fridge');assert.ok(controls.activate('fridge',ray));assert.equal(fridge.open,false);
});

test('screen taps use the finger position, enforce reach and reject targets behind walls',()=>{
 const world={canvas:{getBoundingClientRect:()=>({left:10,top:20,width:400,height:800,right:410,bottom:820})},camera:new THREE.PerspectiveCamera(65,.5,.1,100),houseRoot:new THREE.Group()};
 world.houseInteractions=new HouseInteractions(world);
 const center=new THREE.Vector3(.25,0,-1.5);let activations=0;
 world.houseInteractions.add({id:'tap',pos:center,activate:()=>activations++});
 world.camera.updateMatrixWorld(true);
 const p=center.clone().project(world.camera),x=10+(p.x+1)*200,y=20+(1-p.y)*400;
 const hit=pickTouchInteraction(world,x,y);assert.equal(hit?.id,'tap');assert.ok(world.houseInteractions.activate(hit.id,hit.ray));assert.equal(activations,1);
 assert.equal(pickTouchInteraction(world,9,y),null);assert.equal(pickTouchInteraction(world,210,420),null,'no target at the center dot');
 center.z=-4;assert.equal(pickTouchInteraction(world,x,y),null);center.z=-1.5;
 const wall=new THREE.Mesh(new THREE.BoxGeometry(3,3,.1),new THREE.MeshBasicMaterial());wall.position.z=-.7;world.houseRoot.add(wall);world.houseRoot.updateMatrixWorld(true);
 assert.equal(pickTouchInteraction(world,x,y),null,'opaque wall blocks touch');assert.equal(world.houseInteractions.activate('tap',hit.ray),false);
});

test('tapping a memory circle still requires standing in its activation zone',()=>{
 const [x,z]=planPoint(507,620),y=floorHeight(x,z),marker=new THREE.Group();marker.position.set(x,y,z);marker.userData.memoryId='photo';
 const world={canvas:{getBoundingClientRect:()=>({left:0,top:0,right:400,bottom:800,width:400,height:800})},camera:new THREE.PerspectiveCamera(65,.5,.1,100),houseRoot:new THREE.Group(),memoryMarkers:{children:[marker]}};
 world.houseInteractions=new HouseInteractions(world);
 const pickAtDistance=distance=>{world.camera.position.set(x,y+1.67,z+distance);world.camera.lookAt(marker.position);world.camera.updateMatrixWorld(true);return pickTouchInteraction(world,200,400);};
 assert.equal(pickAtDistance(.7)?.id,'photo');assert.equal(pickAtDistance(2),null);
 marker.visible=false;assert.equal(pickAtDistance(.7),null);
});
