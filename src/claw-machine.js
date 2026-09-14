import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {planPoint} from './house-layout.js';
import {ClawGame} from './claw-game.js';
import {batchObject} from './movable-furniture.js';

export function buildClawMachine(world,root,m){
 const g=new THREE.Group(),[x,z]=planPoint(436,465);g.position.set(x,.75,z);g.rotation.y=Math.PI/2;g.name='Claw and capsule machine beside bathroom';root.add(g);const prizes=[];
 const silver=world.mat(0xb1b4bd,.29,.7),white=world.mat(0xdbe0e5,.38),blue=world.mat(0x405c9f,.45),black=m.black;
 const led=new THREE.MeshStandardMaterial({color:0x9ddaff,emissive:0x4da6e8,emissiveIntensity:.75});
 const mint=new THREE.MeshStandardMaterial({color:0xc0eece,emissive:0x74b89b,emissiveIntensity:.55});
 const glass=new THREE.MeshStandardMaterial({color:0xaeced7,transparent:true,opacity:.095,roughness:.12,depthWrite:false});
 const box=(w,h,d,x,y,z,mat=white)=>world.box(w,h,d,x,y,z,mat,g);
 const ball=(r,x,y,z,mat,sx=1,sy=1,sz=1)=>world.sphere(r,x,y,z,mat,g,sx,sy,sz);
 const cyl=(r,h,x,y,z,mat=silver)=>world.cyl(r,r,h,x,y,z,mat,g,20);
 const soft=(w,h,d,x,y,z,mat)=>{const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,.018),mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);};
 soft(.84,.07,.76,0,.045,.03,silver);for(const xx of [-.32,.32])for(const zz of [-.23,.23])ball(.025,xx,.018,zz,black,1,1,.6);
 soft(.73,.27,.61,0,.205,0,white);soft(.78,.18,.63,0,.985,0,white);
 for(const [bottom,height,width,light] of [[.345,.55,.73,mint],[1.08,.69,.85,led]]){
  box(width,.025,.62,0,bottom,0,silver);box(width,.025,.62,0,bottom+height,0,silver);
  box(width-.045,height,.015,0,bottom+height/2,-.292,white);
  for(const xx of [-width/2+.018,width/2-.018]){box(.02,height,.61,xx,bottom+height/2,0,glass);for(const zz of [-.292,.292])box(.026,height,.026,xx,bottom+height/2,zz,light);}
  box(width-.05,height-.025,.005,0,bottom+height/2,.314,glass);
  for(const xx of [-width*.45,width*.45])box(.023,.043,.03,xx,bottom+height*.60,.33,silver);
  const colors=[0xd59a42,0xe6cf9d,0x87b93d,0xcde0de,0x9674af,0x9c633b,0xc65453];
  for(let i=0;i<29;i++){const xx=Math.sin(i*2.399)*(width*.37),zz=.015+Math.cos(i*2.399)*.205,y=bottom+.065+(i%4)*.045,r=.046+(i%3)*.007,mat=world.mat(colors[i%colors.length],.96);
   if(bottom>1&&i<12){const toy=new THREE.Group();toy.position.set(xx,y,zz);g.add(toy);world.sphere(r,0,0,0,mat,toy,1.1,.88,1);for(const dx of [-r*.65,r*.65])world.sphere(r*.35,dx,r*.60,0,mat,toy);for(const dx of [-.017,.017])world.sphere(.007,dx,.003,r*.91,black,toy,.8,1,.4);batchObject(toy);prizes.push({group:toy,start:toy.position.clone(),won:false});continue;}
   ball(r,xx,y,zz,mat,1.1,.88,1);if(i%3===0){for(const dx of [-r*.65,r*.65])ball(r*.35,xx+dx,y+r*.60,zz,mat);}
   if(zz>.06){for(const dx of [-.017,.017])ball(.007,xx+dx,y+.003,zz+r*.91,black,.8,1,.4);}
  }
 }
 // Working gantry and gripper. The second head parks at the back-right.
 for(const zz of [-.23,.23])cyl(.009,.76,0,1.70,zz).rotation.z=Math.PI/2;
 box(.12,.06,.11,.34,1.65,-.21,silver);cyl(.004,.18,.34,1.53,-.21);cyl(.024,.06,.34,1.42,-.21);
 const claw=new THREE.Group();claw.userData.dynamic=true;g.add(claw);world.cyl(.025,.025,.065,0,0,0,silver,claw,16);
 const fingers=[];for(let i=0;i<3;i++){const a=i*Math.PI*2/3,curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.022,0),new THREE.Vector3(Math.cos(a)*.064,-.072,Math.sin(a)*.064),new THREE.Vector3(Math.cos(a)*.045,-.135,Math.sin(a)*.045)]),finger=new THREE.Mesh(new THREE.TubeGeometry(curve,10,.004,6,false),silver);claw.add(finger);fingers.push(finger);}
 const cable=cyl(.003,1,0,1.6,0);cable.userData.dynamic=true;
 world.clawGame=new ClawGame(g,claw,cable,fingers,prizes);
 // Two joysticks, illuminated buttons and coin slots on the projecting deck.
 soft(.92,.105,.23,0,1.052,.35,silver);box(.86,.008,.18,0,1.109,.36,black);
 for(const xx of [-.34,.24]){cyl(.022,.065,xx,1.14,.38);ball(.026,xx,1.18,.38,glass);}
 for(const [xx,color] of [[-.20,0x6575ec],[.36,0x80bd83]]){const button=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.45});ball(.041,xx,1.127,.38,button,1,.44,1);}
 for(const xx of [-.072,.072]){box(.11,.23,.055,xx,.91,.353,silver);const coin=cyl(.029,.009,xx,.96,.387);coin.rotation.x=Math.PI/2;box(.006,.036,.009,xx,.96,.394,black);box(.035,.016,.009,xx,.867,.385,black);}
 const dial=cyl(.068,.025,.08,.19,.328,white);dial.rotation.x=Math.PI/2;box(.08,.025,.03,.08,.19,.35,silver).rotation.z=.5;
 for(const xx of [-.23,.25]){box(.16,.13,.012,xx,.24,.315,led);box(.127,.096,.018,xx,.24,.327,blue);}
 // Two small plush mascots on the roof.
 for(const [xx,color] of [[-.08,0x8c6baf],[.12,0xc8a835]]){const mat=world.mat(color,.96);ball(.059,xx,1.84,-.04,mat,1,1,.8);for(const dx of [-.018,.018])ball(.008,xx+dx,1.853,.007,black,.8,1,.4);}
 if(typeof document!=='undefined'){
  const label=(text,w,h,y,z)=>{const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#486092';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#edf3ee';ctx.font='bold 70px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,68,990);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:texture,roughness:.5}));face.position.set(0,y,z);g.add(face);};
  label('CAPSULE TOYS',.50,.064,.13,.339);label('Already here? Give it a twist!',.74,.040,1.105,.320);
 }
 world.colliders.push({x,z,w:.94,d:.89,angle:g.rotation.y,label:g.name});g.updateWorldMatrix(true,true);
 world.houseInteractions.add({id:'claw-machine',pos:g.localToWorld(new THREE.Vector3(0,1.12,.42)),range:2.1,surfaceOffset:.12,touchRadius:.27,label:()=> 'Play the claw machine',activate:()=>world.onClawPlay?.()});
}
