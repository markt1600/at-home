import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {LIVING_SEATING,planPoint,PLAN_SCALE} from './house-layout.js';

// The built-in orange corner fills the ledge, from the stair jamb to the
// divider-wall tip. Its stone is a vertical support, not a shelf around a sofa.
export function buildLivingSeating(world,root,materials){
 const group=new THREE.Group();group.name='Fitted orange corner seating';root.add(group);
 const piece=(name,x0,z0,x1,z1,y,h,material,rounded=true)=>{
  const [x,z]=planPoint((x0+x1)/2,(z0+z1)/2),w=(x1-x0)/PLAN_SCALE,d=(z1-z0)/PLAN_SCALE;
  const geometry=rounded?new RoundedBoxGeometry(w,h,d,3,.045):new THREE.BoxGeometry(w,h,d);
  const mesh=new THREE.Mesh(geometry,materials[material]);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;
 };
 const collision=(x0,z0,x1,z1,top)=>{
  const [x,z]=planPoint((x0+x1)/2,(z0+z1)/2);
  world.colliders.push({x,z,w:(x1-x0)/PLAN_SCALE,d:(z1-z0)/PLAN_SCALE,angle:0,top,landable:true});
 };
 for(const part of LIVING_SEATING){
  const [[x0,z0],,[x1,z1]]=part.plan;
  // A small upholstery overhang hides the stone top even along rounded edges.
  const support=piece('Recessed stone sofa support',x0,z0,x1,z1,.1825,.525,'marble',false);
  // Keep the foot of the support joined to the surrounding floor. Only its
  // upper edge is recessed, so there is no open crack along the floor cutout.
  const vertices=support.geometry.attributes.position;
  for(let i=0;i<vertices.count;i++)if(vertices.getY(i)>0){
   vertices.setX(i,vertices.getX(i)-Math.sign(vertices.getX(i))*.8/PLAN_SCALE);
   vertices.setZ(i,vertices.getZ(i)-Math.sign(vertices.getZ(i))*.8/PLAN_SCALE);
  }
  support.geometry.computeVertexNormals();
  piece('Continuous upholstered sofa base',x0,z0,x1,z1,.57,.27,'orange');
  collision(x0,z0,x1,z1,.90);
 }
 const back=9.6,innerX=611-back,innerZ=482+back;
 piece('North sofa back at divider wall',514,482,611,innerZ,1.025,.63,'orange');
 piece('East sofa back at walkway',innerX,innerZ,611,650,1.025,.63,'orange');
 collision(514,482,611,innerZ,1.34);collision(innerX,innerZ,611,650,1.34);
 // Separate cushions meet at the L corner without overlapping meshes. Their
 // outside edges share the full footprint of the upholstered foundation.
 const seam=.45;
 for(let i=0;i<2;i++){
  const x0=514+i*24,x1=x0+24;
  piece('Deep return cushion',x0+(i?seam:0),innerZ+.2,x1-seam,570,.79,.22,'orange');
 }
 const length=(650-innerZ)/5;
 for(let i=0;i<5;i++)piece('Long sofa cushion',562,innerZ+i*length+.2,innerX-.2,innerZ+(i+1)*length-(i===4?0:seam),.79,.22,'orange');
 for(const [px,pz,yaw,material] of [[529,498,0,'cream'],[550,498,0,'blue'],[595,523,-Math.PI/2,'cream'],[595,571,-Math.PI/2,'blue'],[595,627,-Math.PI/2,'cream']]){
  const [x,z]=planPoint(px,pz),pillow=new THREE.Mesh(new RoundedBoxGeometry(.45,.44,.17,3,.045),materials[material]);
  pillow.name='Loose orange sofa pillow';pillow.position.set(x,1.12,z);pillow.rotation.set(-.16,yaw,.05);pillow.castShadow=pillow.receiveShadow=true;group.add(pillow);
 }
}
