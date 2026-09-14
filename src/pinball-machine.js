import * as THREE from 'three';
import {planPoint} from './house-layout.js';
import {PinballGame,PINBALL_BUMPERS} from './pinball-game.js';

// Authored cabinet and simplified playable table, matched to the supplied photos.
export function buildPinballMachine(world,root,m){
 const group=(parent,name,x=0,y=0,z=0)=>{const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;};
 const colored=m.detailColors,tint=(mesh,color)=>{const c=new THREE.Color(color),data=new Float32Array(mesh.geometry.attributes.position.count*3);for(let i=0;i<data.length;i+=3)c.toArray(data,i);mesh.geometry.setAttribute('color',new THREE.BufferAttribute(data,3));return mesh;};
 const B=(g,w,h,d,x,y,z,color)=>typeof color==='number'?tint(world.box(w,h,d,x,y,z,colored,g),color):world.box(w,h,d,x,y,z,color||m.black,g);
 const S=(g,r,x,y,z,color,sx=1,sy=1,sz=1)=>typeof color==='number'?tint(world.sphere(r,x,y,z,colored,g,sx,sy,sz),color):world.sphere(r,x,y,z,color||m.black,g,sx,sy,sz);
 const C=(g,r,h,x,y,z,color=m.steel)=>typeof color==='number'?tint(world.cyl(r,r,h,x,y,z,colored,g,20),color):world.cyl(r,r,h,x,y,z,color,g,20);
 const [x,z]=planPoint(504.75,435),g=group(root,'Stern Deadpool pinball machine',x,.75,z),red=0xb3262c,blue=0x133a66;
 B(g,.66,.30,1.25,0,.83,0,blue);B(g,.75,.72,.19,0,1.47,-.58);B(g,.78,.04,.22,0,1.85,-.58);
 for(const xx of [-.33,.33])for(const zz of [-.56,.55]){const leg=B(g,.035,.72,.035,xx,.38,zz);leg.rotation.x=zz>0?-.10:.10;C(g,.034,.014,xx,.016,zz+Math.sign(zz)*.033);}
 for(const xx of [-.373,.373])B(g,.025,.67,.035,xx,1.47,-.468,red);
 B(g,.41,.27,.022,0,.85,.639);B(g,.27,.17,.01,0,.835,.656);B(g,.04,.055,.009,.13,.905,.66,m.steel);
 const plunger=C(g,.018,.09,.25,.91,.68);plunger.rotation.x=Math.PI/2;S(g,.025,.25,.91,.726,m.steel,1,1,.55);S(g,.023,-.25,.95,.653,0x43a86e,1,1,.45);
 for(const xx of [-.342,.342])S(g,.021,xx,.98,.46,red,.4,1,1);
 const deck=group(g,'Pinball playfield',0,1.075,0);deck.rotation.x=.10;B(deck,.62,.015,1.15,0,0,0,0x152a40);
 for(const xx of [-.335,.335])B(deck,.05,.045,1.32,xx,.006,0);
 for(const zz of [-.635,.625])B(deck,.70,.045,.07,0,.006,zz);
 for(const xx of [-.309,.309])B(deck,.012,.035,1.16,xx,.02,0,m.steel);
 B(deck,.62,.035,.016,0,.025,-.575,m.steel);
 // All table motion is limited to the ball and two flippers.
 for(const [bx,by] of PINBALL_BUMPERS){const zz=(by-1.17)*.47;C(deck,.040,.026,bx*.29,.028,zz,red);C(deck,.027,.009,bx*.29,.047,zz,m.white);S(deck,.01,bx*.29,.057,zz,0xefc64d,1,.25,1);}
 const flippers=[];for(const px of [-.5,.5]){const f=group(deck,'Moving pinball flipper',px*.29,.026,(1.96-1.17)*.47);f.userData.dynamic=true;B(f,.11,.022,.029,.05,0,0,m.white);C(f,.019,.024,0,0,0,red);flippers.push(f);}
 const ball=S(deck,.014,0,.045,0,m.steel);ball.name='Playable pinball';ball.userData.dynamic=true;
 for(const [ax,ay,bx,by] of [[.68,.62,.68,2.32],[-.92,1.42,-.52,1.93],[.67,1.48,.5,1.93]]){const a=new THREE.Vector3(ax*.29,.022,(ay-1.17)*.47),b=new THREE.Vector3(bx*.29,.022,(by-1.17)*.47),delta=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5),rail=B(deck,.014,.024,delta.length(),...mid.toArray(),m.steel);rail.rotation.y=Math.atan2(delta.x,delta.z);}
 // Pop-art side panels and branded backglass share one small procedural atlas.
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#152e49';ctx.fillRect(0,0,1024,1024);
  for(let i=0;i<50;i++){ctx.strokeStyle=i%2?'#2d73a0':'#447e51';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo((i*173)%1024,512);ctx.lineTo((i*281)%1024,0);ctx.stroke();}
  // Mask, crossed swords, lettering and comic bursts read clearly at room distance.
  ctx.strokeStyle='#cad1cd';ctx.lineWidth=15;for(const sign of [-1,1]){ctx.beginPath();ctx.moveTo(512-sign*170,400);ctx.lineTo(512+sign*145,50);ctx.stroke();}
  ctx.fillStyle='#b8242b';ctx.beginPath();ctx.ellipse(512,217,105,145,0,0,Math.PI*2);ctx.fill();
  for(const sign of [-1,1]){ctx.fillStyle='#151a20';ctx.beginPath();ctx.ellipse(512+sign*51,210,40,79,sign*.22,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f2e7cf';ctx.beginPath();ctx.ellipse(512+sign*49,197,27,13,-sign*.20,0,Math.PI*2);ctx.fill();}
  ctx.textAlign='center';ctx.font='900 100px Arial';ctx.strokeStyle='#fff1db';ctx.lineWidth=7;ctx.strokeText('DEADPOOL',512,465);ctx.fillStyle='#b92b2d';ctx.fillText('DEADPOOL',512,465);ctx.font='bold 27px Arial';ctx.fillStyle='#f0dac2';ctx.fillText('STERN • PINBALL',512,502);
  // The wall piece is the red-and-white chicken noodle soup can in the photo.
  ctx.fillStyle='#eee6d3';ctx.fillRect(0,512,512,512);ctx.fillStyle='#b92124';ctx.fillRect(22,538,468,235);ctx.fillStyle='#faf0d9';ctx.font='italic bold 80px Georgia';ctx.fillText("Campbell’s",256,670,440);ctx.font='24px Arial';ctx.fillText('C O N D E N S E D',256,730);ctx.fillStyle='#c9a65f';ctx.beginPath();ctx.arc(256,781,36,0,Math.PI*2);ctx.fill();ctx.fillStyle='#b92124';ctx.font='bold 52px Arial';ctx.fillText('CHICKEN',256,873);ctx.fillText('NOODLE',256,930);ctx.fillStyle='#182027';ctx.font='bold 62px Georgia';ctx.fillText('SOUP',256,993);
  for(const y of [530,1006]){ctx.strokeStyle='#3b4045';ctx.lineWidth=8;ctx.beginPath();ctx.ellipse(256,y,242,15,0,0,Math.PI*2);ctx.stroke();}
  ctx.fillStyle='#243d57';ctx.fillRect(512,512,512,512);ctx.strokeStyle='#477c99';ctx.lineWidth=5;
  for(let i=0;i<14;i++){ctx.beginPath();ctx.moveTo(520+i*35,512);ctx.lineTo(770,960);ctx.stroke();}
  ctx.strokeStyle='#e6bb5d';ctx.lineWidth=6;ctx.strokeRect(535,534,420,441);ctx.strokeRect(964,534,34,460);
  ctx.fillStyle='#be3037';ctx.beginPath();ctx.ellipse(740,811,62,81,0,0,Math.PI*2);ctx.fill();
  for(const sign of [-1,1]){ctx.fillStyle='#121d29';ctx.beginPath();ctx.ellipse(740+sign*30,802,23,47,sign*.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f4e7c5';ctx.beginPath();ctx.ellipse(740+sign*29,797,14,8,0,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#ffe6a6';ctx.font='bold 35px Arial';ctx.fillText('MERC WITH A MOUTH',756,574,397);ctx.font='bold 25px Arial';ctx.fillText('100',646,649);ctx.fillText('100',837,671);ctx.fillText('100',742,734);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const art=new THREE.MeshStandardMaterial({map:texture,roughness:.48});
  const face=(parent,w,h,px,py,pz,uv,yaw=0)=>{const geo=new THREE.PlaneGeometry(w,h),a=geo.attributes.uv;for(let i=0;i<a.count;i++)a.setXY(i,uv[0]+a.getX(i)*uv[2],uv[1]+a.getY(i)*uv[3]);const mesh=new THREE.Mesh(geo,art);mesh.position.set(px,py,pz);mesh.rotation.y=yaw;parent.add(mesh);return mesh;};
  face(g,.68,.45,0,1.59,-.479,[0,.5,1,.5]);face(g,.56,.09,0,.72,.661,[0,.5,1,.5]);
  const playfield=face(deck,.61,1.14,0,.009,0,[.5,0,.5,.5]);playfield.rotation.x=-Math.PI/2;
  for(const sign of [-1,1])face(g,1.17,.30,sign*.331,.86,0,[0,.5,1,.5],sign*Math.PI/2);
  const [wx,wz]=planPoint(519.7,449),artGroup=group(root,'Campbell’s Soup wall artwork',wx,2.89,wz);artGroup.rotation.y=-Math.PI/2;
  B(artGroup,.48,.83,.018,0,0,0,m.white);face(artGroup,.46,.81,0,0,.011,[0,0,.5,.5]);
 }
 // Garfield in blue nightwear, sitting on a wine crate by the front right leg.
 const [gx,gz]=planPoint(511,470.5),cat=group(root,'Garfield statue in blue pajamas',gx,.75,gz);B(cat,.46,.15,.36,0,.075,0,m.oak);
 for(const yy of [.03,.12])B(cat,.43,.008,.008,0,yy,.183,m.walnut);
 const orange=0xef931f,night=0x7496b7,yellow=0xf4bc30;
 S(cat,.18,0,.41,0,night,1.03,1.23,.75);S(cat,.19,0,.66,0,orange,1.12,.87,.72);
 for(const sign of [-1,1]){S(cat,.055,sign*.17,.45,.01,night,.55,1.7,1);S(cat,.082,sign*.092,.19,.10,m.white,1,.72,1.3);for(const xx of [-.022,.022]){S(cat,.026,sign*.092+xx,.28,.09,m.white,.65,1.7,.55);S(cat,.014,sign*.092+xx,.285,.108,0xe59c98,.6,1.8,.3);}S(cat,.041,sign*.059,.64,.119,orange,1,1.5,.3);S(cat,.05,sign*.047,.596,.139,yellow,1.25,.55,.5);B(cat,.06,.006,.005,sign*.056,.64,.142,m.black);for(let j=0;j<3;j++)B(cat,.006,.031,.005,sign*(.148+j*.012),.656,.107,m.black).rotation.z=sign*.22;}
 S(cat,.019,0,.603,.164,0xd9717c,1,.8,.6);S(cat,.205,0,.789,-.01,night,1,.65,.73);S(cat,.082,-.168,.783,-.002,night,.67,1.55,.8);S(cat,.035,-.202,.696,.005,m.white);
 world.pinballGame=new PinballGame(g,{ball,flippers});world.pinballDetails={machine:g,garfield:cat,deck};
 world.colliders.push({x,z,w:.77,d:1.35,label:g.name});world.colliders.push({x:gx,z:gz,w:.46,d:.37,label:cat.name});g.updateWorldMatrix(true,true);
 world.houseInteractions.add({id:'pinball-machine',pos:g.localToWorld(new THREE.Vector3(0,1.085,.68)),range:2.1,surfaceOffset:.1,touchRadius:.24,label:()=> 'Play pinball',activate:()=>world.onPinballPlay?.()});
}
