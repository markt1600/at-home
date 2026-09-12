import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHouseModel} from '../scripts/house-model.mjs';
import {HOUSE_STAIRS,planPoint,floorHeight} from '../src/house-layout.js';
import {inWalkableArea,moveAlongFloor} from '../src/navigation.js';
import {shelterLocation} from '../src/shelter.js';
import {migrateHouseDialogue} from '../src/house-dialogue.js';
import {scaleMaterialUVs} from '../src/house-materials.js';
import {PEOPLE,DOCUMENTS,ENDINGS} from '../src/content.js';
import {House} from '../src/scene.js';
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
test('visible shelter positions are clear, distinct and anchored to each room floor',()=>{
 const positions=new Set();for(let i=0;i<12;i++){const p=shelterLocation(i);assert.ok(inWalkableArea(p.x,p.z,true,world.colliders),String(i));assert.equal(p.y,floorHeight(p.x,p.z));positions.add(`${p.x},${p.z}`);}assert.equal(positions.size,12);
});
test('sheltered figures restore after atlas loading and disappear when starting over',()=>{
 const w=Object.create(House.prototype);Object.assign(w,{scene:new THREE.Scene(),standingAtlases:[]});w.setSheltered([PEOPLE[0],PEOPLE[1]]);assert.equal(w.residents.size,0);
 const atlas=new THREE.Texture({width:300,height:300});atlas.userData.frames=Array.from({length:3},(_,i)=>({x0:i*100,x1:i*100+90,y0:0,y1:300}));w.standingAtlases[0]=atlas;
 w.setSheltered(w.shelteredPeople);assert.equal(w.residents.size,2);assert.ok(w.residents.get(PEOPLE[0].id).userData.body);
 w.setSheltered([PEOPLE[1]]);assert.equal(w.residents.size,1);w.setSheltered([]);assert.equal(w.scene.children.length,0);
});
test('current dialogue describes the home, and old saved lines migrate without changing choices',()=>{
 assert.doesNotMatch(JSON.stringify([PEOPLE,DOCUMENTS,ENDINGS]),/school|classroom|exam papers|practical schedule|perfect attendance|bicycles/i);
 const s={lastReply:'I was in my flat marking old exam papers. Then every phone in the building rang.',log:[{text:'Retired mathematics teacher'}],decisions:[{id:'tan',action:'admit'}]};migrateHouseDialogue(s);assert.match(s.lastReply,/checking invoices/);assert.match(s.log[0].text,/Accountant/);assert.equal(s.decisions[0].action,'admit');
});
test('material UV scale follows physical dimensions instead of stretching per mesh',()=>{
 const g=new THREE.BoxGeometry(4,2,.1).toNonIndexed();scaleMaterialUVs(g,1);const uv=g.attributes.uv;assert.equal(Math.max(...Array.from({length:uv.count},(_,i)=>uv.getX(i)))-Math.min(...Array.from({length:uv.count},(_,i)=>uv.getX(i))),4);
});
