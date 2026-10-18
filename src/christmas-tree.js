import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {planPoint,floorHeight} from './house-layout.js';

// The family Christmas tree, switched on from the memory studio: a fir in a
// toile hat box by the turntable, strung with warm lights, red baubles, plush
// bunnies and monsters and ribbons, a fluffy wreath with stars on top, and the
// shopping bags and presents tucked underneath. Lights twinkle each frame.
export const TREE_PLAN=[372,689];
// Which of the five light circuits are lit at time t: each circuit has its own
// on/off beat, and a chase keeps one circuit lit whatever the beats say.
export const LIGHT_CIRCUITS=5,LIGHT_BEATS=[.9,1.3,.7,1.1,1.7];
export function litCircuits(t){const chase=Math.floor(t*2.2)%LIGHT_CIRCUITS;return LIGHT_BEATS.map((beat,i)=>Math.floor(t/beat+i*.37)%2===0||i===chase);}
const rand=(seed=>()=>{seed=(seed*16807)%2147483647;return seed/2147483647;})(20251225);
const text=(label,{width=512,height=160,font='bold 72px "Didot","Bodoni MT","Times New Roman",serif',color='#2f3a2e',background=null,letterSpacing=10}={})=>{
 const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');
 if(background){ctx.fillStyle=background;ctx.fillRect(0,0,width,height);}
 ctx.fillStyle=color;ctx.font=font;ctx.textBaseline='middle';ctx.textAlign='center';
 if('letterSpacing' in ctx)ctx.letterSpacing=letterSpacing+'px';ctx.fillText(label,width/2+letterSpacing/2,height/2);
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;return map;
};
function toileTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');
 ctx.fillStyle='#ece7da';ctx.fillRect(0,0,512,512);ctx.strokeStyle='#8d9389';ctx.lineWidth=2.2;ctx.lineCap='round';
 for(let i=0;i<70;i++){const x=rand()*512,y=rand()*512,r=8+rand()*30;ctx.beginPath();for(let k=0;k<5;k++){const a=k*1.25+rand(),r2=r*(.5+rand()*.6);ctx.lineTo(x+Math.cos(a)*r2,y+Math.sin(a)*r2*.6);}ctx.stroke();}
 for(let i=0;i<120;i++){ctx.beginPath();ctx.ellipse(rand()*512,rand()*512,2+rand()*6,1+rand()*3,rand()*3,0,7);ctx.fillStyle='#9ba197';ctx.fill();}
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(2,1);map.anisotropy=4;return map;
}
function stripeTexture(){
 const c=document.createElement('canvas');c.width=512;c.height=512;const ctx=c.getContext('2d');
 ctx.fillStyle='#f6f3ee';ctx.fillRect(0,0,512,512);ctx.fillStyle='#161616';
 for(let i=-2;i<8;i++){ctx.beginPath();ctx.moveTo(0,i*96+10);ctx.lineTo(512,i*96-30);ctx.lineTo(512,i*96+22);ctx.lineTo(0,i*96+62);ctx.closePath();ctx.fill();}
 ctx.fillStyle='#f6f3ee';ctx.fillRect(40,200,432,112);ctx.fillStyle='#161616';ctx.font='bold 60px "Helvetica Neue",Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';if('letterSpacing' in ctx)ctx.letterSpacing='8px';ctx.fillText('SEPHORA',262,256);
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;return map;
}
const starShape=(outer,inner,points=5)=>{const s=new THREE.Shape();for(let i=0;i<points*2;i++){const r=i%2?inner:outer,a=i/(points*2)*Math.PI*2-Math.PI/2;i?s.lineTo(Math.cos(a)*r,Math.sin(a)*r):s.moveTo(Math.cos(a)*r,Math.sin(a)*r);}s.closePath();return s;};
// A point on the fir's surface at a given height, for hanging things.
const onTree=(y,angle,offset=0)=>{const r=Math.max(.06,.5*(1-(y-.3)/1.5))+offset;return [Math.cos(angle)*r,y,Math.sin(angle)*r];};

export function buildChristmasTree(world,plan=TREE_PLAN){
 const [x,z]=planPoint(...plan),floor=floorHeight(x,z);
 const g=new THREE.Group();g.name='Christmas tree';g.position.set(x,floor,z);(world.houseRoot||world.scene).add(g);
 const mat=(color,roughness=.9,metalness=0,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
 const add=(geometry,material,px,py,pz,parent=g)=>{const m=new THREE.Mesh(geometry,material);m.position.set(px,py,pz);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 // Hat-box pot with a toile print and a pale green ribbon.
 const pot=add(new THREE.CylinderGeometry(.31,.27,.32,36),mat(0xece7da,.75,0,{map:toileTexture()}),0,.16,0);
 add(new THREE.CylinderGeometry(.315,.315,.04,36),mat(0xe8e2d2,.7),0,.30,0);
 const band=add(new THREE.CylinderGeometry(.312,.296,.07,36,1,true),mat(0xb9cbb0,.8,0,{side:THREE.DoubleSide}),0,.2,0);
 add(new THREE.PlaneGeometry(.26,.07),new THREE.MeshStandardMaterial({map:text('DIOR',{color:'#5d6b58',font:'bold 64px "Didot","Bodoni MT","Times New Roman",serif',letterSpacing:14}),transparent:true,roughness:.8}),0,.2,.306).rotation.x=0;
 add(new THREE.CylinderGeometry(.045,.055,.5,10),mat(0x5a3b22,.95),0,.5,0);
 // Fir: stacked, ruffled cones.
 const needles=mat(0x1f4a2b,.95),darker=mat(0x183d22,.95);
 for(let i=0;i<10;i++){
  const t=i/9,y=.42+t*1.42,r=.52*(1-t)+.07,h=.44-t*.2;
  const geo=new THREE.ConeGeometry(r,h,22,3,true),p=geo.attributes.position;
  for(let k=0;k<p.count;k++){const px=p.getX(k),pz=p.getZ(k),len=Math.hypot(px,pz);if(len>.02){const n=1+(rand()-.5)*.2;p.setX(k,px*n);p.setZ(k,pz*n);p.setY(k,p.getY(k)+(rand()-.5)*.04);}}
  geo.computeVertexNormals();add(geo,i%2?darker:needles,(rand()-.5)*.03,y,(rand()-.5)*.03);
 }
 // Warm string lights in five circuits that blink: each circuit switches on and
 // off on its own beat, with a chase running round the tree underneath, so some
 // bulbs are always lit and the pattern never quite repeats. Two point lights
 // breathe with how many circuits are on.
 const CIRCUITS=LIGHT_CIRCUITS,lightMats=Array.from({length:CIRCUITS},()=>new THREE.MeshStandardMaterial({color:0xffe6a8,emissive:0xffb24a,emissiveIntensity:2.6,roughness:.4,toneMapped:false}));
 const lightGroups=lightMats.map(()=>[]);
 for(let i=0;i<95;i++){const y=.45+rand()*1.35,a=rand()*Math.PI*2;const [px,py,pz]=onTree(y,a,-.01);lightGroups[i%CIRCUITS].push([px,py,pz]);}
 lightMats.forEach((m,i)=>{const geo=new THREE.SphereGeometry(.012,6,5),mesh=new THREE.InstancedMesh(geo,m,lightGroups[i].length),o=new THREE.Object3D();lightGroups[i].forEach(([px,py,pz],k)=>{o.position.set(px,py,pz);o.updateMatrix();mesh.setMatrixAt(k,o.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.userData.dynamic=true;g.add(mesh);});
 const glows=[[.95,2.4],[1.55,1.6]].map(([py,power])=>{const l=new THREE.PointLight(0xffd79a,power,2.6,2);l.position.set(0,py,0);g.add(l);l.userData.power=power;return l;});
 const lit=new THREE.Color(0xffe6a8),dark=new THREE.Color(0x5a4a30);
 // Baubles: red, green and gold.
 const glossy=c=>mat(c,.22,.35);
 const baubles=[[0xc8202a,9,.04],[0x2f7a3a,5,.038],[0xd4a640,4,.034]];
 for(const [color,count,r] of baubles)for(let i=0;i<count;i++){const y=.5+rand()*1.25,a=rand()*Math.PI*2;const [px,py,pz]=onTree(y,a,.02);add(new THREE.SphereGeometry(r,14,10),glossy(color),px,py,pz);add(new THREE.CylinderGeometry(.006,.006,.012,6),mat(0xd4a640,.3,.8),px,py+r+.005,pz);}
 // Plush ornaments: two bunnies, three monsters and a little rainbow one.
 const plush=c=>mat(c,.98);
 const bunny=(color,y,a,scale=1)=>{const [px,py,pz]=onTree(y,a,.05);const b=new THREE.Group();b.position.set(px,py,pz);b.rotation.y=-a+Math.PI/2;b.scale.setScalar(scale);g.add(b);
  add(new THREE.SphereGeometry(.07,14,10),plush(color),0,-.02,0,b).scale.set(1,1.1,.8);add(new THREE.SphereGeometry(.055,14,10),plush(color),0,.08,0,b);
  for(const s of [-1,1]){const ear=add(new THREE.CapsuleGeometry(.018,.08,4,8),plush(color),s*.03,.17,0,b);ear.rotation.z=-s*.25;}
  for(const s of [-1,1])add(new THREE.SphereGeometry(.007,6,5),mat(0x1d1a18,.5),s*.02,.09,.05,b);
  add(new THREE.SphereGeometry(.014,8,6),mat(0xfff3b0,.8),0,.06,.052,b);add(new THREE.SphereGeometry(.03,10,8),plush(color),0,-.05,-.06,b);return b;};
 bunny(0xf3c7b4,1.2,.4);bunny(0x7ec4e8,.95,2.6,.9);bunny(0xf5b6cf,1.0,4.3,.8);
 const monster=(color,y,a,scale=1)=>{const [px,py,pz]=onTree(y,a,.05);const m=new THREE.Group();m.position.set(px,py,pz);m.rotation.y=-a+Math.PI/2;m.scale.setScalar(scale);g.add(m);
  add(new THREE.SphereGeometry(.065,14,10),plush(color),0,0,0,m).scale.set(1,.95,.85);add(new THREE.SphereGeometry(.022,10,8),mat(0xffffff,.4),0,.015,.05,m);add(new THREE.SphereGeometry(.011,8,6),mat(0x1d1a18,.5),0,.015,.068,m);
  for(const s of [-1,1])add(new THREE.SphereGeometry(.014,8,6),plush(color),s*.05,.055,0,m);return m;};
 monster(0xe8a23a,.72,1.2);monster(0xd8332b,.9,3.6,.9);monster(0x9b6fd2,1.35,5.4,.7);
 const rainbow=(y,a)=>{const [px,py,pz]=onTree(y,a,.05);const r=new THREE.Group();r.position.set(px,py,pz);r.rotation.y=-a+Math.PI/2;g.add(r);
  [0xe53935,0xfb8c00,0xfdd835,0x43a047,0x1e88e5,0x8e24aa].forEach((c,i)=>add(new THREE.CylinderGeometry(.045-i*.002,.045,.022,14),plush(c),0,.06-i*.022,0,r));
  for(const s of [-1,1])add(new THREE.SphereGeometry(.009,6,5),mat(0x1d1a18,.5),s*.016,.07,.04,r);return r;};
 rainbow(.62,5.3);
 // Red ribbons curling down the branches.
 for(const [a0,y0] of [[.2,1.5],[2.4,1.3],[4.6,1.45]]){const pts=[];for(let k=0;k<=6;k++){const y=y0-k*.16,a=a0+k*.55;const [px,py,pz]=onTree(y,a,.015);pts.push(new THREE.Vector3(px,py,pz));}
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),40,.008,6,false),mat(0xb3121e,.6),0,0,0);}
 // The topper: a fluffy wreath with four smiling stars and a linen bow, and a silver star above.
 const top=new THREE.Group();top.position.set(0,1.98,0);g.add(top);
 const wreath=new THREE.TorusGeometry(.17,.064,14,40),wp=wreath.attributes.position;for(let k=0;k<wp.count;k++){const n=1+(rand()-.5)*.22;wp.setX(k,wp.getX(k)*n);wp.setY(k,wp.getY(k)*n);wp.setZ(k,wp.getZ(k)*(1+(rand()-.5)*.3));}wreath.computeVertexNormals();
 add(wreath,mat(0x5f8c66,1),0,0,0,top);
 const starMat=mat(0xf1ead6,.85),starGeo=new THREE.ExtrudeGeometry(starShape(.055,.028),{depth:.03,bevelEnabled:true,bevelSize:.006,bevelThickness:.006});
 for(const [sx,sy] of [[-.14,.09],[.14,.09],[-.17,-.1],[.17,-.1]]){const s=add(starGeo,starMat,sx,sy,.03,top);s.rotation.z=rand()*.6-.3;}
 const bow=new THREE.Group();bow.position.set(0,.19,.02);top.add(bow);
 for(const s of [-1,1]){const loop=add(new THREE.SphereGeometry(.06,12,8),mat(0xe4dcc3,.9),s*.07,0,0,bow);loop.scale.set(1.1,.7,.5);}
 add(new THREE.BoxGeometry(.05,.05,.04),mat(0xd9d0b4,.9),0,0,.01,bow);for(const s of [-1,1]){const tail=add(new RoundedBoxGeometry(.045,.16,.02,2,.008),mat(0xe4dcc3,.9),s*.04,-.11,.01,bow);tail.rotation.z=s*.25;}
 const silver=add(new THREE.ExtrudeGeometry(starShape(.09,.04,4),{depth:.02,bevelEnabled:true,bevelSize:.006,bevelThickness:.006}),mat(0xd6d6d6,.25,.9),0,.42,0,top);silver.rotation.y=.4;
 // Underneath: the Dior dust bag, the Sephora bag and a few presents.
 const bags=new THREE.Group();bags.position.set(0,0,0);g.add(bags);
 const dust=new THREE.Group();dust.position.set(-.55,0,.42);dust.rotation.y=.5;bags.add(dust);
 const dustBody=add(new THREE.SphereGeometry(.26,22,16),mat(0xf4efe4,.95),0,.24,0,dust);dustBody.scale.set(1.05,.95,.7);
 add(new THREE.CylinderGeometry(.09,.17,.14,16),mat(0xefe9dc,.95),0,.5,0,dust);add(new THREE.TorusGeometry(.085,.012,6,16),mat(0xe9e2d3,.9),0,.55,0,dust).rotation.x=Math.PI/2;
 add(new THREE.PlaneGeometry(.26,.08),new THREE.MeshStandardMaterial({map:text('DIOR',{color:'#c9b27a',font:'bold 70px "Didot","Bodoni MT","Times New Roman",serif',letterSpacing:16}),transparent:true,roughness:.9}),0,.2,.185,dust);
 const seph=new THREE.Group();seph.position.set(-.14,0,.58);seph.rotation.y=-.2;bags.add(seph);
 const sephMat=[mat(0x161616,.7),mat(0x161616,.7),mat(0xf6f3ee,.7),mat(0xf6f3ee,.7),mat(0xf6f3ee,.7,0,{map:stripeTexture()}),mat(0xf6f3ee,.7,0,{map:stripeTexture()})];
 const sephBag=new THREE.Mesh(new THREE.BoxGeometry(.3,.33,.12),sephMat);sephBag.position.set(0,.165,0);sephBag.castShadow=sephBag.receiveShadow=true;seph.add(sephBag);
 for(const s of [-1,1]){const handle=add(new THREE.TorusGeometry(.055,.005,6,16,Math.PI),mat(0x161616,.6),0,.33,s*.045,seph);}
 add(new THREE.SphereGeometry(.08,10,8),mat(0xf06292,.95),.02,.36,0,seph).scale.set(1.3,.6,.7);add(new THREE.SphereGeometry(.06,10,8),mat(0xff8fb1,.95),-.07,.37,.01,seph).scale.set(1,.7,.6);
 const present=(px,pz,w,h,d,paper,ribbon,yaw=0)=>{const p=new THREE.Group();p.position.set(px,0,pz);p.rotation.y=yaw;bags.add(p);
  add(new RoundedBoxGeometry(w,h,d,2,.01),mat(paper,.6),0,h/2,0,p);add(new THREE.BoxGeometry(w+.004,h+.004,.035),mat(ribbon,.4,.2),0,h/2,0,p);add(new THREE.BoxGeometry(.035,h+.004,d+.004),mat(ribbon,.4,.2),0,h/2,0,p);
  for(const s of [-1,1]){const loop=add(new THREE.TorusGeometry(.03,.009,6,14),mat(ribbon,.4,.2),s*.035,h+.025,0,p);loop.rotation.y=Math.PI/2;loop.rotation.x=s*.3;}return p;};
 present(.5,.5,.26,.18,.2,0xb3121e,0xd4a640,.3);present(.62,.18,.18,.14,.18,0xf4efe4,0xb3121e,-.4);present(.3,.66,.2,.12,.16,0x2f7a3a,0xf4efe4,.1);present(.72,-.2,.14,.2,.14,0xd4a640,0xb3121e,.6);
 // Keep walkers out of the tree and the pile underneath.
 world.colliders.push({x,z,w:.98,d:.98,angle:0,label:'Christmas tree'},{x:x-.45,z:z+.5,w:.7,d:.55,angle:.4,label:'Christmas bags'},{x:x+.55,z:z+.35,w:.5,d:.6,angle:0,label:'Christmas presents'});
 // The lights are a switch you walk up to. Your choice is remembered on this device.
 const LIGHTS_KEY='athome_christmas_lights';let lightsOn=false;try{lightsOn=localStorage.getItem(LIGHTS_KEY)==='on';}catch{}
 const hit=new THREE.Mesh(new THREE.CylinderGeometry(.5,.55,2.2,12),new THREE.MeshBasicMaterial({visible:false,transparent:true,opacity:0}));hit.position.y=1.1;hit.userData.dynamic=true;hit.name='Christmas tree touch target';g.add(hit);
 let t=rand()*10;
 const tree={group:g,position:new THREE.Vector3(x,floor,z),lightMats,get lightsOn(){return lightsOn;},
  setLights(on){lightsOn=on;try{localStorage.setItem(LIGHTS_KEY,on?'on':'off');}catch{}if(!on){for(const m of lightMats){m.emissiveIntensity=0;m.color.copy(dark);}for(const l of glows)l.intensity=0;}},
  update(dt){
  if(!lightsOn){for(const m of lightMats){m.emissiveIntensity=0;m.color.copy(dark);}for(const l of glows)l.intensity=0;return;}
  t+=dt;let on=0;const states=litCircuits(t);
  lightMats.forEach((m,i)=>{const isOn=states[i];m.emissiveIntensity=isOn?2.4+Math.sin(t*9+i)*.3:0;m.color.copy(isOn?lit:dark);if(isOn)on++;});
  for(const l of glows)l.intensity=l.userData.power*(.35+.65*on/CIRCUITS);
 }};
 tree.update(0);
 world.houseInteractions?.add({id:'christmas-tree',pos:new THREE.Vector3(x,floor+1.0,z),range:2.4,touchObjects:[hit],surfaceOffset:.62,
  label:()=>lightsOn?'Turn off the Christmas lights':'Turn on the Christmas lights',
  activate(){tree.setLights(!lightsOn);world.onHouseMessage?.(lightsOn?'The tree twinkles to life. ✨':'The Christmas lights are off for now.');}});
 world.christmasTree=tree;return tree;
}
