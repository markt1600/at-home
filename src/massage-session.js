import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createInteractionHand} from './interaction-hand.js';
import {handApproachPath} from './hand-interaction-body.js';
import {floorHeight} from './house-layout.js';
import {inWalkableArea,moveAlongFloor} from './navigation.js';

export const MASSAGE_SECONDS=30;
const smooth=t=>THREE.MathUtils.smoothstep(t,0,1),V=(...p)=>new THREE.Vector3(...p);
const eyePath=new THREE.CatmullRomCurve3([V(0,1.67,1.18),V(0,1.59,.71),V(0,1.36,.16),V(0,1.15,.015)],false,'centripetal');

// The walking capsule reaches the clear foot of the chair first. Only then
// does the seated animation control the body inside this furniture footprint.
export class MassageSession{
 constructor(world,chair){
  this.world=world;Object.assign(this,chair);this.stage='idle';this.time=0;this.seated=0;this.recline=0;this.seconds=0;this.roll=0;this.buildBody();
  this.stance=this.group.localToWorld(V(0,0,1.18));this.stance.y=floorHeight(this.stance.x,this.stance.z);
  const pos=this.group.localToWorld(V(0,.85,.49));
  world.houseInteractions.add({id:'massage-chair',pos,range:2.3,surfaceOffset:.28,touchRadius:.40,available:()=>!this.active,
   label:()=> 'Sit down for a 30-second massage',activate:()=>this.start()});
 }
 get active(){return this.stage!=='idle';}
 get exiting(){return ['upright','exit'].includes(this.stage);}
 get remaining(){return Math.max(0,Math.ceil(MASSAGE_SECONDS-this.seconds));}
 setStage(stage){this.stage=stage;this.time=0;this.world.onMassageChange?.(stage);}
 start(){
  const w=this.world;if(this.active||w.handInteraction.active)return false;
  const path=handApproachPath(w.camera.position,this.stance,w.colliders);if(!path){w.onHouseMessage?.('Move closer to the front of the massage chair.');return false;}
  this.path=path;this.blocked=0;this.seated=0;this.recline=0;this.seconds=0;this.body.visible=false;this.followView=true;this.lastView={yaw:w.yaw,pitch:w.pitch};this.clearInput();this.setStage('approach');w.onMassageAudio?.(true);return true;
 }
 clearInput(){const w=this.world;w.keys={};w.touchMove={x:0,z:0};w.jumpQueued=false;w.walking=false;}
 cancel(){
  if(!this.active||this.exiting)return;
  this.world.resumeWandering?.();
  this.world.onMassageAudio?.(false);
  if(this.stage==='approach'){this.finish();return;}
  this.exitRecline=this.recline;this.exitSeated=this.seated;
  this.setStage(this.recline>0?'upright':'exit');
 }
 finish(){
  this.clearInput();this.seated=this.recline=this.roll=0;this.cradle.rotation.x=0;this.body.visible=false;this.collider.z=this.group.position.z+.04;this.collider.d=1.50;
  const w=this.world,y=floorHeight(w.camera.position.x,w.camera.position.z);w.eyeHeight=1.67;w.feet={x:w.camera.position.x,y,z:w.camera.position.z,vy:0,grounded:true};
  this.setStage('idle');w.onMassageAudio?.(false);w.onMassageFinished?.();
 }
 update(dt){
  if(!this.active||dt<=0)return;this.clearInput();this.time+=dt;
  const w=this.world;
  if(this.stage==='approach'){
   const next=this.path[0];if(next){const d=Math.hypot(next.x-w.camera.position.x,next.z-w.camera.position.z),step=Math.min(d,dt*Math.min(1.1,.18+d*3));
    const p=moveAlongFloor(w.camera.position.x,w.camera.position.z,(next.x-w.camera.position.x)*step/(d||1),(next.z-w.camera.position.z)*step/(d||1),w.colliders);w.camera.position.x=p.x;w.camera.position.z=p.z;w.walking=p.distance>.001;
    this.blocked=p.distance<.00001?this.blocked+dt:0;if(d<.005)this.path.shift();if(this.blocked>1.5){this.cancel();w.onHouseMessage?.('The way to the chair is blocked. Try from the front.');return;}}
   const y=floorHeight(w.camera.position.x,w.camera.position.z);w.camera.position.y=THREE.MathUtils.damp(w.camera.position.y,y+1.67,9,dt);
   if(!this.path.length&&Math.abs(w.camera.position.y-y-1.67)<.01){this.setStage('enter');this.entryYaw=w.yaw;this.entryPitch=w.pitch;}
   return;
  }
  if(this.stage==='enter'){this.seated=smooth(this.time/3.2);if(this.time>=3.2)this.setStage('recline');}
  else if(this.stage==='recline'){this.recline=smooth(this.time/2);if(this.time>=2){this.setStage('massage');w.onMassageMusic?.(true);}}
  else if(this.stage==='massage'){this.seconds=Math.min(MASSAGE_SECONDS,this.seconds+dt);if(this.seconds>=MASSAGE_SECONDS)this.cancel();}
  else if(this.stage==='upright'){this.recline=this.exitRecline*(1-smooth(this.time/1.8));if(this.time>=1.8)this.setStage('exit');}
  else if(this.stage==='exit'){
   // The landing must stay clear if a movable object was left nearby.
   if(!inWalkableArea(this.stance.x,this.stance.z,true,w.colliders)){this.time=0;return;}
   this.seated=this.exitSeated*(1-smooth(this.time/3.2));
  }
  this.pose(dt);
  if(this.stage==='exit'&&this.time>=3.2){w.camera.position.copy(this.stance).add(V(0,1.67,0));this.finish();}
 }
 pose(dt){
  const w=this.world;this.cradle.rotation.x=-this.recline*.28;
  this.collider.z=this.group.position.z+.04-this.recline*.08;this.collider.d=1.50+this.recline*.16;
  const local=eyePath.getPoint(this.seated);local.sub(V(0,.43,0)).applyAxisAngle(V(1,0,0),this.cradle.rotation.x).add(V(0,.43,0));
  this.roll=0;
  if(this.stage==='massage'&&w.motion){const t=this.seconds,fade=Math.min(1,t/1.5,(MASSAGE_SECONDS-t)/1.5);local.y+=Math.sin(t*13)*.0035*fade;local.x+=Math.sin(t*8.7)*.0025*fade;this.roll=Math.sin(t*5.1)*.004*fade;}
  w.camera.position.copy(this.group.localToWorld(local));
  if(Math.abs(w.yaw-this.lastView.yaw)>.0001||Math.abs(w.pitch-this.lastView.pitch)>.0001)this.followView=false;
  if(this.followView){const desired=this.group.rotation.y+Math.PI,delta=Math.atan2(Math.sin(desired-w.yaw),Math.cos(desired-w.yaw));w.yaw=THREE.MathUtils.damp(w.yaw,w.yaw+delta,2,dt);w.pitch=THREE.MathUtils.lerp(this.entryPitch,.12+this.recline*.16,this.seated);}
  this.lastView={yaw:w.yaw,pitch:w.pitch};
  this.body.visible=this.seated>.74;this.body.position.set(0,0,0);this.body.scale.setScalar(1);
  // The avatar shares the chair's recline, while the head keeps its own view.
  this.body.position.y=(1-this.seated)*.12;
 }
 buildBody(){
  const w=this.world;this.body=new THREE.Group();this.body.name='Player seated in massage chair';this.body.visible=false;this.cradle.add(this.body);
  const shirt=w.mat(0xd8d5cc,.96),pants=w.mat(0x48505b,.97),shoe=w.mat(0x8c8170,.93);
  const soft=(name,size,p,mat)=>{const m=new THREE.Mesh(new RoundedBoxGeometry(...size,3,.025),mat);m.name=name;m.position.set(p[0],p[1]-.43,p[2]);m.castShadow=m.receiveShadow=true;this.body.add(m);return m;};
  soft('Seated shirt',[.32,.39,.17],[0,.80,-.055],shirt).rotation.x=-.17;
  soft('Seated hips',[.32,.16,.23],[0,.57,.15],pants);
  const limb=(a,b,r,mat)=>{a=V(...a);b=V(...b);a.y-=.43;b.y-=.43;const d=b.clone().sub(a),m=new THREE.Mesh(new THREE.CapsuleGeometry(r,Math.max(.01,d.length()-r*2),4,12),mat);m.position.copy(a).lerp(b,.5);m.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());this.body.add(m);};
  for(const sign of [-1,1]){
   limb([sign*.12,.57,.16],[sign*.15,.50,.44],.075,pants);limb([sign*.15,.50,.44],[sign*.15,.245,.66],.058,pants);soft('Foot in massage well',[.11,.075,.18],[sign*.15,.245,.66],shoe);
   limb([sign*.165,.98,-.10],[sign*.265,.86,.04],.044,shirt);limb([sign*.265,.86,.04],[sign*.285,.864,.20],.034,shirt);
   const hand=createInteractionHand(w,this.body,-sign,{name:sign<0?'Right hand on armrest':'Left hand on armrest',grip:.08});hand.position.set(sign*.285,.87-.43,.29);hand.rotation.y=Math.PI;
  }
 }
}
