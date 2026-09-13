import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHouseModel} from '../scripts/house-model.mjs';
import {HOUSE_STAIRS} from '../src/house-layout.js';
import {petPose} from '../src/pet-locomotion.js';

test('all three pets stay above the rendered treads while climbing and descending',()=>{
 const w=createHouseModel();w.houseRoot.updateMatrixWorld(true);let raised=0;
 for(const stair of HOUSE_STAIRS)for(const id of ['miso','sunny','pebble'])for(const reverse of [false,true]){
  const xs=stair.polygon.map(p=>p[0]),zs=stair.polygon.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs);
  const p={id,moving:true,vx:stair.axis==='x'?(reverse?-.3:.3):0,vz:stair.axis==='z'?(reverse?-.3:.3):0};
  for(let i=0;i<60;i++){
   const t=reverse?1-(i+.5)/60:(i+.5)/60;p.x=stair.axis==='x'?x0+(x1-x0)*t:(x0+x1)/2;p.z=stair.axis==='z'?z0+(z1-z0)*t:(z0+z1)/2;
   const pose=petPose(p,.05),ray=new THREE.Raycaster(new THREE.Vector3(p.x,stair.high+.1,p.z),new THREE.Vector3(0,-1,0),0,2),hit=ray.intersectObject(w.houseRoot,true)[0];
   assert.ok(hit,'stair has a physical tread');assert.ok(pose.y>=hit.point.y+.01,id+' went into a tread');if(pose.y>hit.point.y+.03)raised++;
  }
 }
 assert.ok(raised>30,'climbing includes lifted transitions, not just a floor snap');
});
