import * as THREE from 'three';
import {planPoint} from './house-layout.js';

// Beside the south side of the balcony, with the fork broadside to the room.
export const OLIVE_PLAN=[256,645];
export function buildOliveTree(world,root,m){
 const tree=new THREE.Group(),[x,z]=planPoint(...OLIVE_PLAN);tree.name='Y-shaped balcony olive tree';tree.position.set(x,0,z);tree.rotation.y=Math.PI/2;root.add(tree);
 const bark=world.mat(0x777564,.92);m.oliveBark=bark;
 const rod=(parent,a,b,ra,rb=ra)=>{const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),v=q.clone().sub(p),o=world.cyl(rb,ra,v.length(),...p.add(q).multiplyScalar(.5).toArray(),bark,parent,14);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;};
 world.cyl(.43,.35,.57,0,.285,0,world.mat(0x535952,.72),tree,48);world.cyl(.398,.398,.012,0,.58,0,world.mat(0x494333),tree,48);
 rod(tree,[0,.55,0],[.02,1.28,.01],.16,.135);
 rod(tree,[.02,1.13,0],[-.31,1.99,-.04],.12,.09);rod(tree,[.01,1.17,0],[.48,1.94,.04],.115,.075);
 for(let i=0;i<7;i++){const a=i*2.4;rod(tree,[Math.cos(a)*.20,.58,Math.sin(a)*.16],[Math.cos(a)*.07,1.16,Math.sin(a)*.07],.045,.023);}
 world.sphere(.17,0,.70,0,bark,tree,1.08,1.6,.98);
 const leaves=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.83,side:THREE.DoubleSide});
 const clock={value:0};world.oliveWindClock=clock;
 leaves.onBeforeCompile=shader=>{shader.uniforms.oliveWind=clock;shader.vertexShader='uniform float oliveWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x += sin(oliveWind * 2.1 + position.y * 19.0) * 0.014 * abs(position.y);');};
 leaves.customProgramCacheKey=()=> 'olive-leaf-flutter-v1';
 const leafGeometry=new THREE.SphereGeometry(1,6,4);world.oliveBranches=[];
 for(let i=0;i<24;i++){
  const a=i*2.4,side=i%2?1:-1,g=new THREE.Group();g.name='Olive branch in breeze';g.userData.dynamic=true;g.position.set(side===1?.36:-.26,1.65+(i%4)*.085,side*.04);tree.add(g);world.oliveBranches.push(g);
  const end=new THREE.Vector3(Math.cos(a)*.50,.18+(i%5)*.11,Math.sin(a)*.49);rod(g,[0,0,0],end.toArray(),.009,.0025);
  const mesh=new THREE.InstancedMesh(leafGeometry,leaves,32),o=new THREE.Object3D();mesh.name='Silver-green olive leaves';mesh.castShadow=true;mesh.receiveShadow=true;
  for(let j=0;j<32;j++){const t=.12+(j/32)*.88,aa=a+j*2.4;const offset=new THREE.Vector3(Math.cos(aa)*.12,Math.sin(aa)*.065,Math.sin(aa)*.12);o.position.copy(end).multiplyScalar(t).add(offset);o.rotation.set(.35*Math.sin(aa),aa,.5*Math.cos(aa));o.scale.set(.017,.004,.060+(j%3)*.008);o.updateMatrix();mesh.setMatrixAt(j,o.matrix);mesh.setColorAt(j,new THREE.Color(j%3?0x617750:0x9ba18a));}
  mesh.instanceMatrix.needsUpdate=true;g.add(mesh);
 }
 world.colliders.push({x,z,w:.86,d:.86});
}

export function updateOliveBreeze(world,time,motion=true){
 if(world.oliveWindClock)world.oliveWindClock.value=motion?time:0;
 const gust=.65+.35*Math.sin(time*.23);
 world.oliveBranches?.forEach((g,i)=>{g.rotation.x=motion?Math.sin(time*.63+i*1.7)*.025*gust:0;g.rotation.z=motion?(Math.sin(time*.81+i*.9)+.32*Math.sin(time*1.63+i))*.022*gust:0;});
}
