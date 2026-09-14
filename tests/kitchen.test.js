import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHouseModel} from '../scripts/house-model.mjs';

test('the four stove burners toggle together and their flames animate only when running',()=>{
 const world=createHouseModel(),stove=world.kitchenStove;
 assert.equal(stove.burners.length,4);assert.ok(!stove.running&&!stove.flames.visible);
 stove.activate();assert.ok(stove.running&&stove.flames.visible);assert.match(stove.label(),/off/);
 const mesh=stove.flames.children[0],before=Array.from(mesh.instanceMatrix.array);
 stove.update(.25);assert.notDeepEqual(Array.from(mesh.instanceMatrix.array),before);
 const after=Array.from(mesh.instanceMatrix.array);stove.update(0);assert.deepEqual(Array.from(mesh.instanceMatrix.array),after);
 stove.activate();stove.update(.25);assert.ok(!stove.flames.visible);assert.deepEqual(Array.from(mesh.instanceMatrix.array),after);assert.ok(stove.knobs.every(k=>k.rotation.z===0));
 const camera=world.camera;camera.position.copy(stove.pos).add(new THREE.Vector3(.1,.7,1));camera.lookAt(stove.pos);world.houseRoot.updateMatrixWorld(true);
 assert.equal(world.houseInteractions.select(),'kitchen-stove');
 const ray=new THREE.Raycaster(camera.position,stove.pos.clone().sub(camera.position).normalize(),0,6);
 assert.equal(world.houseInteractions.selectRay(ray)?.id,'kitchen-stove','touch and keyboard share the stove control');
});

test('photo-matched appliances and stored food sit on the three kitchen work areas',()=>{
 const w=createHouseModel({optimize:false}),d=w.kitchenDetails;
 for(const name of ['Black microwave','Silver toaster oven','Coffee grinder with hopper','Balmuda coffee machine','Black water filter'])assert.ok(d.appliances.getObjectByName(name));
 assert.equal(d.pantry.children.filter(g=>g.name.startsWith('Pantry food ')).length,18);
 assert.equal(d.knives.children.filter(g=>g.name.startsWith('Rack knife ')).length,8);
 d.appliances.updateWorldMatrix(true,true);
 for(const name of ['Black microwave','Silver toaster oven','Coffee grinder with hopper','Balmuda coffee machine','Black water filter']){
  const bounds=new THREE.Box3().setFromObject(d.appliances.getObjectByName(name));assert.ok(bounds.min.y>=1.345,name+' rests on the counter');
 }
});
