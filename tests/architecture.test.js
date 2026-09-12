import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHouseModel} from '../scripts/house-model.mjs';
import {HOUSE_ROOMS,planPoint,pointInPolygon,floorHeight,MASTER_VANITY} from '../src/house-layout.js';
import {inWalkableArea} from '../src/navigation.js';
const world=createHouseModel();world.houseRoot.updateMatrixWorld(true);

test('the complete exterior and every partition lintel contain rendered surfaces',()=>{
 const ray=new THREE.Raycaster();
 for(const wall of world.architectureWalls){
  const [x,z]=planPoint(...wall.a),[xx,zz]=planPoint(...wall.b),len=Math.hypot(xx-x,zz-z),normal=new THREE.Vector3(-(zz-z)/len,0,(xx-x)/len);
  for(const t of [.15,.5,.85])for(const y of wall.balcony?[wall.floor+.5]:wall.exterior?[.15,1.9,3.85]:[3.85]){
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

test('both balconies have walkable door openings, fixed side leaves and solid parapets',()=>{
 for(const [center,fixed,outside] of [[[317,623],[317,560],[219,622]],[[317,811],[317,755],[245,809]]]){
  assert.ok(inWalkableArea(...planPoint(...center),true,world.colliders),'central slider opening');
  assert.equal(inWalkableArea(...planPoint(...fixed),true,world.colliders),false,'fixed glass leaf');
  assert.equal(inWalkableArea(...planPoint(...outside),true,world.colliders),false,'outside balcony parapet');
 }
 const ray=new THREE.Raycaster();
 for(const [px,pz,y] of [[222,622,1.7],[248,809,2.15]]){
  const [x,z]=planPoint(px,pz);ray.set(new THREE.Vector3(x+.3,y,z),new THREE.Vector3(-1,0,0));ray.far=.6;
  assert.equal(ray.intersectObject(world.houseRoot,true).filter(h=>h.object.isMesh).length,0,'open air above the balcony guard');
 }
});

test('the shoe cabinet partition blocks views and movement at both eye and ceiling height',()=>{
 const ray=new THREE.Raycaster(),normal=new THREE.Vector3(1,0,1).normalize();
 for(const p of [[934,741],[951,724],[975,700]]){
  const [x,z]=planPoint(...p);assert.equal(inWalkableArea(x,z,true,world.colliders),false);
  for(const y of [1.8,2.85]){
   ray.set(new THREE.Vector3(x,y,z).addScaledVector(normal,.3),normal.clone().negate());ray.far=.6;
   assert.ok(ray.intersectObject(world.houseRoot,true).some(h=>h.object.isMesh&&!h.object.material.transparent),'opaque shoe backing');
  }
 }
});

test('wall-fitted hallway storage leaves a continuous route beside the cellar',()=>{
 for(let px=630;px<=827;px+=5)assert.ok(inWalkableArea(...planPoint(px,459),true,world.colliders),`hall route at ${px}`);
 for(const p of [[523,461],[560,430],[700,430],[815,430]])assert.equal(inWalkableArea(...planPoint(...p),true,world.colliders),false,'cabinet or return wall');
});

test('the orange sofa back meets the wine-cellar walkway across its length',()=>{
 const ray=new THREE.Raycaster(),[walkwayEdge]=planPoint(611,0);
 for(const pz of [548,570,591,615,632]){
  const [x,z]=planPoint(625,pz);ray.set(new THREE.Vector3(x,1.05,z),new THREE.Vector3(-1,0,0));ray.far=2;
  const back=ray.intersectObject(world.houseRoot,true).find(h=>h.object.material===world.houseMaterials.orange);
  assert.ok(back,'sofa back at walkway height');
  assert.ok(Math.abs(back.point.x-walkwayEdge)<.065,`gap behind sofa at ${pz}`);
 }
 for(const pz of [548,570,591,609]){
  const [x,z]=planPoint(630,pz);assert.equal(floorHeight(x,z),.75);assert.ok(inWalkableArea(x,z,true,world.colliders),'walkway remains clear');
 }
});

test('the fridge sits flush beside the only kitchen-to-service doorway',()=>{
 const [x,z]=planPoint(662,812.5),[wallX]=planPoint(650,812.5),ray=new THREE.Raycaster(new THREE.Vector3(x,1.6,z),new THREE.Vector3(-1,0,0),0,2);
 const fridge=ray.intersectObject(world.houseRoot,true).find(h=>h.object.material===world.houseMaterials.steel);
 assert.ok(fridge,'fridge on the solid wall section');
 assert.ok(Math.abs(fridge.point.x-(wallX-.08))<.02,'no gap behind the refrigerator');
 assert.equal(inWalkableArea(...planPoint(650,812.5),true,world.colliders),false,'wall behind fridge');
 assert.ok(inWalkableArea(...planPoint(650,850),true,world.colliders),'service doorway beside fridge');
 const wall=world.architectureWalls.find(w=>w.id==='kitchen-east');assert.deepEqual(wall.apertures.map(a=>a.id),['yard-access']);
 for(const y of [.9,1.8,2.5]){
  const [px,pz]=planPoint(650,786);ray.set(new THREE.Vector3(px+.25,y,pz),new THREE.Vector3(-1,0,0));ray.far=.35;
  assert.ok(ray.intersectObject(world.houseRoot,true).some(h=>h.object.material===world.houseMaterials.plaster),'former kitchen doorway is solid wall');
 }
 assert.equal(inWalkableArea(...planPoint(650,786),true,world.colliders),false,'no extra doorway on the kitchen wall');
 assert.ok(inWalkableArea(...planPoint(670.5,808),true,world.colliders),'bathroom opens from the service passage');
});

test('the entrance switch is supported by its wall across the whole back plate',()=>{
 const source=createHouseModel({optimize:false});source.houseRoot.updateMatrixWorld(true);
 const plate=source.houseRoot.getObjectByName('Entrance wall switch'),normal=new THREE.Vector3(0,0,1).transformDirection(plate.matrixWorld);
 for(const x of [-.04,.04])for(const y of [-.04,.04]){
  const back=plate.localToWorld(new THREE.Vector3(x,y,-.007));
  const ray=new THREE.Raycaster(back.clone().addScaledVector(normal,.002),normal.clone().negate(),0,.004);
  assert.ok(ray.intersectObject(source.houseRoot,true).some(h=>h.object.name==='shoe-cabinet-return'),'plaster directly supports each corner');
 }
});

test('the long vanity basin is a recessed brown trough without a countertop through it',()=>{
 const [x,z]=planPoint(...MASTER_VANITY.center);
 for(const dx of [-.60,0,.60]){
  const ray=new THREE.Raycaster(new THREE.Vector3(x+dx,1.9,z+.12),new THREE.Vector3(0,-1,0),0,.5);
  const hit=ray.intersectObject(world.houseRoot,true)[0];
  assert.equal(hit.object.material,world.houseMaterials.basinBrown);
  assert.ok(Math.abs(hit.point.y-1.523)<.002,'130 mm of open basin depth');
 }
});

test('the entrance painting has a solid wine-cellar wall behind and around it',()=>{
 const ray=new THREE.Raycaster();
 for(const px of [787,811,838])for(const y of [.95,1.8,2.8]){
  const [x,z]=planPoint(px,632);ray.set(new THREE.Vector3(x,y,z-.2),new THREE.Vector3(0,0,1));ray.far=.25;
  assert.ok(ray.intersectObject(world.houseRoot,true).some(h=>h.object.material===world.houseMaterials.plaster),'solid wall, not glazing or the picture itself');
 }
});
