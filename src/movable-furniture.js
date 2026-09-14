import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {scaleMaterialUVs} from './house-materials.js';
import {floorHeight} from './house-layout.js';
import {inWalkableArea,intersectsFootprint} from './navigation.js';

// Batch each movable object in its own coordinate system, so a chair still
// costs only a few draw calls while its collider and model move together.
export function batchObject(group){
 group.userData.dynamic=true;group.updateWorldMatrix(true,true);
 const inverse=group.matrixWorld.clone().invert(),parts=new Map(),originals=[];
 group.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
  if(o.material.userData.textureMeters)scaleMaterialUVs(geo,o.material.userData.textureMeters);
  geo.applyMatrix4(inverse.clone().multiply(o.matrixWorld));const list=parts.get(o.material)||[];list.push(geo);parts.set(o.material,list);originals.push(o);
 });
 for(const o of originals){o.removeFromParent();o.geometry.dispose();}
 for(const [material,geometries] of parts){const mesh=new THREE.Mesh(mergeGeometries(geometries,false),material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);for(const geo of geometries)geo.dispose();}
}
const axes=c=>[[Math.cos(c.angle||0),-Math.sin(c.angle||0)],[Math.sin(c.angle||0),Math.cos(c.angle||0)]];
export function footprintsOverlap(a,b,gap=.012){
 const aa=axes(a),ba=axes(b),dx=b.x-a.x,dz=b.z-a.z;
 for(const [x,z] of [...aa,...ba]){
  const radius=(c,axis)=>Math.abs(x*axis[0][0]+z*axis[0][1])*c.w/2+Math.abs(x*axis[1][0]+z*axis[1][1])*c.d/2;
  if(Math.abs(dx*x+dz*z)>=radius(a,aa)+radius(b,ba)+gap)return false;
 }return true;
}
export class MovableFurniture{
 constructor(world){this.world=world;this.items=[];}
 add(group,{w,d,top}){
  batchObject(group);const c={x:group.position.x,z:group.position.z,w,d,angle:group.rotation.y,top:group.position.y+top,base:group.position.y,landable:true,movable:true,label:group.name};
  this.world.colliders.push(c);this.items.push({group,collider:c,start:group.position.clone()});return c;
 }
 canMove(c,x,z){
  const next={...c,x,z},[a,b]=axes(c);
  for(const sx of [-1,0,1])for(const sz of [-1,0,1]){
   const px=x+sx*c.w/2*a[0]+sz*c.d/2*b[0],pz=z+sx*c.w/2*a[1]+sz*c.d/2*b[1];
   if(!inWalkableArea(px,pz,true)||Math.abs(floorHeight(px,pz)-c.base)>.02)return false;
  }
  if(this.world.colliders.some(o=>o!==c&&!(o.top!==undefined&&o.top<=c.base+.015)&&footprintsOverlap(next,o)))return false;
  for(const p of this.world.petRoaming?.pets.values()||[])if(Math.abs(p.y-c.base)<.3&&intersectsFootprint(p.x,p.z,next,.23))return false;
  return true;
 }
 push(player,dx,dz){
  if(!player.grounded||Math.hypot(dx,dz)<.0001)return;
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.025)),sx=dx/count,sz=dz/count;
  for(const item of this.items){const c=item.collider;if(Math.abs(player.y-c.base)>.2)continue;
   for(let i=0;i<count;i++){
    if(!intersectsFootprint(player.x+dx,player.z+dz,c,.17)||(c.x-player.x)*dx+(c.z-player.z)*dz<=0)break;
    if(!this.canMove(c,c.x+sx,c.z+sz))break;
    c.x+=sx;c.z+=sz;item.group.position.x=c.x;item.group.position.z=c.z;item.group.updateMatrixWorld(true);
    if(this.world.daylight)this.world.daylight.sun.shadow.needsUpdate=true;
   }
  }
 }
 reset(){for(const {group,collider,start} of this.items){group.position.copy(start);collider.x=start.x;collider.z=start.z;group.updateMatrixWorld(true);}}
}
