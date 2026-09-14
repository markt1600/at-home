import * as THREE from 'three';
import {floorHeight} from './house-layout.js';
import {PETS} from './life.js';

// Screen taps select along the finger's ray, without moving the camera or
// extending the normal reach of memories and household interactions.
export function pickTouchInteraction(world,clientX,clientY){
 const bounds=world.canvas.getBoundingClientRect();
 if(!bounds.width||!bounds.height||clientX<bounds.left||clientX>bounds.right||clientY<bounds.top||clientY>bounds.bottom)return null;
 const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((clientX-bounds.left)/bounds.width*2-1,-(clientY-bounds.top)/bounds.height*2+1),world.camera);ray.far=6;
 const fixture=world.houseInteractions.selectRay(ray);let best=fixture?{...fixture,type:'fixture',ray}:null;
 const obstruction=ray.intersectObject(world.houseRoot,true).find(hit=>!hit.object.material.transparent)?.distance??Infinity;
 const offer=(type,id,distance)=>{if(distance<=obstruction+.025&&distance<(best?.distance??Infinity))best={type,id,distance,ray};};
 const sphere=(type,id,center,radius,range)=>{if(center.distanceTo(world.camera.position)>range)return;const hit=ray.ray.intersectSphere(new THREE.Sphere(center,radius),new THREE.Vector3());if(hit)offer(type,id,hit.distanceTo(ray.ray.origin));};
 for(const marker of world.memoryMarkers?.children||[]){
  if(!marker.visible)continue;
  const p=marker.position,c=world.camera.position;
  if(Math.hypot(c.x-p.x,c.z-p.z)>1.25||Math.abs(floorHeight(c.x,c.z)-p.y)>.4)continue;
  const hit=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-p.y-.027),new THREE.Vector3());
  if(hit&&Math.hypot(hit.x-p.x,hit.z-p.z)<=.24)offer('memory',marker.userData.memoryId,hit.distanceTo(ray.ray.origin));
 }
 for(const [id,actor] of world.actors||[])if(actor.visible){const height=PETS.find(p=>p.id===id)?.height||.4;sphere('pet',id,actor.position.clone().add(new THREE.Vector3(0,height/2,0)),Math.max(.18,height*.7),3.3);}
 if(world.turntablePosition)sphere('object','turntable',world.turntablePosition,.30,2.3);
 if(world.windowLounge?.telescope)sphere('object','telescope',world.windowLounge.telescope.position.clone().add(new THREE.Vector3(0,1.49,.54)),.35,2.5);
 return best;
}
