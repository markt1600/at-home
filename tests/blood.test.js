import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BloodEffects} from '../src/blood.js';
test('blood lands on the raised lobby floor and cleanup removes stains and droplets',()=>{
 const scene=new THREE.Scene(),effects=new BloodEffects(scene,()=>.45),npc=new THREE.Group(),surfaces=new THREE.Group();npc.position.set(0,.45,0);scene.add(npc);effects.random=()=>.5;
 effects.impact(new THREE.Vector3(0,1.5,0),new THREE.Vector3(0,0,1),npc,surfaces);
 assert.equal(effects.drops.length,100);assert.ok(effects.stains.some(s=>s.parent===npc));
 for(let i=0;i<70;i++)effects.update(.05);
 assert.equal(effects.drops.length,0);for(const s of effects.stains.filter(s=>s.parent===effects.root))assert.ok(Math.abs(s.position.y-.456)<1e-7);
 effects.update(.01,false);assert.equal(effects.root.visible,false);assert.ok(effects.stains.every(s=>!s.visible));
 effects.reset();assert.equal(effects.root.children.length,0);assert.equal(npc.children.length,0);
});
