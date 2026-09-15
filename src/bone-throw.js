import * as THREE from 'three';
import {createInteractionHand} from './interaction-hand.js';
import {floorHeight} from './house-layout.js';
import {handApproachPath} from './hand-interaction-body.js';

const mix=THREE.MathUtils.lerp;
const phase=(t,a,b)=>{const p=THREE.MathUtils.clamp((t-a)/(b-a),0,1);return p*p*(3-2*p);};
export class BoneThrow{
 constructor(world,bone){
  this.world=world;this.bone=bone;this.root=new THREE.Group();this.root.name='First-person bone pickup and throw';this.root.userData.dynamic=true;this.root.visible=false;world.scene.add(this.root);
  this.handAnchor=this.root;this.handStance=[0,0,.50];this.hands=[-1,1].map(side=>createInteractionHand(world,this.root,side,{articulated:true,name:side<0?'Left hand balancing during pickup':'Right hand picking up and throwing Leo’s bone'}));this.active=false;this.held=false;this.bodyEyeHeight=1.67;
 }
 start(){
  const w=this.world,b=this.bone;if(this.active||w.handInteraction.active||!b.canThrow(w.camera.position))return false;
  this.direction=w.camera.getWorldDirection(new THREE.Vector3());this.direction.y=0;
  if(this.direction.length()<.01)return false;this.direction.normalize();
  this.root.position.set(b.x,floorHeight(b.x,b.z),b.z);this.root.rotation.y=Math.atan2(-this.direction.x,-this.direction.z);this.root.updateWorldMatrix(true,true);
  // A stance behind the bone leaves room to reach down without stepping on it.
  let stance;
  for(const z of [.50,.62,.40]){const p=this.root.localToWorld(new THREE.Vector3(0,0,z));if(handApproachPath(w.camera.position,p,w.colliders)&&b.landing(p,this.direction)){stance=z;break;}}
  if(stance===undefined){w.onHouseMessage?.('Face an open part of the room to pick up and throw Leo’s bone.');return false;}
  this.handStance=[0,0,stance];this.bodyEyeHeight=1.67;
  if(!w.handInteraction.begin(this))return false;
  if(!b.beginPickup(w.camera.position)){w.handInteraction.finish(this);return false;}
  this.active=true;this.held=false;this.released=false;this.time=0;this.root.visible=true;this.hands.forEach(h=>{h.visible=false;h.userData.grip(0);});return true;
 }
 takeBone(){
  const mesh=this.bone.mesh;this.hands[1].attach(mesh);this.gripPosition=mesh.position.clone();this.gripRotation=mesh.quaternion.clone();mesh.visible=true;this.held=true;
 }
 releaseBone(){
  const w=this.world,mesh=this.bone.mesh;mesh.updateWorldMatrix(true,false);const launch=mesh.getWorldPosition(new THREE.Vector3());
  w.scene.attach(mesh);this.held=false;this.released=true;
  if(!this.bone.throw(w.camera.position,this.direction,launch))this.bone.cancelPickup();
 }
 cancelHandAction(){
  if(this.held)this.world.scene.attach(this.bone.mesh);
  this.held=false;this.bone.cancelPickup();this.active=false;this.root.visible=false;this.bodyEyeHeight=1.67;this.hands.forEach(h=>h.visible=false);this.world.handInteraction.finish(this);this.bone.updateModel();
 }
 update(dt){
  const w=this.world;if(!this.active||dt<=0||!w.handInteraction.ready(this))return;
  this.time+=dt;const t=this.time,lower=phase(t,0,.95),rise=phase(t,1.48,2.35),withdraw=phase(t,3.40,4);
  this.bodyEyeHeight=mix(1.67,.78,lower*(1-rise));
  const left=this.hands[0],right=this.hands[1];left.visible=t<2.5;right.visible=true;
  left.position.set(-.22,mix(1.02,.40,lower*(1-rise)),this.handStance[2]-.04);left.rotation.set(.15,0,.18);left.userData.grip(.15);
  const pickup=new THREE.Vector3(0,.083,.065);
  if(t<1.45){right.position.set(.20,.95,this.handStance[2]-.06).lerp(pickup,phase(t,.20,1.22));right.rotation.set(0,0,0);}
  else if(t<2.35){right.position.copy(pickup).lerp(new THREE.Vector3(.20,.80,this.handStance[2]-.08),rise);right.rotation.x=mix(0,-.25,rise);}
  else if(t<2.7){const p=phase(t,2.35,2.7);right.position.set(mix(.20,.25,p),mix(.80,.86,p),mix(this.handStance[2]-.08,this.handStance[2]+.10,p));right.rotation.x=-.25;}
  else if(t<3.25){const p=phase(t,2.7,3.25);right.position.set(mix(.25,.10,p),mix(.86,1.16,p),mix(this.handStance[2]+.10,-.08,p));right.rotation.x=mix(-.25,.12,p);}
  else {right.position.set(.10,1.16,-.08).lerp(new THREE.Vector3(.23,1.00,this.handStance[2]+.15),withdraw);right.rotation.x=mix(.12,0,withdraw);}
  const grip=phase(t,1.17,1.35)*(1-phase(t,3.04,3.13));right.userData.grip(grip);
  if(t>=1.35&&!this.held&&!this.released)this.takeBone();
  if(this.held){const p=phase(t,1.35,1.65);this.bone.mesh.position.copy(this.gripPosition).lerp(new THREE.Vector3(0,-.028,-.065),p);this.bone.mesh.quaternion.copy(this.gripRotation).slerp(new THREE.Quaternion(),p);}
  if(t>=3.08&&!this.released)this.releaseBone();
  if(t>=4){this.active=false;this.root.visible=false;this.bodyEyeHeight=1.67;this.hands.forEach(h=>h.visible=false);w.handInteraction.finish(this);}
 }
}
