import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHouseModel} from '../scripts/house-model.mjs';
import {HOUSE_ROOMS,planPoint,pointInPolygon} from '../src/house-layout.js';
import {inWalkableArea} from '../src/navigation.js';
const world=createHouseModel();world.houseRoot.updateMatrixWorld(true);

test('the complete exterior and every partition lintel contain rendered surfaces',()=>{
 const ray=new THREE.Raycaster();
 for(const wall of world.architectureWalls){
  const [x,z]=planPoint(...wall.a),[xx,zz]=planPoint(...wall.b),len=Math.hypot(xx-x,zz-z),normal=new THREE.Vector3(-(zz-z)/len,0,(xx-x)/len);
  for(const t of [.15,.5,.85])for(const y of wall.exterior?[.15,1.9,3.85]:[3.85]){
   const at=new THREE.Vector3(x+(xx-x)*t,y,z+(zz-z)*t);ray.set(at.addScaledVector(normal,.3),normal.clone().negate());ray.near=0;ray.far=.6;
   assert.ok(ray.intersectObject(world.houseRoot,true).length,`${wall.id}: missing wall at ${t}, height ${y}`);
  }
 }
});
test('lift and service voids cannot be entered through the revised floor footprint',()=>{
 for(const p of [[985,875],[670,950],[815,937],[968,600]])assert.equal(inWalkableArea(...planPoint(...p),true,world.colliders),false,p.join(','));
 const yard=HOUSE_ROOMS.find(r=>r.id==='utility');assert.ok(pointInPolygon(...planPoint(740,910),yard.polygon));assert.equal(pointInPolygon(...planPoint(815,937),yard.polygon),false);
});
test('master bedroom wardrobe is entered from the vanity, not through the bed-side wall',()=>{
 assert.equal(inWalkableArea(...planPoint(783,315),true,world.colliders),false);
 assert.ok(inWalkableArea(...planPoint(783,250),true,world.colliders));
 assert.ok(inWalkableArea(...planPoint(850,273),true,world.colliders));
});
test('every intended door aperture has a complete header in the rendered mesh',()=>{
 const ray=new THREE.Raycaster();
 for(const wall of world.architectureWalls)for(const aperture of wall.apertures){
  if(aperture.kind==='window')continue;
  const [x,z]=planPoint(...aperture.center),dx=wall.b[0]-wall.a[0],dz=wall.b[1]-wall.a[1],len=Math.hypot(dx,dz),normal=new THREE.Vector3(-dz/len,0,dx/len);
  ray.set(new THREE.Vector3(x,aperture.base+aperture.height+.1,z).addScaledVector(normal,.3),normal.clone().negate());ray.near=0;ray.far=.6;
  assert.ok(ray.intersectObject(world.houseRoot,true).length,aperture.id);
 }
});
