import test from 'node:test';
import assert from 'node:assert/strict';
import {createHouseModel} from '../scripts/house-model.mjs';
import {PetRoaming} from '../src/pet-roaming.js';
import {PETS} from '../src/life.js';
import {floorHeight,HOUSE_VIEWS} from '../src/house-layout.js';
import {inWalkableArea} from '../src/navigation.js';
test('roaming pets traverse clear routes, rest, respect stairs, and can be found for care',()=>{
 const world=createHouseModel(),r=new PetRoaming(world.colliders,(()=>{let n=42;return()=>((n=(n*1664525+1013904223)>>>0)/2**32);})());
 const starts=new Map(),travel=new Map();for(const spec of PETS.filter(p=>!p.stationary)){const p=r.register(spec.id,spec.plan);starts.set(spec.id,{x:p.x,z:p.z});travel.set(spec.id,0);}
 for(let i=0;i<3000;i++){const previous=[...r.pets.values()].map(p=>({...p}));r.update(.1);for(const [j,p] of [...r.pets.values()].entries()){
  assert.ok(inWalkableArea(p.x,p.z,true,world.colliders),p.id+' crossed furniture');assert.equal(p.y,floorHeight(p.x,p.z));const step=Math.hypot(p.x-previous[j].x,p.z-previous[j].z);assert.ok(step<=p.speed*.1+.0001);travel.set(p.id,travel.get(p.id)+step);
 }}
 for(const p of r.pets.values()){assert.ok(travel.get(p.id)>2,p.id+' did not roam');const view=r.viewpoint(p.id);assert.ok(inWalkableArea(view.x,view.z,true,world.colliders));assert.ok(Math.hypot(view.x-p.x,view.z-p.z)<1.7);}
 const before=JSON.stringify([...r.pets.values()]);r.update(.1,{enabled:false});assert.equal(JSON.stringify([...r.pets.values()]),before);
 assert.ok(r.pets.get('pebble').speed<r.pets.get('sunny').speed/4);
});
test('Leo and Cyrus greet a new player via accessible paths, while the tortoise keeps its own routine',()=>{
 const world=createHouseModel(),r=new PetRoaming(world.colliders,()=>.5);for(const p of PETS.filter(p=>!p.stationary))r.register(p.id,p.plan);
 const [x,y,z,yaw]=HOUSE_VIEWS.living,player={x,y,z},tortoise=r.pets.get('pebble');r.greet(player,yaw);assert.ok(!tortoise.greeting);
 for(const id of ['sunny','miso'])assert.ok(r.pets.get(id).greeting,id+' has a greeting route');
 const arrived=new Set();for(let i=0;i<650;i++){r.update(.1,{player});for(const id of ['sunny','miso']){const p=r.pets.get(id);assert.ok(inWalkableArea(p.x,p.z,true,world.colliders));if(Math.hypot(p.x-x,p.z-z)<1.8)arrived.add(id);}}
 assert.deepEqual([...arrived].sort(),['miso','sunny']);
 for(const id of ['sunny','miso']){r.interact(id);const p=r.pets.get(id);assert.equal(p.greeting,null);assert.equal(p.activity,'idle');assert.equal(p.wait,15);}
 const before=r.pets.get('pebble').distance;for(let i=0;i<20;i++)r.update(.1,{canWalk:()=>false});assert.equal(r.pets.get('pebble').distance,before,'a pet waits for its walking film');
});
