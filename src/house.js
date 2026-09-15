import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {HOUSE_ROOMS,HOUSE_STAIRS,LIVING_SEATING,planPoint,PLAN_SCALE,MIRROR_POSITION,MIRROR_YAW,FRONT_DOOR} from './house-layout.js';
import {floorPieces} from './plan-geometry.js';
import {buildArchitecture} from './house-architecture.js';
import {buildSecondBedroom,addHouseDetails,buildMasterVanity,buildLivingAudioShelf} from './house-details.js';
import {buildHallwayGallery} from './house-gallery.js';
import {buildMasterBathroom,buildPowderBathroom,buildGuestBathroom} from './house-bathrooms.js';
import {buildBedroomDetails,buildSageDrawing} from './bedroom-details.js';
import {buildHomeFurnishings} from './home-furnishings.js';
import {buildDiningDetails} from './dining-details.js';
import {buildClawMachine} from './claw-machine.js';
import {buildLivingSeating} from './living-seating.js';
import {buildWindowLounge} from './window-lounge.js';
import {buildBedroomStorage} from './bedroom-storage.js';
import {HouseInteractions,buildInteractiveFridge,buildLift} from './house-interactions.js';
import {buildLobbyDetails} from './lobby-details.js';
import {MovableFurniture} from './movable-furniture.js';
import {buildEntranceNook} from './entrance-nook.js';
import {buildKitchenDetails} from './kitchen-details.js';
import {buildPinballMachine} from './pinball-machine.js';
import {buildMassageChair} from './massage-chair.js';
import {buildBedsideTables} from './bedside-tables.js';
import {buildUtilityYard} from './utility-yard.js';

// Authored game geometry based on the supplied contract plan and walkthrough.
export function buildHouse(world){
 world.houseInteractions=new HouseInteractions(world);
 world.movableFurniture=new MovableFurniture(world);
 const root=new THREE.Group();root.name='Plan-based home';world.scene.add(root);world.houseRoot=root;
 const materials={plaster:world.mat(0xcfc9b9,.93),sage:world.mat(0x78816b,.55),marble:world.mat(0xd1c9b8,.25,.07),oak:world.mat(0x956a40,.58),white:world.mat(0xe1ded0,.8),black:world.mat(0x171a19,.46),steel:world.mat(0x808480,.24,.8),orange:world.mat(0xb74720,.94),cream:world.mat(0xc6bfa8,.96),teal:world.mat(0x315e5b,.65),walnut:world.mat(0x4b3126,.55),blue:world.mat(0x1b293a,.94),glass:new THREE.MeshStandardMaterial({color:0x809da2,roughness:.16,metalness:.18,transparent:true,opacity:.12,side:THREE.DoubleSide})};world.houseMaterials=materials;
 materials.breccia=world.mat(0xe3e1d8,.22,.06);materials.oakFloor=world.mat(0xa57a51,.55);
 for(const [key,size] of Object.entries({plaster:.85,sage:.85,marble:2.4,oak:1.1,oakFloor:1.8,walnut:1.1,breccia:1.55,orange:.16,cream:.16,blue:.16}))materials[key].userData.textureMeters=size;
 const mat=v=>typeof v==='string'?materials[v]:typeof v==='number'?world.mat(v):v;
 const box=(w,h,d,x,y,z,m='white',p=root)=>world.box(w,h,d,x,y,z,mat(m),p);
 const cyl=(a,b,h,x,y,z,m='white',p=root,n=20)=>world.cyl(a,b,h,x,y,z,mat(m),p,n);
 const sphere=(r,x,y,z,m='white',p=root,sx=1,sy=1,sz=1)=>world.sphere(r,x,y,z,mat(m),p,sx,sy,sz);
 const soft=(w,h,d,x,y,z,m,p=root)=>{const o=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,.06),mat(m));o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;};
 const block=(x,z,w,d,angle=0,top)=>world.colliders.push({x,z,w,d,angle,...(top===undefined?{}:{top,landable:true})});
 const wall=(x0,z0,x1,z1,m='plaster',h=3.5,b=0)=>{const w=Math.hypot(x1-x0,z1-z0),x=(x0+x1)/2,z=(z0+z1)/2,a=-Math.atan2(z1-z0,x1-x0);const mesh=box(w,h,.15,x,b+h/2,z,m);mesh.rotation.y=a;box(w,.05,.17,x,b+.025,z,'white').rotation.y=a;world.colliders.push({x,z,w,d:.15,angle:a,top:b+h,wall:'raised perimeter'});};
 const light=(x,y,z,color=0xffdca4,power=15,range=9)=>{const l=new THREE.PointLight(color,power,range,2);l.position.set(x,y,z);root.add(l);return l;};
 const down=(x,z,b=0,p=13)=>{cyl(.09,.09,.025,x,b+2.97,z,new THREE.MeshStandardMaterial({color:0xffe5b6,emissive:0xffcf87,emissiveIntensity:1.4}));return light(x,b+2.87,z,0xffdba8,p);};
 const painting=(x,y,z,w,h,c,a=0)=>{const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=a;root.add(g);box(w+.07,h+.07,.04,0,0,0,'walnut',g);box(w,h,.047,0,0,.012,c,g);return g;};
 const cabinet=(x,z,w,h,d,m='sage',a=0,b=0)=>{const g=new THREE.Group();g.position.set(x,b,z);g.rotation.y=a;root.add(g);box(w,h,d,0,h/2,0,m,g);const n=Math.max(1,Math.round(w/.55));for(let i=0;i<n;i++){const dx=-w/2+(i+.5)*w/n;box(w/n-.016,h-.03,.024,dx,h/2,d/2+.008,m,g);box(.012,.13,.025,dx+w/n*.35,h*.45,d/2+.035,'steel',g);}block(x,z,Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*d,Math.abs(Math.cos(a))*d+Math.abs(Math.sin(a))*w);return g;};
 const sofa=(x,z,w,a,m='orange',b=0)=>{const g=new THREE.Group();g.position.set(x,b,z);g.rotation.y=a;root.add(g);soft(w,.26,.98,0,.27,0,m,g);soft(w,.58,.25,0,.65,-.43,m,g);const n=Math.round(w/.7);for(let i=0;i<n;i++)soft(w/n-.025,.2,.72,-w/2+(i+.5)*w/n,.48,.08,m,g);if(m!=='orange')for(const dx of [-w/2+.08,w/2-.08])soft(.19,.37,1.04,dx,.51,0,m,g);for(const [dx,c] of [[-w*.28,'cream'],[w*.22,'blue']]){const p=soft(.44,.43,.16,dx,.79,-.18,c,g);p.rotation.x=-.17;p.rotation.z=dx*.15;}block(x,z,Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*1.03,Math.abs(Math.cos(a))*1.03+Math.abs(Math.sin(a))*w,0,b+.58);};
 const chair=(x,z,a,b=0)=>{const g=new THREE.Group();g.name='Dining chair';g.position.set(x,b,z);g.rotation.y=a;root.add(g);soft(.5,.09,.49,0,.46,0,'cream',g);soft(.5,.52,.09,0,.74,-.23,'cream',g);for(const u of [-.19,.19])for(const v of [-.18,.18])cyl(.014,.012,.44,u,.22,v,'steel',g);world.movableFurniture.add(g,{w:.55,d:.58,top:.505});};
 const plant=(x,z,b=0,s=1)=>{
  cyl(.2*s,.15*s,.35*s,x,b+.175*s,z,'walnut');cyl(.177*s,.177*s,.009,x,b+.352*s,z,0x211e17);
  cyl(.014*s,.027*s,.65*s,x,b+.67*s,z,'walnut');
  for(let i=0;i<12;i++){
   const a=i*2.4,y=b+(.51+i*.035)*s,r=(.19+.04*Math.sin(i))*s,end=new THREE.Vector3(x+Math.cos(a)*r,y+.16*s,z+Math.sin(a)*r),start=new THREE.Vector3(x,y,z),dir=end.clone().sub(start);
   const twig=cyl(.005*s,.009*s,dir.length(),...(start.clone().add(end).multiplyScalar(.5).toArray()),'walnut');twig.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
   for(let j=0;j<4;j++){const aa=a+j*1.4,leaf=new THREE.Mesh(new THREE.SphereGeometry(.085*s,8,6),mat(j%2?0x354a29:0x243f2a));leaf.scale.set(.82,1.7,.12);leaf.position.set(end.x+Math.cos(aa)*.1*s,end.y+(j%2)*.06*s,end.z+Math.sin(aa)*.1*s);leaf.rotation.set(.4,aa,.5*Math.sin(aa));leaf.castShadow=true;root.add(leaf);}
  }block(x,z,.45*s,.45*s);
 };
 const shelf=(x,z,w,h,a=0,b=0)=>{const g=new THREE.Group();g.position.set(x,b,z);g.rotation.y=a;root.add(g);box(w,h,.12,0,h/2,-.18,'black',g);for(let j=0;j<6;j++){const y=.1+j*(h-.1)/5;box(w,.035,.42,0,y,0,'walnut',g);for(let i=0;i<Math.floor(w/.13);i++){const v=.14+(i*17+j*7)%11*.01;box(.065+(i%3)*.012,v,.17,-w/2+.1+i*.13,y+v/2+.03,.03,[0x705548,0x343f39,0x7f755b,0x343d53,0x8a4d38][(i+j)%5],g);}}block(x,z,Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*.44,Math.abs(Math.cos(a))*.44+Math.abs(Math.sin(a))*w);};
 const P=planPoint,scale=PLAN_SCALE;
 const B=(px,pz,w,h,d,y,m='white',a=0)=>{const [x,z]=P(px,pz),o=box(w,h,d,x,y,z,m);o.rotation.y=a;return o;};
 const W=(x0,z0,x1,z1,m='plaster',h=3.5,b=0)=>wall(...P(x0,z0),...P(x1,z1),m,h,b);
 const C=(px,pz,w,h,d,m='sage',a=0,b=.75)=>cabinet(...P(px,pz),w,h,d,m,a,b);
 const S=(px,pz,w,a,m='orange',b=0)=>sofa(...P(px,pz),w,a,m,b);
 const L=(px,pz,b=.75,p=11)=>down(...P(px,pz),b,p);
 const paint=(px,pz,y,w,h,c,a=0)=>{const [x,z]=P(px,pz);return painting(x,y,z,w,h,c,a);};
 const sketch=(px,pz,y,w,h,a=0)=>{
  const g=paint(px,pz,y,w,h,0xd3cbb6,a);
  for(const [ww,hh] of [[w+.07,h+.07],[w*.72,h*.79]])for(const [x0,y0,x1,y1] of [[-ww/2,-hh/2,ww/2,-hh/2],[ww/2,-hh/2,ww/2,hh/2],[ww/2,hh/2,-ww/2,hh/2],[-ww/2,hh/2,-ww/2,-hh/2]]){
   const line=box(Math.hypot(x1-x0,y1-y0),.012,.006,(x0+x1)/2,(y0+y1)/2,.042,'black',g);line.rotation.z=Math.atan2(y1-y0,x1-x0);
  }
  const ink=[];for(let j=0;j<6;j++)for(let i=0;i<25;i++){const x=-w*.28+i*w*.56/25,xx=x+w*.56/25;ink.push(x,h*(-.2+j*.065)+Math.sin(i*.48+j)*h*.04,.05,xx,h*(-.2+j*.065)+Math.sin((i+1)*.48+j)*h*.04,.05);}
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(ink,3)),new THREE.LineBasicMaterial({color:0x655e51,transparent:true,opacity:.55})));return g;
 };
 const T=(id,px,pz,y,name)=>{const [x,z]=P(px,pz);world.targets.push({id,pos:new THREE.Vector3(x,y,z),name});};
 const slab=(poly,y,m)=>{const shape=new THREE.Shape(poly.map(([x,z])=>new THREE.Vector2(x,-z)));const geo=new THREE.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);const o=new THREE.Mesh(geo,mat(m));o.position.y=y;o.receiveShadow=true;root.add(o);return o;};
 for(const r of HOUSE_ROOMS){
  const timber=['bedroom','bedroom_hall','wardrobe','meditation','theatre','wine','guest'].includes(r.id);
  // Solid floor volumes close the exposed risers beneath every raised landing.
  // Cut out stairs and fitted seating before extrusion; each supplies its own support.
  for(const p of floorPieces(r.polygon,[...HOUSE_STAIRS,...LIVING_SEATING])){
   const shape=new THREE.Shape(p.map(([x,z])=>new THREE.Vector2(x,-z)));
   const geo=new THREE.ExtrudeGeometry(shape,{depth:r.floor+.08,bevelEnabled:false,steps:1});geo.rotateX(-Math.PI/2);
   const floor=new THREE.Mesh(geo,mat(timber?'oakFloor':'marble'));floor.position.y=-.08;floor.receiveShadow=true;root.add(floor);
  }
  const ceiling=slab(r.polygon,r.floor+r.ceiling,'plaster');ceiling.material.side=THREE.DoubleSide;
  for(let i=0;i<r.polygon.length;i++){const [ax,az]=r.polygon[i],[bx,bz]=r.polygon[(i+1)%r.polygon.length],h=Math.max(.04,3.65-r.floor-r.ceiling);const edge=box(Math.hypot(bx-ax,bz-az),h,.12,(ax+bx)/2,r.floor+r.ceiling+h/2,(az+bz)/2,'plaster');edge.rotation.y=-Math.atan2(bz-az,bx-ax);}
 }
 for(const s of HOUSE_STAIRS){
  const xs=s.polygon.map(p=>p[0]),zs=s.polygon.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs);
  for(let i=0;i<s.risers;i++){
   const level=s.low+(s.high-s.low)*(i+1)/s.risers,j=s.reverse?s.risers-1-i:i;
   const w=s.axis==='x'?(x1-x0)/s.risers:x1-x0,d=s.axis==='z'?(z1-z0)/s.risers:z1-z0;
   const x=s.axis==='x'?x0+(j+.5)*w:(x0+x1)/2,z=s.axis==='z'?z0+(j+.5)*d:(z0+z1)/2;
   box(w,level+.08,d,x,(level-.08)/2,z,'marble');
  }
 }
 buildArchitecture(world,root,materials);
 buildHallwayGallery(world,root,materials);
 // Raised living-room perimeter/plinths; only the planned stair runs are passable.
 for(const a of [[317,532,458,532],[317,714,431,714],[523,714,539,714]])W(...a,'marble',.45);
 // GD01: 1,865 mm frame with a 1,150 mm moving leaf and a fixed side leaf.
 const doorFrame=new THREE.Group();doorFrame.rotation.y=FRONT_DOOR.yaw;const [fdx,fdz]=P(...FRONT_DOOR.center);doorFrame.position.set(fdx,.45,fdz);root.add(doorFrame);
 const half=FRONT_DOOR.width/2;
 world.door=new THREE.Group();world.door.name='Front door';world.door.position.x=-half;doorFrame.add(world.door);world.door.rotation.y=-1.45;
 box(1.15,2.15,.035,.575,1.075,0,'glass',world.door);for(const x of [.02,1.13])box(.035,2.2,.05,x,1.1,0,'steel',world.door);for(const y of [.02,1.03,2.18])box(1.075,.025,.05,.575,y,0,'steel',world.door);box(.035,.36,.065,1.03,1.12,.06,'black',world.door);
 const fixedStart=-half+1.15;box(half-fixedStart,2.2,.035,(half+fixedStart)/2,1.1,0,'glass',doorFrame);box(.035,2.2,.055,fixedStart,1.1,0,'steel',doorFrame);
 buildLift(world,root,materials);
 // The full-height lobby mirror follows its diagonal wall; the lift is opposite GD01.
 paint(901.5,848,1.72,2.7,2.52,0x87928e,Math.PI-Math.atan2(58,91));
 buildLobbyDetails(world,root,materials);
 B(843,748,.6,.008,3.07,.454,0x35463b,-Math.PI/4);B(939,802,2.05,.009,1.45,.455,0x775139,-Math.PI/4);
 const [ix,iz]=P(941,799);cyl(.59,.59,.008,ix,.46,iz,0x846348,root,48);
  const red=paint(811,636,1.96,1.12,1.46,0x991b23);const ring=new THREE.Mesh(new THREE.TorusGeometry(.41,.055,10,60),mat('black'));ring.scale.y=1.2;ring.position.z=.05;red.add(ring);
 buildHomeFurnishings(world,root,materials);
 // Photo-confirmed full-height shoe enclosure: opaque backing, inward-facing oak doors.
 buildEntranceNook(world,root,materials);
 T('records',749,644,1.31,'Read the entry notebook');T('radio',913.66,744.34,1.78,'House intercom');B(913.66,744.34,.24,.16,.035,1.78,'black',-Math.PI/4);
 const [dx,dz]=P(...FRONT_DOOR.center);world.targets.push({id:'door',pos:new THREE.Vector3(dx,1.9,dz),name:'Front door'},{id:'post',pos:new THREE.Vector3(dx,1.9,dz),name:'Begin the night at the front door',explorationOnly:true});
 buildHomeOffice(world,root,materials);
 // Sunken lounge: orange seating, a low audio/display shelf and blue low table.
 buildLivingSeating(world,root,materials);
 S(406,550,2.75,0);buildLivingAudioShelf(world,root,materials);B(436,620,4.8,.012,3.55,.014,0xc0b69e);
 // The separate north sofa's plinth stops 5 mm below the upholstery.
 B(406,549,2.77,.135,1.04,.0675,'marble');
 // C-30 follows the bedroom wall: 5,830 mm run, doorway, then 1,685 mm run.
 C(636,429.65,5.83,2.13,.6,'sage',0,.75);C(815.5,429.65,1.685,2.13,.6,'sage',0,.75);
 B(636,429,5.87,.14,.62,2.95,'plaster');B(815.5,429,1.72,.14,.62,2.95,'plaster');
 B(573,442,1.0,.29,.04,2.665,'black');for(let i=0;i<7;i++)B(573,443,1.02,.022,.04,2.54+i*.041,'sage');
 buildSageDrawing(world,root,materials);
 // Photo-confirmed wraparound racks and waterfall-stone island.
 C(758,555,1.975,.93,1,'oak',0,.75);B(758,555,2.015,.045,1.04,1.7025,'breccia');
 for(const px of [719.9,796.1])B(px,555,.045,.93,1.04,1.215,'breccia');
 const rack=(px,pz,w,a=0)=>{
  const [x,z]=P(px,pz),g=new THREE.Group();g.position.set(x,.75,z);g.rotation.y=a;root.add(g);
  const cols=Math.floor(w/.4),step=w/cols;
  for(const xx of [-w/2,w/2])box(.04,2.15,.36,xx,1.075,0,'oak',g);
  for(let j=0;j<9;j++){
   const y=.19+j*.215;box(w,.015,.31,0,y-.055,0,'steel',g);
   for(let i=0;i<cols;i++){
    const xx=-w/2+(i+.5)*step,body=cyl(.041,.045,.24,xx,y,0,0x19251e,g,10);body.rotation.z=Math.PI/2;
    cyl(.025,.022,.085,xx+.155,y,0,0x19251e,g,8).rotation.z=Math.PI/2;
    cyl(.046,.046,.09,xx-.015,y,0,(i+j)%4?0xc4bca4:0x735242,g,10).rotation.z=Math.PI/2;
   }
  }
  box(w,.02,.02,0,2.12,.17,new THREE.MeshStandardMaterial({color:0xffd695,emissive:0xffb86b,emissiveIntensity:1}),g);
  block(x,z,Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*.37,Math.abs(Math.cos(a))*.37+Math.abs(Math.sin(a))*w);
 };
 rack(716,492,2.68,0);rack(814,492,1.05,0);rack(716,622,2.68,Math.PI);rack(814,622,1.05,Math.PI);
 rack(844,557,3.25,-Math.PI/2);
 for(const pz of [493,621]){C(782,pz,.67,.55,.35,'oak',pz===493?0:Math.PI,.75);B(782,pz,.67,.035,.35,2.27,'oak');for(let i=0;i<3;i++)B(782,pz,.56,.21,.29,1.46+i*.24,'cream');}
 const [vx,vz]=P(758,555);cyl(.13,.09,.36,vx,1.91,vz,'teal');for(let i=0;i<7;i++){const x=vx+Math.cos(i*2.4)*.17,z=vz+Math.sin(i*2.4)*.15,y=2.14+(i%3)*.055;cyl(.005,.005,.25,x,y-.15,z,'teal');for(let j=0;j<9;j++){const bloom=new THREE.Mesh(new THREE.SphereGeometry(.027,7,5),mat(i%2?0xbba894:0x806481));bloom.position.set(x+Math.cos(j*2.4)*.046,y+(j%3)*.023,z+Math.sin(j*2.4)*.046);root.add(bloom);}}
 for(const p of [[756,512],[756,604]]){const [x,z]=P(...p);soft(.39,.07,.39,x,1.45,z,'cream');for(const dx of [-.15,.15])for(const dz of [-.15,.15])cyl(.012,.012,.66,x+dx,1.08,z+dz,'steel');block(x,z,.43,.43);}
 for(const p of [[706,516],[810,601]])light(...[P(...p)[0],2.68,P(...p)[1]],0xffc78b,8,5);

 // Dining table, chairs, amber pendant lights and a sideboard matching the video.
 const [dtx,dtz]=P(416,802);soft(2.8,.12,1.15,dtx,1.22,dtz,'oak');block(dtx,dtz,2.8,1.15,0,1.28);for(const x of [-.95,.95])box(.12,.68,.75,dtx+x,.85,dtz,'black');
 for(const x of [-.9,0,.9]){chair(dtx+x,dtz-.94,0,.45);chair(dtx+x,dtz+.94,Math.PI,.45);for(let j=0;j<3;j++)cyl(.33-j*.055,.3-j*.055,.1,dtx+x,2.73-j*.1,dtz,0xad7b38);light(dtx+x,2.35,dtz,0xffbd75,6);}
 buildDiningDetails(world,root,materials);
 // Outdoor balcony planting and the covered barbecue beyond the dining sliders.
 plant(...P(239,590),0,.75);
 const [btx,btz]=P(276,576);cyl(.28,.28,.035,btx,.58,btz,'steel');cyl(.045,.065,.56,btx,.28,btz,'black');block(btx,btz,.58,.58);
 const [bbx,bbz]=P(266,780);soft(.71,1.12,1.1,bbx,1.02,bbz,'black');block(bbx,bbz,.74,1.13);plant(...P(281,859),.45,.65);
 // Kitchen dimensions and finishes from sheets 50-56: 900 mm worktops, 600 mm depth.
 C(536,773,2.364,.855,.6,'oak',Math.PI/2,.45);B(536,773,.65,.045,2.414,1.3275,'marble');
 C(584,731,2.3,.855,.6,'oak',0,.45);B(584,731,2.35,.045,.65,1.3275,'marble');
 B(584,722.5,2.42,.72,.035,1.71,0x31593e);B(525,771,.035,.7,2.4,1.7,0xc7c5b4);
 // Photo-confirmed return counter and fridge beside the sole service doorway.
 // The counter stops before the fridge; its top does not overlap the north run.
 C(634.5,769.4,53.6/scale,.855,.6,'oak',-Math.PI/2,.45);B(634.5,769.78,.65,.045,52.45/scale,1.3275,'marble');
 B(577,730,1.1,.78,.6,2.26,0x617259);buildInteractiveFridge(world,root,materials);
 const upper=new THREE.Group(),[ux,uz]=P(644,764);upper.name='Glass-front food cabinet';upper.position.set(ux,2.30,uz);upper.rotation.y=-Math.PI/2;root.add(upper);
 box(1.24,.64,.025,0,0,-.14,'plaster',upper);
 for(const x of [-.63,.63])box(.025,.69,.30,x,0,0,'black',upper);
 for(const y of [-.345,0,.345])box(1.28,.022,.30,0,y,0,'black',upper);
 for(let i=0;i<4;i++){const x=-.4725+i*.315;box(.017,.69,.035,x+.1575,0,.154,'black',upper);box(.293,.66,.02,x,0,.157,'glass',upper);}
 C(537,773,.91,.6,.37,'walnut',Math.PI/2,2.2);B(536,801,.56,.015,.48,1.36,'steel');const [sx,sz]=P(535,801);cyl(.018,.018,.38,sx,1.52,sz,'steel');
 C(584,870,2.45,.85,.55,'white',Math.PI,.45);B(584,870,2.5,.05,.6,1.325,'marble');
 buildKitchenDetails(world,root,materials,upper);
 // Service passage separates the bathroom, store, small bedroom and L-shaped yard.
 shelf(...P(712,746),1.05,2.1,Math.PI/2,.45);B(750,741,.5,.7,.5,.8,'black');
 buildUtilityYard(world,root,materials);
 // Main bedroom: headboard to the west, a genuinely open divider and sofa facing east.
 const [bx,bz]=P(579,331);soft(2.08,.23,2.13,bx,.98,bz,'walnut');soft(2,.23,2,bx,1.19,bz,'blue');soft(.48,.14,1.55,bx-.65,1.38,bz,'cream');block(bx,bz,2.12,2.17,0,1.42);
 buildBedroomDetails(world,root,materials);
 buildBedsideTables(world,root,materials);
 buildBedroomStorage(world,root,materials);S(680,330,2.3,Math.PI/2,'cream',.75);
 const [mx,mz,my]=MIRROR_POSITION;painting(mx,my,mz,.87,2.08,0x7a8480,MIRROR_YAW);T('board',570,390,2.23,'Look behind the bedroom mirror');
 C(778,335,2.35,.45,.42,'walnut',-Math.PI/2,.75);paint(780,331,2.24,1.89,1.06,0x101917,-Math.PI/2);T('staff',685,405,1.5,'Read the note beside the bed');
 C(797,346,3.3,2.5,.58,'walnut',Math.PI/2,.75);C(896,346,3.3,2.5,.58,'walnut',-Math.PI/2,.75);C(846,403,2.35,2.5,.6,'walnut',Math.PI,.75);
 buildMasterVanity(world,root,materials);C(807,281,.9,2.4,.4,'walnut',Math.PI,.75);
  // Main bathroom and meditation bay.
 buildMasterBathroom(world,root,materials);
 buildMassageChair(world,root,materials);
 // Supplied bedroom photos supersede the proposed furniture arrangement.
 buildSecondBedroom(world,root,materials);
 buildGuestBathroom(world,root,materials);
 buildWindowLounge(world,root,materials);
 buildClawMachine(world,root,materials);buildPinballMachine(world,root,materials);
 addHouseDetails(world,root,materials);
 buildPowderBathroom(world,root,materials);
 // Downlights follow rooms and their ceiling heights; moonlight enters the bays.
 root.add(new THREE.HemisphereLight(0x91a9ba,0x392b1e,.55));
 for(const [px,pz,b,p] of [[838,701,.15,12],[710,681,.15,11],[627,565,.5,9],[468,608,-.08,15],[376,584,-.08,10],[414,835,.4,12],[602,796,.25,13],[732,918,.25,9],[940,591,.2,8],[704,352,.45,10],[570,287,.45,10],[844,379,.45,10],[1022,409,.45,8],[906,191,.4,8],[417,310,.5,9],[371,441,.45,7]])L(px,pz,b,p);
 world.flicker=L(942,569,.2,9);world.flicker.userData.baseIntensity=9;
 for(const p of [[238,617],[290,269]]){const [x,z]=P(...p);light(x,2.8,z,0x8aa9d0,17,9);}
 const [lx,lz]=P(940,803);light(lx,2.8,lz,0xcbd1c6,13,6);
 const [nx,nz]=P(100,400);
 const rain=new Float32Array(1300*3);for(let i=0;i<rain.length;i+=3){rain[i]=nx+(i*7.31%6);rain[i+1]=i*1.71%16;rain[i+2]=nz-8+i*.63%30;}world.rain=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(rain,3)),new THREE.PointsMaterial({color:0x93b0c0,size:.02,transparent:true,opacity:.28}));root.add(world.rain);
 world.flashlight=new THREE.SpotLight(0xe4dfcb,28,16,.32,.6,2);world.camera.add(world.flashlight);world.flashlight.position.set(.15,-.13,0);world.flashlight.target.position.set(0,0,-7);world.camera.add(world.flashlight.target);world.flashlight.visible=false;
 root.traverse(o=>{if(o.isPointLight)o.intensity*=.7;});world.flicker.userData.baseIntensity*=.7;

 return root;
}
import {buildHomeOffice} from './home-office.js';
