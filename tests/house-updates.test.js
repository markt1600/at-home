import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHouseModel} from '../scripts/house-model.mjs';
import {HOUSE_STAIRS,planPoint,floorHeight} from '../src/house-layout.js';
import {inWalkableArea,moveAlongFloor} from '../src/navigation.js';
import {scaleMaterialUVs} from '../src/house-materials.js';
const world=createHouseModel();world.houseRoot.updateMatrixWorld(true);

test('all stair runs can be walked up and down without jumping',()=>{
 for(const s of HOUSE_STAIRS){
  const a=s.axis==='x'?0:1,v=s.polygon.map(p=>p[a]),lo=Math.min(...v)-.06,hi=Math.max(...v)+.06,other=s.polygon.reduce((sum,p)=>sum+p[1-a],0)/4;
  for(const reverse of [false,true]){
   const begin=reverse?hi:lo,end=reverse?lo:hi,p=a===0?[begin,other]:[other,begin],q=a===0?[end,other]:[other,end];
   const result=moveAlongFloor(...p,q[0]-p[0],q[1]-p[1],world.colliders);
   assert.ok(Math.hypot(result.x-q[0],result.z-q[1])<.01,`${s.id} ${reverse?'reverse':'forward'}`);
  }
 }
});
test('movement slides along obstacles but cannot cross walls or high ledges',()=>{
 const [x,z]=planPoint(707,691),obstacle={x:x+.3,z,w:.08,d:2};
 const r=moveAlongFloor(x,z,1,.4,[obstacle]);assert.ok(r.x<x+.11);assert.ok(r.z>z+.35);
 const [a,b]=planPoint(440,535),riser=moveAlongFloor(a,b,0,-.4,[]);assert.ok(riser.z>=planPoint(440,532)[1]);
});
test('floor extrusion leaves no vertical sheets across stair mouths',()=>{
 const ray=new THREE.Raycaster();
 for(const s of HOUSE_STAIRS){
  const a=s.axis==='x'?0:1,v=s.polygon.map(p=>p[a]),lo=Math.min(...v),hi=Math.max(...v),other=s.polygon.reduce((sum,p)=>sum+p[1-a],0)/4;
  const low=s.reverse?hi:lo,sign=s.reverse?-1:1,p=a===0?[low-sign*.05,other]:[other,low-sign*.05];
  ray.set(new THREE.Vector3(p[0],s.high+.015,p[1]),new THREE.Vector3(a===0?sign:0,0,a===1?sign:0));ray.far=.12;
  assert.equal(ray.intersectObject(world.houseRoot,true).filter(h=>h.object.isMesh&&!h.object.material.transparent).length,0,s.id);
 }
});
test('material UV scale follows physical dimensions instead of stretching per mesh',()=>{
 const g=new THREE.BoxGeometry(4,2,.1).toNonIndexed();scaleMaterialUVs(g,1);const uv=g.attributes.uv;assert.equal(Math.max(...Array.from({length:uv.count},(_,i)=>uv.getX(i)))-Math.min(...Array.from({length:uv.count},(_,i)=>uv.getX(i))),4);
});
