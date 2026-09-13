import * as THREE from 'three';
import {planPoint} from './house-layout.js';
import {FEEDER_PLAN} from './home-furnishings.js';
import {OLIVE_PLAN,updateOliveBreeze} from './olive-tree.js';

export class BalconyLife{
 constructor(world){
  this.time=0;this.world=world;this.root=new THREE.Group();this.root.name='Sunbirds circling the olive tree and drinking nectar';world.scene.add(this.root);
  const [x,z]=planPoint(...FEEDER_PLAN),[tx,tz]=planPoint(...OLIVE_PLAN);this.perch=new THREE.Vector3(x-.13,2.405,z);this.tree=new THREE.Vector3(tx,1.9,tz);
  this.birds=Array.from({length:4},(_,i)=>this.createBird(i));
  this.path=new THREE.CatmullRomCurve3([this.perch.clone(),this.perch.clone().add(new THREE.Vector3(-.5,.1,-.1)),new THREE.Vector3(tx-.55,2.35,tz+.65),new THREE.Vector3(tx-.85,1.85,tz-.6),new THREE.Vector3(tx-.28,2.48,tz-.7),new THREE.Vector3(tx+.35,2.32,tz),new THREE.Vector3(tx-.4,1.75,tz+.5),this.perch.clone().add(new THREE.Vector3(-.6,.08,-.35)),this.perch.clone()],false,'catmullrom',.4);
 }
 createBird(index){
  const world=this.world,body=new THREE.Group();body.name='Sunbird '+(index+1);this.root.add(body);
  const plumage=world.mat(0x111820,.55,.12),yellow=world.mat(0xf4cf43,.75),throat=world.mat(0x131c29,.3,.3),black=world.mat(0x090d10,.6);
  world.sphere(.055,0,.025,0,plumage,body,.68,1.1,1.35);world.sphere(.042,0,.012,.021,yellow,body,.70,1.2,1.25);
  const head=new THREE.Group();head.position.set(0,.078,.038);body.add(head);world.sphere(.033,0,0,0,plumage,head);world.sphere(.025,0,-.017,.02,throat,head,1,.8,.75);
  for(const side of [-1,1])world.sphere(.0045,side*.026,.007,.014,black,head);
  const beak=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.001,.025),new THREE.Vector3(0,-.004,.056),new THREE.Vector3(0,-.019,.074)]);head.add(new THREE.Mesh(new THREE.TubeGeometry(beak,10,.003,5,false),black));
  const wings=[];for(const s of [-1,1]){const pivot=new THREE.Group();pivot.position.set(s*.035,.036,-.005);body.add(pivot);const wing=world.sphere(.065,s*.036,0,-.025,plumage,pivot,1,.10,.57);wing.rotation.y=s*.35;wings.push(pivot);world.cyl(.002,.002,.032,s*.015,-.042,0,black,body,6);}
  const tail=world.sphere(.07,0,.016,-.092,plumage,body,.22,.07,1);tail.rotation.x=.2;return{body,head,wings};
 }
 update(dt,hours,motion=true){
  this.time+=dt;updateOliveBreeze(this.world,this.time,motion);const h=((hours%24)+24)%24;this.root.visible=h>6&&h<19.1;if(!this.root.visible)return;
  this.birds.forEach(({body,head,wings},i)=>{
   const t=(this.time+i*7.5)%30,feeding=t<5.2,perched=t>=12&&t<16;
   if(!motion){body.position.copy(i===0?this.perch:this.tree.clone().add(new THREE.Vector3((i-2)*.25,.17*i,.12)));body.rotation.set(0,Math.PI/2,0);wings.forEach(w=>w.rotation.z=0);head.rotation.x=0;return;}
   if(feeding){body.position.copy(this.perch);body.rotation.set(0,Math.PI/2,0);head.rotation.x=Math.max(0,Math.sin(t*3.1))*.85;}
   else{
    // Pause briefly among the branches, then continuously return to the jar.
    const flightT=t<12?(t-5.2)/20.8:t<16?6.8/20.8:(t-9.2)/20.8;
    const p=this.path.getPoint(Math.min(1,flightT)),d=this.path.getTangent(Math.min(.999,flightT));body.position.copy(p);body.rotation.set(-Math.atan2(d.y,Math.hypot(d.x,d.z))*.3,Math.atan2(d.x,d.z),perched?0:Math.sin(t*2)*.15);head.rotation.x=perched?Math.sin(t*2)*.15:0;
   }
   const flying=!feeding&&!perched;wings.forEach((w,j)=>w.rotation.z=flying?Math.sin(t*105+i)*(j?1:-1)*1.05:0);body.position.y+=flying?Math.sin(t*14)*.009:Math.sin(t*4)*.002;
  });
 }
}
