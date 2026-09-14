import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
const mix=THREE.MathUtils.lerp;
const phase=(t,a,b)=>smooth((t-a)/(b-a));
const durations={opening:1.7,placing:2.4,starting:1.1,cueing:1.8,stopping:1.5};

// Only the lid, record, tonearm and hands move; the amplifier rack stays batched.
export class Turntable{
 constructor(world,rack,m){
  this.root=new THREE.Group();this.root.name='Animated turntable';this.root.userData.dynamic=true;rack.add(this.root);
  const material=(color,r=.55,metal=0)=>world.mat(color,r,metal);
  const steel=m.steel,black=m.black,skin=material(0xc99470,.9),nails=material(0xd7ab8a,.88),sleeve=material(0xd8d5cc,.96);
  const mesh=(geo,mat,x,y,z,parent=this.root)=>{const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=!mat.transparent;o.receiveShadow=true;parent.add(o);return o;};
  const box=(w,h,d,x,y,z,mat,parent=this.root)=>mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);
  const cylinder=(r,h,x,y,z,mat,parent=this.root)=>mesh(new THREE.CylinderGeometry(r,r,h,48),mat,x,y,z,parent);
  const soft=(w,h,d,x,y,z,mat,parent)=>mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.32),mat,x,y,z,parent);
  this.platter=cylinder(.132,.022,-.055,.835,0,steel);
  this.record=new THREE.Group();this.record.name='Spinning vinyl';this.root.add(this.record);world.vinyl=this.record;
  cylinder(.121,.005,0,0,0,black,this.record);cylinder(.027,.006,0,.004,0,material(0xa59770),this.record);
  for(let r=.042;r<.118;r+=.008){const groove=mesh(new THREE.TorusGeometry(r,.0005,3,80),black,0,.003,0,this.record);groove.rotation.x=Math.PI/2;}
  box(.011,.001,.003,.012,.008,.008,m.cream,this.record);box(.017,.001,.002,-.008,.008,-.012,m.walnut,this.record);
  cylinder(.003,.022,-.055,.851,0,steel);
  cylinder(.019,.035,.155,.84,-.107,steel);
  this.arm=new THREE.Group();this.arm.name='Lifting tonearm';this.arm.position.set(.155,.879,-.107);this.root.add(this.arm);
  box(.009,.009,.212,0,0,.095,steel,this.arm);cylinder(.017,.035,0,0,-.03,steel,this.arm).rotation.x=Math.PI/2;
  box(.023,.012,.032,0,-.003,.209,black,this.arm);box(.002,.013,.002,0,-.015,.217,steel,this.arm);
  box(.022,.028,.018,.169,.838,.07,black);
  this.button=cylinder(.011,.007,.207,.829,.143,steel);
  this.light=box(.009,.002,.005,.207,.831,.116,material(0x749671).clone());
  const glass=new THREE.MeshStandardMaterial({color:0xb9d2cd,transparent:true,opacity:.18,roughness:.15,metalness:.03,depthWrite:false,side:THREE.DoubleSide});
  this.lid=new THREE.Group();this.lid.name='Hinged dust cover';this.lid.position.set(0,.823,-.195);this.root.add(this.lid);
  box(.52,.006,.39,0,.18,.195,glass,this.lid);
  for(const x of [-.257,.257])box(.006,.18,.39,x,.09,.195,glass,this.lid);
  for(const z of [0,.39])box(.52,.18,.006,0,.09,z,glass,this.lid);
  for(const x of [-.19,.19])box(.037,.014,.018,x,.823,-.195,steel);
  this.hands=[-1,1].map(side=>{
   const hand=new THREE.Group();hand.name=side<0?'Left hand placing record':'Right hand operating turntable';this.root.add(hand);
   soft(.065,.025,.081,0,0,0,skin,hand);
   // Separate rounded fingers, knuckles and thumbnail read as hands from above.
   for(let i=0;i<4;i++){
    const x=(i-1.5)*.015,length=[.046,.058,.055,.043][i];
    soft(.012,.015,length,x,-.001,-.038-length/2,skin,hand);
    soft(.008,.002,.012,x,.007,-.032-length,nails,hand);
   }
   const thumb=soft(.018,.019,.052,-side*.041,-.002,-.009,skin,hand);thumb.rotation.y=-side*.52;
   soft(.039,.028,.07,0,-.003,.067,skin,hand);soft(.055,.045,.14,0,-.006,.164,sleeve,hand);
   return hand;
  });
  this.reset();
 }
 reset(){this.resolve?.(false);this.resolve=null;this.stage='idle';this.time=0;this.speed=0;this.recordPresent=false;this.buffered=false;this.lid.rotation.x=0;this.arm.rotation.set(-.10,.05,0);this.record.position.set(-.055,.849,0);this.record.rotation.set(0,0,0);this.record.visible=false;this.hands.forEach(h=>h.visible=false);}
 start(){
  this.resolve?.(false);this.completion=new Promise(resolve=>{this.resolve=resolve;});this.buffered=false;
  this.startLid=this.lid.rotation.x;this.enter(this.recordPresent?'starting':'opening');
 }
 ready(){this.buffered=true;return this.completion;}
 stop(){
  this.resolve?.(false);this.resolve=null;this.buffered=false;
  if(this.stage==='idle')return;
  this.stopArm={x:this.arm.rotation.x,y:this.arm.rotation.y};this.enter('stopping');
  if(!this.recordPresent)this.record.visible=false;
 }
 enter(stage){this.stage=stage;this.time=0;}
 get busy(){return !['idle','playing'].includes(this.stage);}
 get label(){return this.stage==='waiting'?'Waiting for music · Stop record':this.busy&&this.stage!=='stopping'?'Preparing record · Stop':'Play the record';}
 hand(index,x,y,z,rotation=0){const h=this.hands[index];h.visible=true;h.position.set(x,y,z);h.rotation.set(0,rotation,0);return h;}
 armHand(amount){
  const target=new THREE.Vector3(0,.035,.19).applyEuler(this.arm.rotation).add(this.arm.position);
  return this.hand(1,mix(.29,target.x,amount),mix(.73,target.y,amount),mix(.41,target.z+.052,amount));
 }
 update(dt,playing=false){
  if(dt<=0)return;this.time+=dt;this.hands.forEach(h=>h.visible=false);
  const t=this.time,d=durations[this.stage];
  let motor=['starting','waiting','cueing'].includes(this.stage)||(this.stage==='playing'&&playing);
  if(this.stage==='opening'){
   const lift=phase(t,.35,1.4);this.lid.rotation.x=mix(this.startLid,-1.28,lift);
   const contact=new THREE.Vector3(.15,.20,.40).applyEuler(this.lid.rotation).add(this.lid.position),reach=phase(t,0,.35)*(1-phase(t,1.4,1.7));
   this.hand(1,mix(.29,contact.x,reach),mix(.72,contact.y,reach),mix(.40,contact.z+.035,reach));
   if(t>=d)this.enter('placing');
  }else if(this.stage==='placing'){
   const carry=phase(t,0,1.8),release=phase(t,1.8,2.4);
   this.record.visible=true;this.record.position.set(mix(.02,-.055,carry),mix(1.15,.849,carry),mix(.40,0,carry));this.record.rotation.x=mix(.16,0,carry);
   for(const [i,side] of [-1,1].entries())this.hand(i,this.record.position.x+side*(.155+release*.08),this.record.position.y+.025-release*.13,this.record.position.z+.06+release*.3,side*.28);
   if(carry===1)this.recordPresent=true;
   if(t>=d)this.enter('starting');
  }else if(this.stage==='starting'){
   const reach=phase(t,0,.45)*(1-phase(t,.68,1.1));this.hand(1,mix(.31,.207,reach),mix(.70,.86,reach),mix(.38,.235,reach));
   this.button.position.y=.829-.003*phase(t,.4,.55)*(1-phase(t,.65,.8));
   motor=t>.5;if(t>=d)this.enter('waiting');
  }else if(this.stage==='waiting'){
   if(this.buffered)this.enter('cueing');
  }else if(this.stage==='cueing'){
   this.arm.rotation.y=mix(.05,-.73,phase(t,.35,1.15));this.arm.rotation.x=mix(-.10,0,phase(t,1.15,1.55));
   this.armHand(phase(t,0,.35)*(1-phase(t,1.55,1.8)));
   if(t>=d){this.enter('playing');this.resolve?.(true);this.resolve=null;}
  }else if(this.stage==='stopping'){
   this.arm.rotation.x=mix(this.stopArm.x,-.10,phase(t,.2,.55));this.arm.rotation.y=mix(this.stopArm.y,.05,phase(t,.6,1.2));
   this.armHand(phase(t,0,.2)*(1-phase(t,1.2,1.5)));motor=t<.55&&this.speed>.1;
   if(t>=d){this.enter('idle');this.speed=0;}
  }
  this.speed=THREE.MathUtils.damp(this.speed,motor?1:0,4,dt);
  if(this.recordPresent)this.record.rotation.y-=dt*this.speed*Math.PI*2*(33+1/3)/60;
  this.platter.rotation.y=this.record.rotation.y;this.light.material.emissive.setHex(motor?0x69975b:0x000000);
 }
}
