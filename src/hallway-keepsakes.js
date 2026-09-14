import * as THREE from 'three';
import {planPoint} from './house-layout.js';

const PRETZ_COLORS=['#d75819','#d0a13e','#bd2928','#9aa337','#2492b1','#12614c','#d56525','#815739'];

// One small atlas carries the labels and individual crystal highlights. Thousands
// of jewels do not need thousands of meshes or a downloaded photograph.
function pretzMaterial(){
 const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.36,metalness:.24});
 if(typeof document==='undefined')return material;
 const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=512;
 const ctx=canvas.getContext('2d');
 for(let i=0;i<8;i++){
  const x=i*256;ctx.save();ctx.translate(x,0);ctx.fillStyle=PRETZ_COLORS[i];ctx.fillRect(0,0,256,512);
  ctx.strokeStyle='#ecd297';ctx.lineWidth=8;ctx.strokeRect(6,6,244,500);
  // Biscuit sticks, flavour illustrations and the tilted brand ribbon.
  ctx.save();ctx.translate(125,280);ctx.rotate(.29);
  for(const dx of [-53,-24,8,37]){ctx.fillStyle='#e5b456';ctx.fillRect(dx,-244,13,422);ctx.fillStyle='#8f622a';ctx.fillRect(dx+9,-240,3,413);}ctx.restore();
  ctx.fillStyle=i===5?'#e2b059':'#eee0b2';ctx.beginPath();ctx.ellipse(133,391,88,41,-.1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=['#d5ad8a','#76c4b9','#aa3124','#c5af73','#f3c530','#c34229','#be3045','#b48c53'][i];ctx.beginPath();ctx.ellipse(133,386,65,29,-.1,0,Math.PI*2);ctx.fill();
  for(let j=0;j<21;j++){ctx.fillStyle=j%3?'#f0c45c':'#56724c';ctx.beginPath();ctx.arc(86+(j*31%95),366+(j*19%35),4,0,Math.PI*2);ctx.fill();}
  ctx.save();ctx.translate(127,198);ctx.rotate(-.07);ctx.fillStyle='#f2e8d1';ctx.fillRect(-116,-61,232,110);ctx.strokeStyle='#463123';ctx.lineWidth=4;ctx.strokeRect(-116,-61,232,110);
  ctx.fillStyle=i===2||i===6?'#a21b23':'#172527';ctx.font='900 67px Impact, Arial Black, sans-serif';ctx.textAlign='center';ctx.fillText('PRETZ',0,22,216);ctx.restore();
  ctx.fillStyle='#f9e9bd';ctx.font='bold 22px Arial';ctx.textAlign='center';ctx.fillText(['ORIGINAL','BUTTER','MALA','SOUR CREAM','SWEET CORN','PIZZA','GOURMAND','ROAST'][i],128,293,228);
  ctx.restore();
 }
 const base=ctx.getImageData(0,0,2048,512).data;
 const relief=document.createElement('canvas');relief.width=2048;relief.height=512;const bump=relief.getContext('2d');bump.fillStyle='#333';bump.fillRect(0,0,2048,512);
 for(let y=4,row=0;y<512;y+=7,row++)for(let x=4+(row%2)*3.5;x<2048;x+=7){
  const p=(Math.floor(y)*2048+Math.floor(x))*4,r=base[p],g=base[p+1],b=base[p+2];
  ctx.fillStyle=`rgb(${Math.round(r*.70)},${Math.round(g*.70)},${Math.round(b*.70)})`;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=`rgba(255,245,213,${.24+((Math.floor(x)*7+row*13)%9)*.045})`;ctx.beginPath();ctx.arc(x-.8,y-.9,1.3,0,Math.PI*2);ctx.fill();
  bump.fillStyle='#dadada';bump.beginPath();bump.arc(x,y,2.5,0,Math.PI*2);bump.fill();
 }
 material.map=new THREE.CanvasTexture(canvas);material.map.colorSpace=THREE.SRGBColorSpace;material.map.anisotropy=4;
 material.bumpMap=new THREE.CanvasTexture(relief);material.bumpScale=.0007;
 return material;
}

export function buildJeweledPretz(world,window){
 const g=new THREE.Group();g.name='Eight jeweled Pretz boxes';window.add(g);
 const material=pretzMaterial();
 for(let i=0;i<8;i++){
  const h=i===0?.174:i===7?.143:.16,w=i===0?.069:.062;
  const box=world.box(w,h,.024,-.114+i*.067,-.328+h/2,.052,material,g);box.name='Jeweled PRETZ '+(i+1);
  const uv=box.geometry.attributes.uv;
  for(let j=0;j<uv.count;j++)uv.setXY(j,(i+(uv.getX(j)*.968+.016))/8,uv.getY(j)*.984+.008);
 }
 world.hallwayPretz=g;return g;
}

export function buildFishMooncake(world,root,m){
 const g=new THREE.Group(),[x,z]=planPoint(572.5,718);g.name='Fish and mooncake sculpture on white pedestal';g.position.set(x,.45,z-.30);g.rotation.y=Math.PI;root.add(g);
 const colors=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.4,metalness:.06,side:THREE.DoubleSide});
 const white=0xf5f1e7,yellow=0xe7b817,orange=0xeb7b15,green=0x276633,gold=0xba7c36,ink=0x202022;
 const mesh=(geo,color,parent=g)=>{
  const p=geo.attributes.position,data=new Float32Array(p.count*3),c=new THREE.Color();
  for(let i=0;i<p.count;i++){c.setHex(typeof color==='function'?color(p.getX(i),p.getY(i),p.getZ(i)):color);c.toArray(data,i*3);}
  geo.setAttribute('color',new THREE.BufferAttribute(data,3));const o=new THREE.Mesh(geo,colors);o.castShadow=o.receiveShadow=true;parent.add(o);return o;
 };
 const ell=(parent,x,y,z,rx,ry,rz,color)=>{const geo=new THREE.SphereGeometry(1,20,14);geo.scale(rx,ry,rz);geo.translate(x,y,z);return mesh(geo,color,parent);};
 const box=(w,h,d,x,y,z,mat=m.white,parent=g)=>world.box(w,h,d,x,y,z,mat,parent);
 box(.34,1.10,.34,0,.55,0);box(.307,.013,.303,0,1.107,0);
 const art=new THREE.Group();art.name='Goldfish, mooncake, candy and cactus';art.position.set(0,1.115,0);art.scale.setScalar(.72);g.add(art);
 // Prickly-pear cactus supporting the little red-shirted figure.
 for(const [px,py,rz,angle] of [[0,.096,.093,0],[-.034,.194,.090,.18],[.048,.160,.064,-.43],[-.062,.041,.060,.68],[.091,.207,.051,-.44]]){
  const pad=new THREE.Group();pad.position.set(px,py,0);pad.rotation.z=angle;art.add(pad);ell(pad,0,0,0,.032,rz,.012,green);
  for(const side of [-1,1])for(let row=0;row<8;row++)for(let col=0;col<3;col++){
   const xx=(col-1)*.016,yy=(row-3.5)*rz*.22;if((xx/.030)**2+(yy/rz)**2>.85)continue;
   const dot=new THREE.IcosahedronGeometry(.0022,0);dot.translate(xx,yy,side*.012);mesh(dot,0xd5c667,pad);
  }
 }
 ell(art,-.004,.285,0,.024,.033,.019,0xc42e20);ell(art,-.004,.327,0,.020,.020,.018,0xce976b);
 for(const side of [-1,1]){ell(art,side*.026,.275,.006,.008,.023,.008,0xce976b);ell(art,side*.012,.253,.018,.011,.010,.021,0xc62e22);}
 // Striped orange/yellow ball, wrapped sweet and small balancing bead.
 ell(art,0,.378,0,.039,.058,.036,(x,y,z)=>Math.sin(Math.atan2(z,x)*7)>.1?orange:yellow);
 ell(art,0,.456,0,.039,.024,.021,(x,y,z)=>Math.sin(x*125+y*153+z*107)>.4?0x235695:white);
 for(const side of [-1,1]){const wrap=new THREE.ConeGeometry(.027,.042,6);wrap.rotateZ(side*Math.PI/2);wrap.translate(side*.054,.46,0);mesh(wrap,(x,y,z)=>Math.sin(x*370+y*220)>.5?0x244786:white,art);}
 ell(art,0,.501,0,.014,.014,.014,yellow);
 // An upright scalloped mooncake, with embossed floral petals on both faces.
 const cakeShape=new THREE.Shape();for(let i=0;i<=160;i++){const a=i/160*Math.PI*2,r=.063+.004*Math.cos(a*16);i?cakeShape.lineTo(Math.cos(a)*r,Math.sin(a)*r):cakeShape.moveTo(r,0);}cakeShape.closePath();
 const cakeGeo=new THREE.ExtrudeGeometry(cakeShape,{depth:.035,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.002,bevelThickness:.002});cakeGeo.translate(0,.589,-.0175);mesh(cakeGeo,gold,art);
 for(const side of [-1,1])for(const [radius,n] of [[.043,16],[.024,12]])for(let i=0;i<n;i++){
  const a=i*Math.PI*2/n,petal=new THREE.TorusGeometry(radius===.043?.010:.008,.002,4,10);petal.scale(.5,1.2,1);petal.rotateZ(a-Math.PI/2);petal.translate(Math.cos(a)*radius,.589+Math.sin(a)*radius,side*.021);mesh(petal,0xe1a350,art);
 }
 // Bulbous white goldfish with warm calico patches, protruding eyes and a fan tail.
 const fish=new THREE.Group();fish.name='White goldfish with yellow and orange patches';fish.position.set(-.018,.776,0);art.add(fish);
 const patches=(x,y,z)=>{const s=Math.sin(x*43+y*32+z*19)+.48*Math.sin(z*78-x*26);return y>-.025&&s>.16?(s>1.02?orange:yellow):white;};
 ell(fish,0,0,0,.123,.124,.078,patches);
 ell(fish,-.102,.023,0,.057,.076,.062,patches);
 const fin=(points,x,y,z,scale=1)=>{const shape=new THREE.Shape();shape.moveTo(...points[0]);for(let i=1;i<points.length;i++)shape.quadraticCurveTo(...points[i]);shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth:.006,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1,steps:1,curveSegments:10});geo.scale(scale,scale,scale);geo.translate(x,y,z);return mesh(geo,patches,fish);};
 fin([[0,0],[.055,.13,.112,.135],[.14,.062,.09,.014],[.155,-.055,.107,-.103],[.065,-.095,0,0]],.10,.035,-.004);
 fin([[0,0],[-.06,.060,-.04,.092],[.027,.074,.055,.016],[.020,.006,0,0]],-.008,.099,-.008,.8);
 for(const side of [-1,1]){
  ell(fish,-.100,.052,side*.060,.040,.043,.028,white);
  ell(fish,-.108,.053,side*.083,.025,.029,.006,yellow);ell(fish,-.110,.055,side*.088,.019,.023,.004,ink);ell(fish,-.118,.062,side*.091,.004,.005,.001,white);
  fin([[0,0],[-.04,-.02,-.017,-.060],[.015,-.075,.025,-.026],[.020,0,0,0]],-.045,-.051,side*.07,.7).rotation.y=side*.35;
 }
 ell(fish,-.151,-.007,0,.009,.005,.012,ink);
 // The acrylic cover stays transparent; thin edges convey its volume.
 const acrylic=new THREE.MeshStandardMaterial({color:0xdce8e7,transparent:true,opacity:.055,roughness:.12,metalness:.08,depthWrite:false,side:THREE.DoubleSide});
 for(const sx of [-1,1])box(.002,.74,.29,sx*.15,1.485,0,acrylic);
 for(const sz of [-1,1])box(.30,.74,.002,0,1.485,sz*.145,acrylic);
 box(.302,.002,.292,0,1.856,0,acrylic);
 const edgeMaterial=new THREE.LineBasicMaterial({color:0xe4efed,transparent:true,opacity:.3});
 const edges=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(.30,.74,.29)),edgeMaterial);edges.position.y=1.485;g.add(edges);
 // Small blue balloon dog perched above the case, and keepsakes on the plinth.
 const dog=new THREE.Group();dog.position.set(-.092,1.884,-.025);g.add(dog);const blue=0x167db2;
 ell(dog,0,0,0,.031,.013,.013,blue);ell(dog,-.028,.017,0,.014,.026,.014,blue);ell(dog,-.04,.015,.003,.020,.009,.009,blue);
 ell(dog,-.022,.049,0,.008,.019,.008,blue);ell(dog,.033,.020,0,.007,.026,.007,blue);
 for(const xx of [-.020,.020])for(const zz of [-.007,.007])ell(dog,xx,-.022,zz,.007,.023,.007,blue);
 for(const [i,px] of [-.09,0,.09].entries()){
  ell(g,px,1.13,.167,.017,.021,.014,i===1?0xbc3125:yellow);
  ell(g,px,1.164,.167,.022,.023,.018,i===1?white:yellow);
  for(const dx of [-.007,.007])ell(g,px+dx,1.167,.184,.002,.004,.002,ink);
 }
 world.hallwaySculpture=g;
 world.colliders.push({x:g.position.x,z:g.position.z,w:.34,d:.34,label:'Fish and mooncake pedestal'});
 return g;
}
