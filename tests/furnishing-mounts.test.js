import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHouseModel} from '../scripts/house-model.mjs';
import {updateOliveBreeze} from '../src/olive-tree.js';

test('entry artworks have wall support behind every frame corner without sinking into plaster',()=>{
 const world=createHouseModel({optimize:false});world.houseRoot.updateMatrixWorld(true);
 const walls=[];world.houseRoot.traverse(o=>{if(o.isMesh&&o.userData.architecture)walls.push(o);});
 for(const [name,w,h] of [['artBay',.58,.44],['artTickets',.76,.83],['artCats',.40,.44]]){
  const art=world.houseRoot.getObjectByName(name),normal=new THREE.Vector3(0,0,1).transformDirection(art.matrixWorld);
  for(const x of [-w/2,0,w/2])for(const y of [-h/2,0,h/2]){
   const back=art.localToWorld(new THREE.Vector3(x,y,-.0175));
   const hit=new THREE.Raycaster(back,normal.clone().negate(),0,.025).intersectObjects(walls,false)[0];
   assert.ok(hit&&hit.distance>.001,`${name} corner ${x},${y} must stand just in front of a solid wall`);
  }
 }
});

test('the rendered olive canopy survives batching and sways while the trunk stays anchored',()=>{
 const world=createHouseModel(),tree=world.houseRoot.getObjectByName('Y-shaped balcony olive tree'),anchor=tree.matrix.clone();
 assert.equal(world.oliveBranches.length,24);
 assert.ok(world.oliveBranches.every(g=>g.children.some(o=>o.isInstancedMesh&&o.count===32)));
 updateOliveBreeze(world,3,true);const a=world.oliveBranches.map(g=>g.quaternion.clone());
 updateOliveBreeze(world,8,true);assert.ok(world.oliveBranches.some((g,i)=>g.quaternion.angleTo(a[i])>.005));
 assert.ok(tree.matrix.equals(anchor));
 updateOliveBreeze(world,9,false);assert.ok(world.oliveBranches.every(g=>g.rotation.x===0&&g.rotation.z===0));
});
