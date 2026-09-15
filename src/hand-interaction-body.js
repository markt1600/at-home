import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {floorHeight} from './house-layout.js';
import {inWalkableArea,moveAlongFloor,intersectsFootprint} from './navigation.js';
import {armBox,solveArm} from './hand-arm-pose.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function clearSegment(a,b,obstacles){
 const count=Math.max(1,Math.ceil(distance(a,b)/.04));let height=floorHeight(a.x,a.z);
 for(let i=1;i<=count;i++){const x=THREE.MathUtils.lerp(a.x,b.x,i/count),z=THREE.MathUtils.lerp(a.z,b.z,i/count),next=floorHeight(x,z);if(!inWalkableArea(x,z,true,obstacles)||next-height>.22||height-next>.32)return false;height=next;}
 return true;
}

// A small, local search uses the same clearance and step heights as walking.
// Never teleport through the island, a chair, or a wall to reach an animation.
export function handApproachPath(start,target,obstacles=[]){
 if(distance(start,target)>3.5||!inWalkableArea(target.x,target.z,true,obstacles))return null;
 // Leave a centimetre beyond the walking capsule so sampled corner routes
 // cannot skim an edge and stall when followed in smaller animation steps.
 obstacles=obstacles.map(c=>({...c,w:c.w+.02,d:c.d+.02}));
 if(clearSegment(start,target,obstacles))return [target.clone()];
 const step=.16,key=(i,j)=>`${i},${j}`,first={x:start.x,z:start.z,i:0,j:0,parent:null},queue=[first],seen=new Set([key(0,0)]);
 for(let n=0;n<queue.length&&n<1800;n++){
  const p=queue[n];
  if(distance(p,target)<.25&&clearSegment(p,target,obstacles)){const path=[target.clone()];for(let q=p;q.parent;q=q.parent)path.unshift(new THREE.Vector3(q.x,0,q.z));return path;}
  for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const i=p.i+di,j=p.j+dj,k=key(i,j);if(seen.has(k))continue;seen.add(k);const next={x:start.x+i*step,z:start.z+j*step,i,j,parent:p};if(distance(start,next)>3.5||!clearSegment(p,next,obstacles))continue;queue.push(next);}
 }
 return null;
}

export class HandInteractionBody{
 constructor(world){
  this.world=world;this.owner=null;this.path=[];this.settled=false;
  this.arms=new THREE.Group();this.arms.name='Player arms during hand interactions';this.arms.userData.dynamic=true;this.arms.visible=false;world.scene.add(this.arms);
  const material=world.mat(0xd8d5cc,.96);
  this.torso=new THREE.Mesh(new RoundedBoxGeometry(.41,.66,.28,3,.09),material);this.torso.name='Player shirt connected to both shoulders';this.arms.add(this.torso);
  this.segments=Array.from({length:4},(_,i)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(i%2?.030:.039,i%2?.036:.052,1,16),material);mesh.castShadow=mesh.receiveShadow=true;this.arms.add(mesh);return mesh;});
  const joint=(radius)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,20,12),material);mesh.castShadow=mesh.receiveShadow=true;this.arms.add(mesh);return mesh;};
  this.elbows=Array.from({length:2},()=>joint(.040));this.shoulders=Array.from({length:2},()=>joint(.065));this.previousElbows=[null,null];
 }
 get active(){return !!this.owner;}
 ready(owner){return this.owner===owner&&this.settled;}
 begin(owner){
  if(this.owner)return this.owner===owner;
  const w=this.world;owner.handAnchor.updateWorldMatrix(true,false);
  const target=owner.handAnchor.localToWorld(new THREE.Vector3(...owner.handStance));target.y=floorHeight(target.x,target.z);
  const path=handApproachPath(w.camera.position,target,w.colliders);
  if(!path){w.onHouseMessage?.('Move a little closer to the front to reach it.');return false;}
  this.owner=owner;this.target=target;this.path=path;this.settled=false;this.blocked=0;
  this.bodyRotation=owner.handAnchor.getWorldQuaternion(new THREE.Quaternion());
  this.previousElbows=[null,null];this.lastBlockedPose=null;this.obstacles=(owner.handSolids||[]).map(s=>armBox(s.anchor,...s.bounds,s.name));
  const station=owner.handAnchor.getWorldPosition(new THREE.Vector3());
  for(const c of w.colliders){
   if(owner.handColliderExclusions?.includes(c))continue;
   if(Math.hypot(c.x-target.x,c.z-target.z)>3+Math.max(c.w,c.d)/2)continue;
   // Replace only the operated furniture's coarse walking footprint with its
   // actual worktop volumes. Neighbouring chairs, speakers and walls still count.
   if(!c.wall&&owner.handSolids?.length&&intersectsFootprint(station.x,station.z,c,0))continue;
   const anchor=new THREE.Object3D();anchor.position.set(c.x,0,c.z);anchor.rotation.y=c.angle||0;
   this.obstacles.push(armBox(anchor,[-c.w/2,-5,-c.d/2],[c.w/2,c.handTop??c.top??floorHeight(c.x,c.z)+(c.wall?3.5:1.4),c.d/2],c.wall||'nearby furniture'));
  }
  w.keys={};w.touchMove={x:0,z:0};w.jumpQueued=false;w.eyeHeight=1.67;w.landingMotion=0;
  return true;
 }
 finish(owner){if(this.owner!==owner)return;this.owner=null;this.path=[];this.settled=false;this.arms.visible=false;this.world.keys={};this.world.touchMove={x:0,z:0};this.world.jumpQueued=false;}
 cancel(){const owner=this.owner;if(!owner)return;this.finish(owner);owner.cancelHandAction();}
 update(dt){
  if(!this.owner||dt<=0)return;
  const w=this.world;w.keys={};w.touchMove={x:0,z:0};w.jumpQueued=false;w.walking=false;
  if(this.path.length){
   const next=this.path[0],d=distance(w.camera.position,next),step=Math.min(d,dt*Math.min(1.15,.18+d*3));
   const moved=moveAlongFloor(w.camera.position.x,w.camera.position.z,(next.x-w.camera.position.x)*step/(d||1),(next.z-w.camera.position.z)*step/(d||1),w.colliders);
   w.camera.position.x=moved.x;w.camera.position.z=moved.z;w.walking=moved.distance>.001;
   this.blocked=moved.distance<.00001?this.blocked+dt:0;
   if(distance(w.camera.position,next)<.003)this.path.shift();
   if(this.blocked>1.5){this.cancel();w.onHouseMessage?.('There is something in the way. Try again from the front.');return;}
  }
  if(this.settled&&this.owner.handBodyOffset){
   const target=new THREE.Vector3(...this.owner.handBodyOffset).applyQuaternion(this.bodyRotation).add(this.target),d=distance(w.camera.position,target),step=Math.min(d,dt*1.25);
   const p=moveAlongFloor(w.camera.position.x,w.camera.position.z,(target.x-w.camera.position.x)*step/(d||1),(target.z-w.camera.position.z)*step/(d||1),w.colliders);w.camera.position.x=p.x;w.camera.position.z=p.z;
  }
  const y=floorHeight(w.camera.position.x,w.camera.position.z);
  w.feet={x:w.camera.position.x,y,z:w.camera.position.z,vy:0,grounded:true};
  const eye=this.settled?(this.owner.bodyEyeHeight??1.67):1.67;
  w.camera.position.y=THREE.MathUtils.damp(w.camera.position.y,y+eye,9,dt);
  this.settled||=!this.path.length&&Math.abs(w.camera.position.y-y-1.67)<.012;
  // The head's yaw and pitch deliberately remain independent of body placement.
 }
 updateArms(){
  const w=this.world,owner=this.owner;this.arms.visible=!!owner&&this.settled;
  if(!this.arms.visible)return;
  const eye=w.camera.position.y-floorHeight(w.camera.position.x,w.camera.position.z),crouch=THREE.MathUtils.clamp((1.67-eye)/.89,0,1);
  this.torso.quaternion.copy(this.bodyRotation);this.torso.scale.y=THREE.MathUtils.lerp(1,.66,crouch);this.torso.position.copy(new THREE.Vector3(0,THREE.MathUtils.lerp(-.57,-.43,crouch),.14).applyQuaternion(this.bodyRotation).add(w.camera.position));
  for(let i=0;i<2;i++){
   const hand=owner.hands[i],upper=this.segments[i*2],lower=this.segments[i*2+1];upper.visible=lower.visible=this.elbows[i].visible=this.shoulders[i].visible=hand.visible;if(!hand.visible)continue;
   hand.updateWorldMatrix(true,false);
   const wrist=hand.localToWorld(new THREE.Vector3(0,-.006,.096));
   const shoulder=new THREE.Vector3(i?.205:-.205,-.28,.09).applyQuaternion(this.bodyRotation).add(w.camera.position),pole=new THREE.Vector3(i?.5:-.5,-.55,.8).applyQuaternion(this.bodyRotation);
   const elbow=solveArm(shoulder,wrist,pole,this.obstacles,this.previousElbows[i]);
   if(!elbow){this.lastBlockedPose={stage:owner.stage||'bone',time:owner.time,side:i,shoulder:shoulder.toArray(),wrist:wrist.toArray(),reach:shoulder.distanceTo(wrist)};this.cancel();w.onHouseMessage?.('There is not enough room to reach safely. Try from the front.');return;}
   this.previousElbows[i]=elbow.clone();this.shoulders[i].position.copy(shoulder);
   this.elbows[i].position.copy(elbow);
   for(const [mesh,a,b] of [[upper,shoulder,elbow],[lower,elbow,wrist]]){const direction=b.clone().sub(a),length=direction.length();mesh.position.copy(a).lerp(b,.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());mesh.scale.set(1,length,1);}
  }
 }
}
