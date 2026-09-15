import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Local -Z points along the fingers, +Y is the back of the hand. Side -1 is
// the left hand: its thumb and index finger belong on the +X edge.
export function createInteractionHand(world,parent,side,{name,articulated=false,grip=.08}={}){
 const hand=new THREE.Group();hand.name=name;parent.add(hand);
 const skin=world.mat(0xc99470,.9),nails=world.mat(0xd7ab8a,.88);
 const mesh=(geometry,material,at,parent=hand)=>{const m=new THREE.Mesh(geometry,material);m.position.set(...at);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const soft=(w,h,d,at,material=skin,parent=hand)=>mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.32),material,at,parent);
 soft(.065,.025,.081,[0,0,0]);soft(.039,.028,.070,[0,-.003,.067]);
 const fingers=[];
 for(let i=0;i<4;i++){
  const finger=new THREE.Group();finger.name=['Index','Middle','Ring','Little'][i];finger.position.set(side*(i-1.5)*.015,-.002,-.036);hand.add(finger);
  const length=[.041,.052,.049,.038][i];soft(.012,.015,length,[0,0,-length/2],skin,finger);
  const tip=new THREE.Group();tip.position.z=-length;finger.add(tip);
  soft(.012,.017,.020,[0,0,-.008],skin,tip);soft(.008,.002,.009,[0,.009,-.008],nails,tip);fingers.push({finger,tip});
 }
 const inward=-side;
 // The thumb grows from the fleshy heel of the palm, rather than a floating
 // bar beside the knuckles. Two joints keep its nail aligned with the tip.
 const pad=mesh(new THREE.SphereGeometry(1,16,10),skin,[inward*.024,-.005,.010]);pad.scale.set(.018,.013,.025);
 const thumb=new THREE.Group();thumb.name='Thumb base';thumb.position.set(inward*.031,-.004,.009);hand.add(thumb);
 const link=(parent,length,radius)=>{const m=mesh(new THREE.CapsuleGeometry(radius,length-radius,4,12),skin,[0,0,-length/2],parent);m.rotation.x=Math.PI/2;return m;};
 link(thumb,.030,.010);
 const tip=new THREE.Group();tip.name='Thumb tip';tip.position.z=-.030;thumb.add(tip);link(tip,.025,.0085);
 soft(.010,.002,.013,[0,.008,-.016],nails,tip);
 const setGrip=amount=>{
  const a=THREE.MathUtils.clamp(amount,0,1);
  for(const {finger,tip} of fingers){finger.rotation.x=-a*.95;tip.rotation.x=-a*.85;}
  // Open thumbs point forward/outward. Opposition swings them toward the
  // curled index finger; flexion stays on the palm side with no sideways kink.
  thumb.rotation.set(-.08-a*.40,inward*THREE.MathUtils.lerp(-.55,.24,a),0,'YXZ');
  tip.rotation.x=-.10-a*.38;
 };
 setGrip(grip);
 if(articulated){hand.userData.grip=setGrip;return hand;}
 // Fixed poses remain two draw calls per hand, including every thumb joint.
 hand.updateMatrixWorld(true);
 const inverse=hand.matrixWorld.clone().invert(),meshes=[];hand.traverse(o=>{if(o.isMesh)meshes.push(o);});
 const merged=[skin,nails].map(material=>{
  const parts=meshes.filter(m=>m.material===material).map(m=>(m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone()).applyMatrix4(inverse.clone().multiply(m.matrixWorld)));
  const joined=new THREE.Mesh(mergeGeometries(parts),material);joined.castShadow=joined.receiveShadow=true;
  parts.forEach(g=>g.dispose());return joined;
 });
 meshes.forEach(m=>m.geometry.dispose());hand.clear();hand.add(...merged);return hand;
}
