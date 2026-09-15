import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHouseModel} from '../scripts/house-model.mjs';
import {HandInteractionBody,handApproachPath} from '../src/hand-interaction-body.js';
import {inWalkableArea} from '../src/navigation.js';
import {floorHeight,HOUSE_VIEWS} from '../src/house-layout.js';

const world=createHouseModel({optimize:false});world.handInteraction=new HandInteractionBody(world);
function front(rig){rig.handAnchor.updateWorldMatrix(true,true);const p=rig.handAnchor.localToWorld(new THREE.Vector3(...rig.handStance));p.y=floorHeight(p.x,p.z);return p;}
function position(rig,offset=.7){world.handInteraction.cancel();rig.reset();const p=rig.handAnchor.localToWorld(new THREE.Vector3(rig.handStance[0]-.2,0,rig.handStance[2]+offset));p.y=floorHeight(p.x,p.z)+1.67;world.camera.position.copy(p);world.yaw=.4;world.pitch=-.3;}
function tick(rig,dt=.025){world.handInteraction.update(dt);rig.update(dt,true);world.handInteraction.updateArms();}
function advance(rig,seconds){for(let i=0;i<Math.ceil(seconds/.025);i++)tick(rig);}

test('both hand stations have reachable standing positions in front of the real furniture',()=>{
 for(const [rig,view] of [[world.hallwayCandle,'hall'],[world.turntable,'turntable']]){const target=front(rig),p=HOUSE_VIEWS[view],path=handApproachPath(new THREE.Vector3(...p.slice(0,3)),target,world.colliders);assert.ok(inWalkableArea(target.x,target.z,true,world.colliders));assert.ok(path?.length);for(const point of path)assert.ok(inWalkableArea(point.x,point.z,true,world.colliders));}
 const target=front(world.hallwayCandle),start=target.clone().add(new THREE.Vector3(0,0,.9));
 const blocking=[...world.colliders,{x:target.x,z:target.z,w:1,d:1}];assert.equal(handApproachPath(start,target,blocking),null,'an occupied working position cannot teleport the player inside furniture');
 assert.equal(handApproachPath(target.clone().add(new THREE.Vector3(10,0,0)),target,world.colliders),null,'distant actions cannot pull the player through the house');
});

test('candle waits for approach, fixes the body while the head looks freely, then releases it',()=>{
 const rig=world.hallwayCandle;position(rig);const initial=world.camera.position.clone();assert.equal(rig.activate(),true);rig.update(.1);assert.equal(rig.time,0);assert.ok(rig.hands.every(h=>!h.visible));
 advance(rig,.3);assert.ok(world.camera.position.distanceTo(initial)>.05);assert.equal(rig.time,0);
 const paused=world.camera.position.clone();tick(rig,0);assert.deepEqual(world.camera.position,paused);assert.equal(rig.time,0);
 advance(rig,3);assert.ok(world.handInteraction.ready(rig));assert.ok(rig.time>0);const standing=world.camera.position.clone();
 world.yaw=1.9;world.pitch=.6;world.keys={KeyW:true};world.touchMove={x:1,z:1};world.jumpQueued=true;advance(rig,.4);
 assert.ok(Math.hypot(world.camera.position.x-standing.x,world.camera.position.z-standing.z)<.004);assert.equal(world.yaw,1.9);assert.equal(world.pitch,.6);assert.equal(world.jumpQueued,false);
 assert.ok(world.handInteraction.arms.visible);assert.ok(world.handInteraction.segments.some(m=>m.visible));
 assert.equal(world.turntable.start(),false,'a second hand action cannot take over the body');
 advance(rig,10);assert.equal(rig.stage,'lit');assert.equal(world.handInteraction.active,false);assert.equal(world.handInteraction.arms.visible,false);assert.equal(world.feet.x,world.camera.position.x);
 rig.activate();advance(rig,10);assert.equal(rig.stage,'covered');assert.equal(world.handInteraction.active,false);
});

test('turntable acquires for play and stop; cancellation releases a stalled preparation',async()=>{
 const rig=world.turntable;world.focus('turntable');rig.reset();assert.equal(rig.start(),true);advance(rig,.1);assert.equal(rig.time,0);assert.ok(rig.hands.every(h=>!h.visible));
 advance(rig,9);assert.equal(rig.stage,'waiting');assert.equal(world.handInteraction.active,true);
 const completion=rig.ready();advance(rig,2.1);assert.equal(await completion,true);assert.equal(rig.stage,'playing');assert.equal(world.handInteraction.active,false);
 rig.stop();advance(rig,2);assert.equal(rig.stage,'idle');assert.equal(world.handInteraction.active,false);assert.equal(rig.recordPresent,true);
 rig.start();const cancelled=rig.ready();world.handInteraction.cancel();assert.equal(await cancelled,false);assert.equal(world.handInteraction.active,false);assert.equal(rig.stage,'idle');assert.ok(rig.hands.every(h=>!h.visible));
 world.hallwayCandle.reset();
});

test('room shortcuts cancel a hand action rather than leaving a hidden movement lock',()=>{
 const rig=world.hallwayCandle;position(rig);rig.activate();advance(rig,2);world.focus('living');assert.equal(world.handInteraction.active,false);assert.equal(rig.stage,'covered');const expected=HOUSE_VIEWS.living;assert.deepEqual(world.camera.position.toArray(),expected.slice(0,3));
});
