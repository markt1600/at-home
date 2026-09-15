import * as THREE from 'three';
import {createInteractionHand} from './interaction-hand.js';
import {floorHeight} from './house-layout.js';
import {handApproachPath} from './hand-interaction-body.js';

const mix=THREE.MathUtils.lerp;
const phase=(t,a,b)=>{const p=THREE.MathUtils.clamp((t-a)/(b-a),0,1);return p*p*(3-2*p);};

export class ShoeHandling{
 constructor(world,tidying){
  this.world=world;this.tidying=tidying;this.root=new THREE.Group();this.root.name='First-person shoe pickup and placement';this.root.userData.dynamic=true;this.root.visible=false;world.scene.add(this.root);
  this.handAnchor=this.root;this.hands=[-1,1].map(side=>createInteractionHand(world,this.root,side,{articulated:true,name:side<0?'Left hand balancing while tidying':'Right hand carrying shoe'}));
  this.stage='idle';this.bodyEyeHeight=1.67;
 }
 get active(){return this.stage!=='idle';}
 get label(){return !this.world.handInteraction?.ready(this)?'Moving into reach…':this.stage==='pickup'?'Picking up shoe…':'Putting shoe away…';}
 start(entry,placing=false){
  const w=this.world;if(this.active||w.handInteraction?.active||!w.handInteraction)return false;
  const bench=this.tidying.bench,target=placing?bench.localToWorld(this.tidying.slot(entry)):entry.group.getWorldPosition(new THREE.Vector3());
  this.root.position.set(target.x,floorHeight(target.x,target.z),target.z);
  const facing=bench.getWorldQuaternion(new THREE.Quaternion()),local=bench.worldToLocal(target.clone());
  const yaw=new THREE.Euler().setFromQuaternion(facing,'YXZ').y+(!placing&&Math.abs(local.x)>.7&&local.z<.3?Math.sign(local.x)*Math.PI/2:0);
  let found=false;
  for(const angle of placing?[0]:[0,.45,-.45,.9,-.9,Math.PI/2,-Math.PI/2,Math.PI]){
   this.root.rotation.set(0,yaw+angle,0);this.root.updateWorldMatrix(true,true);
   for(const distance of placing&&local.z<.2?[.64,.60,.56]:[.48,.42,.56,.64]){
    const stance=this.root.localToWorld(new THREE.Vector3(0,0,distance));
    if(!handApproachPath(w.camera.position,stance,w.colliders))continue;
    this.handStance=[0,0,distance];found=true;break;
   }
   if(found)break;
  }
  if(!found){w.onHouseMessage?.('Move around to the front of the shoe or bench to reach it.');return false;}
  // Model the open space below the real bench instead of its solid walking
  // footprint. Arms enter below the seat, between its two end panels.
  this.handSolids=[
   {anchor:bench,bounds:[[-.67,.408,-.225],[.67,.463,.225]],name:'shoe bench seat'},
   {anchor:bench,bounds:[[-.67,0,-.225],[-.63,.43,.225]],name:'left bench legs'},
   {anchor:bench,bounds:[[.63,0,-.225],[.67,.43,.225]],name:'right bench legs'},
   {anchor:bench,bounds:[[-.65,.100,-.215],[.65,.120,.215]],name:'shoe shelf'}
  ];
  this.handColliderExclusions=[this.tidying.collider];this.bodyEyeHeight=1.67;
  if(!w.handInteraction.begin(this))return false;
  this.entry=entry;this.stage=placing?'placing':'pickup';this.time=0;this.attached=false;this.released=false;this.root.visible=true;this.hands.forEach(h=>{h.visible=false;h.userData.grip(0);});
  this.followView=true;this.lastView={yaw:w.yaw,pitch:w.pitch};
  this.target=this.root.worldToLocal(target.clone());
  this.grasp=this.target.clone().add(new THREE.Vector3(0,entry.height+.015,.065));
  this.carry=new THREE.Vector3(.20,1.02,this.handStance[2]-.10);
  if(placing){const hand=this.hands[1];hand.position.copy(this.carry);hand.rotation.set(0,0,0);hand.add(entry.group);entry.group.position.set(0,-entry.height-.015,-.065);entry.group.rotation.set(0,0,0);entry.group.visible=true;this.attached=true;}
  return true;
 }
 attach(){
  this.hands[1].attach(this.entry.group);this.fromPosition=this.entry.group.position.clone();this.fromRotation=this.entry.group.quaternion.clone();this.attached=true;
 }
 release(){
  const t=this.tidying;t.bench.attach(this.entry.group);this.entry.group.position.copy(t.slot(this.entry));this.entry.group.rotation.set(0,0,0);this.entry.group.updateMatrixWorld(true);this.entry.tidy=true;this.entry.group.visible=true;this.attached=false;this.released=true;t.held=null;
 }
 finish(){
  this.stage='idle';this.root.visible=false;this.hands.forEach(h=>h.visible=false);this.bodyEyeHeight=1.67;this.world.handInteraction?.finish(this);
 }
 cancelHandAction(){
  if(this.stage==='pickup')this.tidying.restore(this.entry);
  else if(this.entry&&!this.released){this.tidying.held=this.entry;this.root.attach(this.entry.group);this.entry.group.visible=false;}
  this.finish();
 }
 frameAction(dt){
  const w=this.world;
  // Keep the working area in view while bending. Any mouse or touch look
  // immediately hands camera framing back to the player for this action.
  if(Math.abs(w.yaw-this.lastView.yaw)>.0001||Math.abs(w.pitch-this.lastView.pitch)>.0001)this.followView=false;
  if(!this.followView)return;
  const d=this.root.localToWorld(this.grasp.clone()).sub(w.camera.position),yaw=Math.atan2(-d.x,-d.z),pitch=THREE.MathUtils.clamp(Math.atan2(d.y,Math.hypot(d.x,d.z)),-1.15,1.05),delta=Math.atan2(Math.sin(yaw-w.yaw),Math.cos(yaw-w.yaw));
  w.yaw=THREE.MathUtils.damp(w.yaw,w.yaw+delta,8,dt);w.pitch=THREE.MathUtils.damp(w.pitch,pitch,8,dt);w.camera.rotation.set(w.pitch,w.yaw,0,'YXZ');this.lastView={yaw:w.yaw,pitch:w.pitch};
 }
 update(dt){
  if(!this.active||dt<=0||!this.world.handInteraction.ready(this))return;
  this.time+=dt;const t=this.time,placing=this.stage==='placing',lower=phase(t,0,.9),rise=phase(t,placing?2.65:1.45,placing?3.55:2.5);
  // Crouch low enough that the forearm can pass below the bench seat.
  this.bodyEyeHeight=mix(1.67,placing?.59:.73,lower*(1-rise));
  this.frameAction(dt);
  const [left,right]=this.hands;left.visible=true;right.visible=true;
  left.position.set(-.20,mix(1.01,placing?.29:.38,lower*(1-rise)),this.handStance[2]-.22);left.rotation.set(.15,0,.18);left.userData.grip(.15);right.rotation.set(0,0,0);
  if(!placing){
   if(t<1.45)right.position.copy(this.carry).lerp(this.grasp,phase(t,.20,1.20));
   else right.position.copy(this.grasp).lerp(this.carry,rise);
   right.userData.grip(.85*phase(t,1.10,1.32));
   if(t>=1.32&&!this.attached)this.attach();
   if(this.attached){const p=phase(t,1.45,2.25);this.entry.group.position.copy(this.fromPosition).lerp(new THREE.Vector3(0,-this.entry.height-.015,-.065),p);this.entry.group.quaternion.copy(this.fromRotation).slerp(new THREE.Quaternion(),p);}
   if(t>2.5)right.position.lerp(new THREE.Vector3(.24,.78,this.handStance[2]+.04),phase(t,2.5,3.05));
   if(t>=3.1){this.tidying.held=this.entry;this.root.attach(this.entry.group);this.entry.group.visible=false;this.finish();this.world.onHouseMessage?.('Carry the shoe to the metal bench and place it neatly.');}
  }else{
   const outside=this.grasp.clone();outside.z=Math.max(outside.z,this.handStance[2]-.12,.46-this.tidying.slot(this.entry).z);outside.y=this.grasp.y+.03;
   if(t<1.15)right.position.copy(this.carry).lerp(outside,phase(t,.15,1.15));
   else if(t<2.15)right.position.copy(outside).lerp(this.grasp,phase(t,1.15,1.95));
   else if(t<2.65)right.position.copy(this.grasp).lerp(outside,phase(t,2.20,2.65));
   else right.position.copy(outside).lerp(this.carry,rise);
   right.userData.grip(.85*(1-phase(t,1.95,2.15)));
   if(t>=2.15&&!this.released)this.release();
   if(t>=3.65){this.finish();this.tidying.announcePlaced();}
  }
 }
}
