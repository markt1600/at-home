import * as THREE from 'three';

// The visible forms come from the balcony photographs. Distances and hidden
// elevations are estimates; occupants are fictional, with no identifying data.
export class Neighborhood {
 constructor(world,random=Math.random){
  this.world=world;this.random=random;this.time=0;this.root=new THREE.Group();this.root.name='Balcony skyline';world.scene.add(this.root);
  const materials={stone:0xc1c5c0,white:0xe1e4df,glass:0x627d91,trim:0x97acb2,dark:0x303c42,cream:0xc6c4b5,green:0x557852,roof:0x987b63};
  this.batches=new Map();this.materials={};this.balconies=[];
  for(const [key,color] of Object.entries(materials))this.materials[key]=new THREE.MeshStandardMaterial({color,roughness:key==='glass'?.28:.85,metalness:key==='glass'?.12:0});
  this.boxGeometry=new THREE.BoxGeometry(1,1,1);this.crownGeometry=new THREE.IcosahedronGeometry(1,1);this.matrix=new THREE.Matrix4();
  const tower=(x,z,yaw,white=false)=>{const g=new THREE.Group();g.position.set(x,-52,z);g.rotation.y=yaw;this.root.add(g);white?this.whiteTower(g):this.glassTower(g);};
  tower(-67,-6,Math.PI/2);tower(-89,45,Math.PI*.58);
  // One shared white residential complex is visible around the blue towers
  // from the balcony, then through the cinema bay and bedroom north window.
  const curved=new THREE.Group();curved.name='Shared curved white residential complex';curved.position.set(-41,-52,-61);curved.rotation.y=.10;this.root.add(curved);
  this.whiteTower(curved);const rearWing=new THREE.Group();rearWing.position.set(-15,0,-16);rearWing.scale.set(.72,.84,.85);curved.add(rearWing);this.whiteTower(rearWing);
  const ground=new THREE.Group();ground.position.y=-52;this.root.add(ground);this.part(ground,'green',[170,.3,190],[-85,-.4,0]);
  for(let i=0;i<170;i++){const a=i*2.399,r=16+(i%13)*3.2;this.part(ground,'green',[2.8+i%3,3,3.6],[-57+Math.cos(a)*r,2+ i%3,Math.sin(a)*r],'crown',.78+(i%5)*.075);}
  for(let i=0;i<18;i++){const h=18+i%7*3,g=new THREE.Group();g.position.set(-132+(i%3)*5,0,-85+i*10);ground.add(g);this.part(g,'cream',[6,h,7],[0,h/2,0]);for(let f=1;f<h/3;f++)this.part(g,'dark',[6.02,.9,7.02],[0,f*3,0]);}
  this.bedroomOutlook();this.flush();this.root.updateMatrixWorld(true);
  this.frustum=new THREE.Frustum();this.projection=new THREE.Matrix4();this.sphere=new THREE.Sphere();
  this.people=Array.from({length:7},(_,i)=>this.person(i));
  const choices=this.balconies.filter(b=>Math.abs(b.position.y)<8);
  this.people.forEach((p,i)=>this.place(p,choices[Math.floor((i+.5)*choices.length/7)],i%4));
 }
 bedroomOutlook(){
  // North-facing bedroom photographs: a close curved white tower on the left,
  // low-rise roofs and trees below, and a more distant residential skyline.
  const g=new THREE.Group();g.name='Main bedroom neighborhood';g.position.y=-52;this.root.add(g);
  this.part(g,'green',[185,.4,155],[17,-.7,-105]);
  for(let i=0;i<34;i++){
   const x=-5+(i%8)*10.5+(Math.floor(i/8)%2)*3,z=-57-Math.floor(i/8)*17,h=i%3===0?14:5+i%3*2;
   const home=new THREE.Group();home.position.set(x,0,z);g.add(home);
   this.part(home,'cream',[7.5,h,10],[0,h/2,0]);
   if(i%3===0){for(let y=0;y<=h;y+=2.8){this.part(home,'white',[1.45,1,2.9],[0,y,1.2],'slab');this.part(home,'white',[1.45,.75,2.9],[0,y+.65,1.2],'rail');this.part(home,'dark',[6.2,1.6,.12],[0,y+1.6,1.5]);}this.part(home,'white',[7.9,.28,10.3],[0,h-.5,0]);}
   else{this.part(home,'roof',[8.2,.45,10.7],[0,h+.2,0]);this.part(home,'roof',[6.8,.6,8.9],[0,h+.62,0]);this.part(home,'roof',[5.2,.5,6.8],[0,h+1.10,0]);}
   for(let floor=0;floor<Math.floor(h/2.8);floor++)for(let c=0;c<3;c++)this.part(home,'dark',[1.1,1.3,.06],[-2.5+c*2.5,1.7+floor*2.8,5.03]);
  }
  for(let i=0;i<180;i++){const x=-15+(i*17.731%105),z=-40-(i*11.37%94),s=2.8+i%5*.55;this.part(g,'green',[s,s*.8,s],[x,3.8+i%4,z],'crown',.8+(i%7)*.055);}
  for(let i=0;i<8;i++){const x=-11+i*12,z=-113-(i%2)*9,h=21+i%3*4;this.part(g,'cream',[10,h,10],[x,h/2,z]);for(let y=2;y<h;y+=2.8){this.part(g,'white',[10.3,.3,10.3],[x,y,z]);for(let c=0;c<5;c++)this.part(g,'glass',[1.25,1.9,.06],[x-4+c*2,y+1.2,z+5.03]);}}
  for(let i=0;i<18;i++){
   const x=-50+i*7.8,z=-146-(i%3)*12,h=43+(i*13%36),w=5.7+i%3*1.1;
   this.part(g,'cream',[w,h,8],[x,h/2,z]);this.part(g,'white',[w+.35,.65,8.4],[x,h,z]);
   for(let y=2;y<h-2;y+=2.7){this.part(g,'white',[w+.12,.22,8.1],[x,y,z]);for(let c=0;c<3;c++)this.part(g,'glass',[w/4,1.85,.08],[x-w*.32+c*w*.32,y+1.15,z+4.04]);}
   if(i%4===1)this.part(g,'roof',[.8,h,.12],[x+w*.40,h/2,z+4.12]);
   for(const dx of [-w/2,w/2])this.part(g,'white',[.18,h,.15],[x+dx,h/2,z+4.13]);
  }
  for(const [x,z,h] of [[17,-153,84],[38,-171,78]]){this.part(g,'roof',[.35,h,.35],[x,h/2,z]);this.part(g,'roof',[22,.32,.5],[x+5,h,z]);this.part(g,'roof',[.09,8,.09],[x+12,h-4,z]);for(let i=0;i<9;i++)this.part(g,'roof',[.12,.8,.6],[x-5+i*2.5,h+.4,z]);}
 }
 part(parent,key,size,position,shape='box',tint=1){
  parent.updateWorldMatrix(true,false);const local=new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion(),new THREE.Vector3(...size));
  const id=key+'-'+shape;if(!this.batches.has(id))this.batches.set(id,{key,shape,items:[]});this.batches.get(id).items.push({matrix:parent.matrixWorld.clone().multiply(local),tint});
 }
 flush(){for(const {key,shape,items} of this.batches.values()){const mesh=new THREE.InstancedMesh(shape==='crown'?this.crownGeometry:shape==='slab'?this.slabGeometry:shape==='rail'?this.railGeometry:this.boxGeometry,this.materials[key],items.length);items.forEach((o,i)=>{mesh.setMatrixAt(i,o.matrix);mesh.setColorAt(i,new THREE.Color().setScalar(o.tint));});mesh.receiveShadow=false;mesh.castShadow=false;mesh.computeBoundingSphere();this.root.add(mesh);}this.batches.clear();}
 balcony(g,x,y,z,width,kind='glass'){g.updateWorldMatrix(true,false);this.balconies.push({position:new THREE.Vector3(x,y,z).applyMatrix4(g.matrixWorld),yaw:new THREE.Euler().setFromRotationMatrix(g.matrixWorld,'YXZ').y,width,kind,scale:g.getWorldScale(new THREE.Vector3())});}
 glassTower(root){
  for(const side of [-1,1]){const wing=new THREE.Group();wing.position.x=side*9.6;wing.rotation.y=side*-.13;root.add(wing);
   this.part(wing,'stone',[18.9,94,12],[0,47,-6.5]);
   for(let floor=0;floor<30;floor++){const y=floor*3.1;
    this.part(wing,'trim',[19.2,.19,14],[0,y,-5.3]);this.part(wing,'cream',[8.3,2.72,.16],[.6,y+1.55,-.02]);
    this.part(wing,'glass',[19.1,.84,.09],[0,y+.65,1.78], 'box',.85+floor%4*.055);
    for(const h of [.24,1.08])this.part(wing,'trim',[19.2,.05,.12],[0,y+h,1.83]);
    for(let col=0;col<17;col++){const x=-8.9+col*1.11;
     this.part(wing,'trim',[.047,3.05,.08],[x,y+1.6,1.81]);
     if(col<5||col>12)this.part(wing,'glass',[1.06,2.12,.075],[x+.53,y+2.12,1.78],'box',.82+((floor*7+col*3)%9)*.033);
     else{this.part(wing,'dark',[.52,1.92,.045],[x+.37,y+1.86,.08]);this.part(wing,'trim',[.027,2.0,.05],[x+.38,y+1.86,.115]);}
    }
    for(let col=0;col<3;col++){const x=-3+col*3.3;this.part(wing,'cream',[.10,2.9,1.77],[x-1.45,y+1.6,.87]);if(floor>12&&floor<21)this.balcony(wing,x,y+.1,1.06,2.4);}
    if(floor%3===1){this.part(wing,'green',[.65,.38,.35],[2.1,y+1.18,1.44],'crown');this.part(wing,'cream',[.76,.23,.4],[2.1,y+.93,1.44]);}
   }
   // Open rooftop service crown and the narrow curtain-wall grid on the sides.
   for(let i=0;i<8;i++)this.part(wing,'trim',[19.15,.17,12],[0,94+i*.43,-4.7]);
   for(let i=0;i<13;i++)this.part(wing,'trim',[.1,4,12],[-9.4+i*1.56,95.6,-4.7]);
   for(const sideX of [-9.46,9.46]){this.part(wing,'glass',[.055,93,11],[sideX,46.5,-5.4]);for(let y=0;y<94;y+=3.1)this.part(wing,'trim',[.12,.075,11.1],[sideX,y,-5.4]);}
  }
 }
 whiteTower(root){
  const slab=new THREE.Shape();slab.moveTo(-2.8,-1.25);slab.lineTo(2.8,-1.25);slab.lineTo(2.8,0);slab.absellipse(0,0,2.8,1.45,0,Math.PI,false,0);slab.closePath();
  this.slabGeometry=new THREE.ExtrudeGeometry(slab,{depth:.22,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.075,bevelThickness:.05,curveSegments:18});this.slabGeometry.rotateX(Math.PI/2);this.slabGeometry.translate(0,.22,0);
  const rail=new THREE.Shape();for(let i=0;i<=36;i++){const a=i/36*Math.PI,x=Math.cos(a)*2.8,z=Math.sin(a)*1.45;i?rail.lineTo(x,z):rail.moveTo(x,z);}for(let i=36;i>=0;i--){const a=i/36*Math.PI;rail.lineTo(Math.cos(a)*2.63,Math.sin(a)*1.28);}rail.closePath();
  this.railGeometry=new THREE.ExtrudeGeometry(rail,{depth:.48,bevelEnabled:false,curveSegments:18});this.railGeometry.rotateX(Math.PI/2);this.railGeometry.translate(0,.48,0);
  this.part(root,'white',[27,93,10],[0,46.5,-6]);
  for(let floor=0;floor<29;floor++){const y=floor*3.1;
   for(let col=0;col<4;col++){const x=-9.7+col*6.45;this.part(root,'dark',[5.1,2.48,.06],[x,y+1.4,-.98]);
    this.part(root,'white',[1,1,1],[x,y,0],'slab');this.part(root,'white',[1,1,1],[x,y+.68,0],'rail');
    for(const dx of [-1.75,0,1.75])this.part(root,'trim',[.07,2.48,.08],[x+dx,y+1.4,-.9]);
    if((col+floor)%3===0){this.part(root,'green',[.7,.4,.4],[x+1.1,y+1.24,.05],'crown');this.part(root,'cream',[.8,.24,.4],[x+1.1,y+.92,.05]);}
    if(floor>12&&floor<21)this.balcony(root,x,y+.25,-.25,3.3,'white');
   }
  }
  for(const x of [-6.45,6.45])this.part(root,'white',[1.15,98,3],[x,49,-1.5]);
 }
 person(index){
  const root=new THREE.Group();root.name='Neighbor '+['walking','waving','coffee','stretching'][index%4];this.root.add(root);
  const skin=this.world.mat([0xb78563,0xd8b299,0x956e56][index%3]),shirt=this.world.mat([0xcd8960,0x799b9c,0xd4c99e,0x72846d][index%4]),pants=this.world.mat(0x464b54),hair=this.world.mat(0x40352e);
  const ell=(p,r,x,y,z,m,s)=>this.world.sphere(r,x,y,z,m,p,...s);
  ell(root,.23,0,1.15,0,shirt,[.91,1.45,.59]);ell(root,.14,0,1.59,0,skin,[.84,1.08,.87]);ell(root,.14,0,1.65,-.017,hair,[.86,.72,.88]);
  const arms=[],legs=[];for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.22,1.37,0);root.add(arm);ell(arm,.08,0,-.16,0,shirt,[.83,2.05,.83]);ell(arm,.065,0,-.39,0,skin,[.7,1.75,.7]);arms.push(arm);const leg=new THREE.Group();leg.position.set(side*.09,.89,0);root.add(leg);ell(leg,.083,0,-.38,0,pants,[.91,4.45,1]);ell(leg,.09,0,-.81,.045,pants,[.85,.55,1.65]);legs.push(leg);}
  const mug=this.world.cyl(.048,.041,.11,0,-.48,.055,this.world.mat(0xf1e6cc),arms[1],12);
  const person={root,arms,legs,mug,index,phase:this.random()*10,age:0,refresh:24+this.random()*35,slot:null,activity:index%4};return person;
 }
 place(p,slot,activity){if(!slot)return;p.slot=slot;p.root.position.copy(slot.position);p.root.rotation.set(0,slot.yaw,0);p.activity=activity;p.age=0;p.refresh=28+this.random()*40;p.mug.visible=activity===2;}
 update(dt,hours,motion=true){
  this.time+=dt;this.world.camera.updateMatrixWorld();this.projection.multiplyMatrices(this.world.camera.projectionMatrix,this.world.camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.projection);
  const h=(hours%24+24)%24,day=h>6&&h<21;
  const visible=slot=>this.frustum.intersectsSphere(this.sphere.set(slot.position.clone().add(new THREE.Vector3(0,1,0)),2.8));
  for(const p of this.people){p.root.visible=day;if(!day)continue;p.age+=dt;
   // A generous frustum margin prevents visible relocation at screen edges.
   if(p.age>p.refresh&&!visible(p.slot)){const occupied=new Set(this.people.map(n=>n.slot));const choices=this.balconies.filter(b=>!occupied.has(b)&&!visible(b)&&Math.abs(b.position.y)<10);if(choices.length)this.place(p,choices[Math.floor(this.random()*choices.length)],Math.floor(this.random()*4));}
   p.root.position.copy(p.slot.position);p.root.rotation.set(0,p.slot.yaw,0);p.arms.forEach(a=>a.rotation.set(0,0,0));p.legs.forEach(a=>a.rotation.x=0);
   if(!motion)continue;const t=this.time+p.phase;
   if(p.activity===0){const travel=Math.sin(t*.45),offset=travel*p.slot.width*.32;p.root.position.add(new THREE.Vector3(offset,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),p.slot.yaw));p.root.rotation.y+=Math.cos(t*.45)>0?Math.PI/2:-Math.PI/2;p.legs.forEach((a,i)=>a.rotation.x=Math.sin(t*4.5)*(i?-.35:.35));p.arms.forEach((a,i)=>a.rotation.x=Math.sin(t*4.5)*(i?.3:-.3));}
   if(p.activity===1){p.arms[1].rotation.z=2.5+Math.sin(t*3)*.32;p.root.rotation.y+=Math.sin(t*.4)*.08;}
   if(p.activity===2){p.arms[1].rotation.x=-1.05-Math.max(0,Math.sin(t*.48))*.57;p.arms[1].rotation.z=-.16;}
   if(p.activity===3){const stretch=(Math.sin(t*.6)+1)*.5;p.arms[0].rotation.z=-.3-stretch*2.2;p.arms[1].rotation.z=.3+stretch*2.2;p.root.rotation.z=Math.sin(t*.6)*.075;}
  }
 }
}
