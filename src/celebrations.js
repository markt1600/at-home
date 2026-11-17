import * as THREE from 'three';
import {planPoint} from './house-layout.js';
import {MEMORY_OPEN_SPOTS} from './memory-floor-geometry.js';

// Balloons for special days. Bunches stand in the living room, by the dining
// table and at the entrance on a day the editor has marked, and a small bunch
// floats beside any memory whose anniversary is today.
export const BALLOON_PALETTES={balloons:[0xd9483b,0xf2b632,0x3f8fc4,0x5aa469,0xe57fa5,0x8a63c9],rose:[0xc8323c,0xe8798f,0xf3b6c0,0xa3202d,0xf7d9dc],gold:[0xd8b25a,0xf4efe2,0xc79a3a,0xfbf3d8,0xe6cf8f]};
// Open floor in three rooms; each bunch moves to the nearest spot that is clear of furniture.
export const BUNCH_PLACES=[{room:'living',plan:[470,655],count:7},{room:'dining',plan:[345,775],count:5},{room:'hall',plan:[700,690],count:5}];
export function openFloorNear(room,plan){
 const [x,z]=planPoint(...plan);let best=null,distance=Infinity;
 for(const p of MEMORY_OPEN_SPOTS){if(p[3]!==room)continue;const d=Math.hypot(p[0]-x,p[2]-z);if(d<distance){best=p;distance=d;}}
 return best?best.slice(0,3):null;
}
const seeded=seed=>()=>{seed=(seed*16807+11)%2147483647;return seed/2147483647;};

export class Celebrations{
 constructor(world){
  this.world=world;this.time=0;this.group=new THREE.Group();this.group.name='Celebration balloons';world.scene.add(this.group);
  this.occasions=new THREE.Group();this.anniversaries=new THREE.Group();this.group.add(this.occasions,this.anniversaries);
  this.string=world.mat(0xe9e4d6,.8);this.weight=world.mat(0x8f8a7c,.45,.3);this.balloonGeometry=new THREE.SphereGeometry(.13,20,14);this.knotGeometry=new THREE.ConeGeometry(.018,.035,8);
  this.materials=new Map();
 }
 material(color){if(!this.materials.has(color))this.materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.22,metalness:.05}));return this.materials.get(color);}
 bunch(parent,[x,y,z],palette,count,seed,height=1.75){
  const random=seeded(seed),g=new THREE.Group();g.position.set(x,y,z);g.userData.sway=random()*6;parent.add(g);
  const weight=new THREE.Mesh(new THREE.CylinderGeometry(.05,.06,.035,16),this.weight);weight.position.y=.018;weight.castShadow=true;g.add(weight);
  for(let i=0;i<count;i++){
   const angle=i/count*Math.PI*2+random()*.6,spread=.1+random()*.16+(i%2)*.06,top=height-.12+random()*.36-(i%3)*.1;
   const end=new THREE.Vector3(Math.cos(angle)*spread,top,Math.sin(angle)*spread),length=end.length();
   const pivot=new THREE.Group();pivot.userData={phase:random()*6,lean:.6+random()*.6};g.add(pivot);
   const string=new THREE.Mesh(new THREE.CylinderGeometry(.0015,.0015,length,4),this.string);string.position.copy(end).multiplyScalar(.5);string.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().normalize());pivot.add(string);
   const balloon=new THREE.Mesh(this.balloonGeometry,this.material(palette[Math.floor(random()*palette.length)]));balloon.scale.set(1,1.22,1);balloon.position.copy(end).add(new THREE.Vector3(0,.15,0));balloon.castShadow=true;pivot.add(balloon);
   const knot=new THREE.Mesh(this.knotGeometry,balloon.material);knot.position.copy(end).add(new THREE.Vector3(0,-.01,0));pivot.add(knot);
  }
  return g;
 }
 clear(group){for(const child of [...group.children]){child.traverse(o=>{if(o.isMesh&&o.geometry!==this.balloonGeometry&&o.geometry!==this.knotGeometry)o.geometry.dispose();});group.remove(child);}}
 // The day's own decorations: one palette per occasion, sharing the three places.
 setOccasions(occasions){
  this.clear(this.occasions);if(!occasions?.length)return;
  BUNCH_PLACES.forEach((place,i)=>{const spot=openFloorNear(place.room,place.plan),occasion=occasions[i%occasions.length];if(spot)this.bunch(this.occasions,spot,BALLOON_PALETTES[occasion.decoration]||BALLOON_PALETTES.balloons,place.count,101+i*37);});
 }
 // Three balloons just beside the marker of each memory made on this day.
 setAnniversaries(memories){
  this.clear(this.anniversaries);
  memories.filter(m=>!m.petId&&Array.isArray(m.position)).slice(0,4).forEach((m,i)=>this.bunch(this.anniversaries,[m.position[0]+.34,m.position[1],m.position[2]+.2],BALLOON_PALETTES.balloons,3,733+i*91,1.45));
 }
 update(dt){
  if(!this.occasions.children.length&&!this.anniversaries.children.length)return;this.time+=dt;
  for(const set of [this.occasions,this.anniversaries])for(const g of set.children)for(const pivot of g.children){if(!pivot.userData.lean)continue;pivot.rotation.set(Math.sin(this.time*.7+pivot.userData.phase)*.035*pivot.userData.lean,0,Math.cos(this.time*.55+pivot.userData.phase+g.userData.sway)*.04*pivot.userData.lean);}
 }
}
