import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createStandingVisitor} from '../src/visitors.js';
import {corpseGeometry,corpseTexture,collapseVisitor,updateVisitorFall,bodyWoundAnchor} from '../src/corpse.js';

function atlas(){
 const w=90,h=180,pixels=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  // Torso with two separate legs; transparent magenta must never enter the wrap.
  const inside=y>5&&y<174&&x>=15&&x<75&&!(y>95&&x>=39&&x<51);
  pixels.set(inside?[48,83,112,255]:[255,0,255,0],(y*w+x)*4);
 }
 const map=new THREE.Texture({width:w,height:h});map.userData.frames=[{x0:0,x1:w,y0:0,y1:h}];map.userData.pixels=pixels;return map;
}
test('corpse has rounded thickness, a closed surface and an open gap between legs',()=>{
 const geometry=corpseGeometry(atlas(),0,1.8,{rows:90}),p=geometry.attributes.position;
 assert.ok(geometry.boundingBox.max.z>.22);assert.ok(geometry.boundingBox.max.z<.28);assert.equal(geometry.boundingBox.min.z,0);
 const edges=new Map(),index=geometry.index.array;
 for(let i=0;i<index.length;i+=3)for(const [a,b] of [[index[i],index[i+1]],[index[i+1],index[i+2]],[index[i+2],index[i]]]){
  const key=a<b?`${a},${b}`:`${b},${a}`;edges.set(key,(edges.get(key)||0)+1);
 }
 assert.ok([...edges.values()].every(n=>n===2),'Every edge belongs to two faces');
 const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());mesh.updateMatrixWorld();
 assert.equal(new THREE.Raycaster(new THREE.Vector3(0,.35,1),new THREE.Vector3(0,0,-1)).intersectObject(mesh).length,0);
 const hits=new THREE.Raycaster(new THREE.Vector3(.19,.35,1),new THREE.Vector3(0,0,-1)).intersectObject(mesh);assert.ok(hits.length>0);
 assert.ok([...p.array].every(Number.isFinite));
});
test('body texture preserves clothing colour and removes transparent backdrop from wrapped edges',()=>{
 const map=corpseTexture(atlas(),0),data=map.image.data;
 assert.equal(map.colorSpace,THREE.SRGBColorSpace);assert.equal(map.flipY,true);
 for(let i=0;i<data.length;i+=4)assert.deepEqual(Array.from(data.subarray(i,i+4)),[48,83,112,255]);
});
test('fallen body rests on the floor for every approach angle, with a horizontal contact shadow',()=>{
 for(const yaw of [0,.7,Math.PI/2,Math.PI,4.2]){
  const source=atlas(),g=createStandingVisitor(source,0,{height:1.8});g.position.set(3,.45,5);g.rotation.y=yaw;
  let disposed=false;g.userData.body.geometry.addEventListener('dispose',()=>{disposed=true;});
  collapseVisitor(g,source,0);assert.ok(disposed);
  for(let i=0;i<60;i++)updateVisitorFall(g,1/60);
  g.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(g.userData.body);
  assert.ok(Math.abs(bounds.min.y-.462)<1e-6);assert.ok(bounds.max.y<.75);
  assert.equal(g.rotation.y,yaw);assert.equal(g.rotation.x,0);
  const up=new THREE.Vector3(0,0,1).transformDirection(g.userData.contactShadow.matrixWorld);assert.ok(up.y>.999);
 }
});
test('wound lands on the front of the volume and follows the fall instead of being buried',()=>{
 const source=atlas(),g=createStandingVisitor(source,0,{height:1.8});g.position.y=.45;collapseVisitor(g,source,0);
 const anchor=bodyWoundAnchor(g,new THREE.Vector3(.1,1.7,0));assert.equal(anchor.parent,g.userData.fall);assert.ok(anchor.point.z>.2);
 updateVisitorFall(g,1);g.updateMatrixWorld(true);
 const world=anchor.parent.localToWorld(anchor.point.clone());assert.ok(world.y>.65);assert.ok(world.y<.74);
});
