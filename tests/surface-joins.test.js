import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {resolveSurfaceJoins} from '../src/surface-joins.js';
import {createHouseModel} from '../scripts/house-model.mjs';

function record(x,z=0,yaw=0){
 const geometry=new THREE.BoxGeometry(2,2,.2).toNonIndexed();geometry.translate(x,0,z);geometry.rotateY(yaw);
 return{geometry,material:new THREE.MeshStandardMaterial(),box:true};
}
test('partial coplanar overlaps are removed while every point of the original surface remains covered',()=>{
 for(const yaw of [0,.61,Math.PI/2]){
  const records=[record(0,0,yaw),record(1,0,yaw)],result=resolveSurfaceJoins(records);assert.ok(result.trimmedFaces>=2);
  const group=new THREE.Group();records.forEach(r=>group.add(new THREE.Mesh(r.geometry,r.material)));group.updateMatrixWorld(true);
  for(let x=-.94;x<1.95;x+=.113)for(const y of [-.79,-.31,.27,.68]){
   const origin=new THREE.Vector3(x,y,1).applyAxisAngle(new THREE.Vector3(0,1,0),yaw),direction=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
   const hits=new THREE.Raycaster(origin,direction,0,1).intersectObject(group,true);
   assert.equal(hits.length,1,`single covering surface at ${yaw}/${x}/${y}`);assert.ok(Math.abs(hits[0].distance-.9)<1e-6);
  }
  for(const r of records){assert.ok([...r.geometry.attributes.uv.array].every(Number.isFinite));assert.ok([...r.geometry.attributes.normal.array].every(Number.isFinite));}
 }
});
test('nearby separate surfaces and glass are not collapsed into a single plane',()=>{
 const a=record(0),b=record(1,.003),glass=record(0);glass.material.transparent=true;
 b.geometry.translate(0,.003,0);
 const before=b.geometry.attributes.position.count;const result=resolveSurfaceJoins([a,b,glass]);
 assert.equal(result.trimmedFaces,0);assert.equal(b.geometry.attributes.position.count,before);assert.equal(glass.geometry.attributes.position.count,36);
});

test('clipping preserves interpolated vertex colors for batched kitchen packaging',()=>{
 const records=[record(0),record(1)];for(const r of records){const p=r.geometry.attributes.position,colors=[];for(let i=0;i<p.count;i++)colors.push((p.getX(i)+1)/3,.25,.75);r.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));}
 assert.ok(resolveSurfaceJoins(records).trimmedFaces>0);
 for(const r of records){const p=r.geometry.attributes.position,c=r.geometry.attributes.color;assert.equal(c.count,p.count);for(let i=0;i<p.count;i++)assert.ok(Math.abs(c.getX(i)-(p.getX(i)+1)/3)<1e-6);}
});
test('house cleanup removes duplicate patches and retains the independent moving door',()=>{
 const world=createHouseModel();assert.ok(world.optimization.trimmedFaces>100);assert.ok(world.optimization.removedArea>10);
 assert.ok(world.door.parent);assert.ok(world.door.children.length>5);assert.ok(world.houseRoot.children.some(o=>o.name==='Static house material'));
 for(const mesh of world.houseRoot.children.filter(o=>o.isMesh))assert.ok([...mesh.geometry.attributes.position.array].every(Number.isFinite));
});
