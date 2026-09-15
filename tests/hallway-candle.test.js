import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {HallwayCandle,CANDLE_WICKS} from '../src/hallway-candle.js';

function model(){const world={camera:new THREE.PerspectiveCamera(),mat:(color,roughness=.5,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness}),houseInteractions:{add:item=>item}};world.camera.position.set(0,1.67,1.5);const candle=new THREE.Group(),cover=new THREE.Group();candle.add(cover);return new HallwayCandle(world,candle,cover,{black:world.mat(0x111111),steel:world.mat(0xaaaaaa)});}
const advance=(rig,time)=>{for(let i=0;i<Math.round(time/.025);i++)rig.update(.025);};

test('hands remove the cover before lighting all five wicks and keep it beside the lamp',()=>{
 const rig=model();assert.equal(CANDLE_WICKS.length,5);assert.equal(rig.label,'Light hallway candle');assert.equal(rig.activate(),true);
 advance(rig,1);assert.ok(rig.hands.every(h=>h.visible));assert.ok(rig.cover.position.y>.1);assert.equal(rig.litCount,0);
 const paused=rig.cover.position.clone(),time=rig.time;rig.update(0);assert.deepEqual(rig.cover.position,paused);assert.equal(rig.time,time);assert.equal(rig.activate(),false);
 advance(rig,3.2);assert.equal(rig.stage,'lighting');assert.deepEqual(rig.cover.position,rig.park);assert.equal(rig.litCount,0);
 const counts=new Set();for(let i=0;i<240;i++){rig.update(.025);counts.add(rig.litCount);}assert.deepEqual([...counts],[0,1,2,3,4,5]);assert.equal(rig.stage,'lit');assert.equal(rig.flames.filter(f=>f.visible).length,5);assert.ok(rig.hands.every(h=>!h.visible));assert.equal(rig.smoke.visible,false);assert.equal(rig.label,'Blow out candle');
 const sway=rig.flames[0].scale.y;advance(rig,.1);assert.notEqual(rig.flames[0].scale.y,sway);
});

test('blowing creates smoke at the extinguished wicks before replacing the cover; repeated cycles and reset work',()=>{
 const rig=model();rig.activate();advance(rig,10);assert.equal(rig.stage,'lit');rig.activate();advance(rig,.4);assert.equal(rig.flames[0].visible,false);assert.equal(rig.flames[4].visible,true);assert.equal(rig.smoke.visible,true);assert.deepEqual(rig.cover.position,rig.park);
 advance(rig,.4);assert.equal(rig.litCount,0);assert.ok(rig.flames.every(f=>!f.visible));assert.equal(rig.activate(),false);const time=rig.time;rig.update(0);assert.equal(rig.time,time);
 advance(rig,3.1);assert.equal(rig.stage,'covering');assert.equal(rig.smoke.visible,false);assert.equal(rig.litCount,0);
 advance(rig,4.2);assert.equal(rig.stage,'covered');assert.deepEqual(rig.cover.position.toArray(),[0,0,0]);assert.ok(rig.hands.every(h=>!h.visible));assert.equal(rig.glow.material.uniforms.strength.value,0);
 rig.activate();advance(rig,10);assert.equal(rig.litCount,5);rig.reset();assert.equal(rig.stage,'covered');assert.deepEqual(rig.cover.position.toArray(),[0,0,0]);assert.equal(rig.litCount,0);assert.ok(rig.flames.every(f=>!f.visible));
});
