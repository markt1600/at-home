import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Turntable} from '../src/turntable.js';

function model(){const world={mat:(color,roughness=.5,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness})};const m=Object.fromEntries(['steel','black','walnut','cream'].map(k=>[k,world.mat(0xaaaaaa)]));return new Turntable(world,new THREE.Group(),m);}
const advance=(rig,seconds,playing=false)=>{for(let t=0;t<seconds;t+=.025)rig.update(.025,playing);};

test('hands open the cover, place the disc, spin up and wait for music before lowering the needle',async()=>{
 const rig=model();assert.equal(rig.record.visible,false);rig.start();advance(rig,.8);assert.ok(rig.hands[1].visible);assert.ok(rig.lid.rotation.x<0);
 advance(rig,1.5);assert.equal(rig.stage,'placing');assert.ok(rig.record.visible);assert.ok(rig.hands.every(h=>h.visible));
 advance(rig,4);assert.equal(rig.stage,'waiting');assert.equal(rig.recordPresent,true);assert.ok(rig.arm.rotation.x<-.09);assert.ok(rig.speed>.9);
 let ready=false;const pending=rig.ready().then(v=>ready=v);advance(rig,1);await Promise.resolve();assert.equal(ready,false);assert.ok(rig.hands[1].visible);
 advance(rig,1.2);await pending;assert.equal(ready,true);assert.equal(rig.stage,'playing');assert.equal(rig.arm.rotation.x,0);assert.ok(rig.arm.rotation.y<-.7);
 advance(rig,.1,true);assert.ok(rig.hands.every(h=>!h.visible));
 rig.stop();advance(rig,.6);assert.ok(rig.arm.rotation.x<-.09);advance(rig,1.1);assert.equal(rig.stage,'idle');assert.equal(rig.speed,0);assert.equal(rig.recordPresent,true);
 const angle=rig.record.rotation.y;advance(rig,1);assert.equal(rig.record.rotation.y,angle);
 rig.start();assert.equal(rig.stage,'starting');const again=rig.ready();advance(rig,3.2);assert.equal(await again,true);assert.equal(rig.stage,'playing');
 rig.reset();assert.equal(rig.recordPresent,false);assert.equal(rig.lid.rotation.x,0);
});

test('stopping during preparation resolves the abandoned attempt and never seats an unfinished record',async()=>{
 const rig=model();rig.start();const ready=rig.ready();advance(rig,2);rig.stop();assert.equal(await ready,false);advance(rig,2);assert.equal(rig.stage,'idle');assert.equal(rig.record.visible,false);assert.equal(rig.recordPresent,false);
 rig.start();const retry=rig.ready();advance(rig,8);assert.equal(await retry,true);assert.equal(rig.recordPresent,true);
});
