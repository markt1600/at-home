import test from 'node:test';
import assert from 'node:assert/strict';
import {createHouseModel} from '../scripts/house-model.mjs';
import {HOUSE_VIEWS,floorHeight} from '../src/house-layout.js';
import {inWalkableArea} from '../src/navigation.js';
import {MirrorHaunting} from '../src/mirror.js';
const world=createHouseModel();
test('every quick-view position is inside the house and clear of solid furniture',()=>{
 for(const [id,p] of Object.entries(HOUSE_VIEWS))assert.ok(inWalkableArea(p[0],p[2],true,world.colliders),id);
});
test('all named locations are reachable from the hall through actual doorways',()=>{
 const step=.15,key=(x,z)=>`${x},${z}`,start=[0,Math.round(3.4/step)],queue=[start],seen=new Set([key(...start)]);
 for(let n=0;n<queue.length;n++){const [x,z]=queue[n];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(seen.has(k)||!inWalkableArea(nx*step,nz*step,true,world.colliders))continue;seen.add(k);queue.push([nx,nz]);}}
 for(const [id,p] of Object.entries(HOUSE_VIEWS))assert.ok(seen.has(key(Math.round(p[0]/step),Math.round(p[2]/step))),`${id} cannot be reached`);
});
test('outer boundaries, solid wall sections and large furniture stop movement',()=>{
 for(const p of [[0,-1],[-15,12],[0,23],[1.5,5],[-1.5,5],[-8.95,12.8],[9,13.7]])assert.equal(inWalkableArea(...p,true,world.colliders),false,p.join(','));
 assert.ok(inWalkableArea(9.2,9.4,false,world.colliders));
});
test('visible stairs provide a smooth change of level',()=>{
 assert.equal(floorHeight(5.65,13),0);assert.equal(floorHeight(6.65,13),.36);assert.ok(Math.abs(floorHeight(6.15,13)-.18)<.001);
 assert.equal(floorHeight(0,17.1),0);assert.ok(Math.abs(floorHeight(0,17.9)-.36)<.001);
});
test('static mesh batching retains the separate moving front door',()=>{assert.ok(world.optimization.originalMeshes>1000);assert.ok(world.optimization.materialGroups<160);assert.ok(world.door.children.length>=2);});
test('mirror appearances require proximity, pause safely and have a cooldown and cap',()=>{
 const h=new MirrorHaunting(()=>0);assert.equal(h.tick(100,{active:false,near:true}),null);
 h.tick(12,{active:true,near:false});assert.deepEqual(h.tick(.1,{active:true,near:true}),{type:'show',portrait:0});
 assert.equal(h.tick(10,{active:false,near:true}),null);assert.deepEqual(h.tick(2.3,{active:true,near:true}),{type:'hide'});
 h.tick(1,{active:true,near:false});assert.equal(h.tick(1,{active:true,near:true}),null);
 for(let i=0;i<3;i++){h.tick(110,{active:true,near:false});assert.equal(h.tick(.1,{active:true,near:true}).type,'show');h.tick(3,{active:true,near:true});}
 h.tick(110,{active:true,near:false});assert.equal(h.tick(.1,{active:true,near:true}),null);
});
