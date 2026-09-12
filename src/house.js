import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {HOUSE_ROOMS,HOUSE_STAIRS,planPoint,PLAN_SCALE,MIRROR_POSITION} from './house-layout.js';
import {floorPieces} from './plan-geometry.js';

// Authored game geometry based on the supplied contract plan and walkthrough.
export function buildHouse(world){
 const root=new THREE.Group();root.name='Plan-based home';world.scene.add(root);world.houseRoot=root;
 const materials={plaster:world.mat(0xcfc9b9,.93),sage:world.mat(0x78816b,.55),marble:world.mat(0xd1c9b8,.25,.07),oak:world.mat(0x956a40,.58),white:world.mat(0xe1ded0,.8),black:world.mat(0x171a19,.46),steel:world.mat(0x808480,.24,.8),orange:world.mat(0xb74720,.94),cream:world.mat(0xc6bfa8,.96),teal:world.mat(0x315e5b,.65),walnut:world.mat(0x4b3126,.55),blue:world.mat(0x1b293a,.94),glass:new THREE.MeshStandardMaterial({color:0x809da2,roughness:.16,metalness:.18,transparent:true,opacity:.12,side:THREE.DoubleSide})};world.houseMaterials=materials;
 const mat=v=>typeof v==='string'?materials[v]:typeof v==='number'?world.mat(v):v;
 const box=(w,h,d,x,y,z,m='white',p=root)=>world.box(w,h,d,x,y,z,mat(m),p);
 const cyl=(a,b,h,x,y,z,m='white',p=root,n=20)=>world.cyl(a,b,h,x,y,z,mat(m),p,n);
 const sphere=(r,x,y,z,m='white',p=root,sx=1,sy=1,sz=1)=>world.sphere(r,x,y,z,mat(m),p,sx,sy,sz);
 const soft=(w,h,d,x,y,z,m,p=root)=>{const o=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,.06),mat(m));o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;};
 const block=(x,z,w,d,angle=0)=>world.colliders.push({x,z,w,d,angle});
 const wall=(x0,z0,x1,z1,m='plaster',h=3.5,b=0)=>{const w=Math.hypot(x1-x0,z1-z0),x=(x0+x1)/2,z=(z0+z1)/2,a=-Math.atan2(z1-z0,x1-x0);const mesh=box(w,h,.15,x,b+h/2,z,m);mesh.rotation.y=a;box(w,.05,.17,x,b+.025,z,'white').rotation.y=a;block(x,z,w,.15,a);};
 const light=(x,y,z,color=0xffdca4,power=15,range=9)=>{const l=new THREE.PointLight(color,power,range,2);l.position.set(x,y,z);root.add(l);return l;};
 const down=(x,z,b=0,p=13)=>{cyl(.09,.09,.025,x,b+2.97,z,new THREE.MeshStandardMaterial({color:0xffe5b6,emissive:0xffcf87,emissiveIntensity:1.4}));return light(x,b+2.87,z,0xffdba8,p);};
 const painting=(x,y,z,w,h,c,a=0)=>{const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=a;root.add(g);box(w+.07,h+.07,.04,0,0,0,'walnut',g);box(w,h,.047,0,0,.012,c,g);return g;};
 const cabinet=(x,z,w,h,d,m='sage',a=0,b=0)=>{const g=new THREE.Group();g.position.set(x,b,z);g.rotation.y=a;root.add(g);box(w,h,d,0,h/2,0,m,g);const n=Math.max(1,Math.round(w/.55));for(let i=0;i<n;i++){const dx=-w/2+(i+.5)*w/n;box(w/n-.016,h-.03,.024,dx,h/2,d/2+.008,m,g);box(.012,.13,.025,dx+w/n*.35,h*.45,d/2+.035,'steel',g);}block(x,z,Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*d,Math.abs(Math.cos(a))*d+Math.abs(Math.sin(a))*w);return g;};
 const sofa=(x,z,w,a,m='orange',b=0)=>{const g=new THREE.Group();g.position.set(x,b,z);g.rotation.y=a;root.add(g);soft(w,.26,.98,0,.27,0,m,g);soft(w,.58,.25,0,.65,-.43,m,g);const n=Math.round(w/.7);for(let i=0;i<n;i++)soft(w/n-.025,.2,.72,-w/2+(i+.5)*w/n,.48,.08,m,g);for(const dx of [-w/2+.08,w/2-.08])soft(.19,.37,1.04,dx,.51,0,m,g);for(const [dx,c] of [[-w*.28,'cream'],[w*.22,'blue']]){const p=soft(.44,.43,.16,dx,.79,-.18,c,g);p.rotation.x=-.17;p.rotation.z=dx*.15;}block(x,z,Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*1.03,Math.abs(Math.cos(a))*1.03+Math.abs(Math.sin(a))*w);};
 const chair=(x,z,a,b=0)=>{const g=new THREE.Group();g.position.set(x,b,z);g.rotation.y=a;root.add(g);soft(.5,.09,.49,0,.46,0,'cream',g);soft(.5,.52,.09,0,.74,-.23,'cream',g);for(const u of [-.19,.19])for(const v of [-.18,.18])cyl(.014,.012,.44,u,.22,v,'steel',g);block(x,z,.55,.58);};
 const plant=(x,z,b=0,s=1)=>{cyl(.2*s,.15*s,.35*s,x,b+.175*s,z,'walnut');for(let i=0;i<7;i++){const a=i*2.4,o=sphere(.23*s,x+Math.cos(a)*.2*s,b+.5*s+i*.065*s,z+Math.sin(a)*.2*s,0x273d27,root,.45,1.6,.8);o.rotation.z=Math.sin(a)*.6;}block(x,z,.45*s,.45*s);};
 const shelf=(x,z,w,h,a=0,b=0)=>{const g=new THREE.Group();g.position.set(x,b,z);g.rotation.y=a;root.add(g);box(w,h,.12,0,h/2,-.18,'black',g);for(let j=0;j<6;j++){const y=.1+j*(h-.1)/5;box(w,.035,.42,0,y,0,'walnut',g);for(let i=0;i<Math.floor(w/.13);i++){const v=.14+(i*17+j*7)%11*.01;box(.065+(i%3)*.012,v,.17,-w/2+.1+i*.13,y+v/2+.03,.03,[0x705548,0x343f39,0x7f755b,0x343d53,0x8a4d38][(i+j)%5],g);}}block(x,z,Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*.44,Math.abs(Math.cos(a))*.44+Math.abs(Math.sin(a))*w);};
 const P=planPoint,scale=PLAN_SCALE;
 const B=(px,pz,w,h,d,y,m='white',a=0)=>{const [x,z]=P(px,pz),o=box(w,h,d,x,y,z,m);o.rotation.y=a;return o;};
 const W=(x0,z0,x1,z1,m='plaster',h=3.5,b=0)=>wall(...P(x0,z0),...P(x1,z1),m,h,b);
 const C=(px,pz,w,h,d,m='sage',a=0,b=.75)=>cabinet(...P(px,pz),w,h,d,m,a,b);
 const S=(px,pz,w,a,m='orange',b=0)=>sofa(...P(px,pz),w,a,m,b);
 const L=(px,pz,b=.75,p=11)=>down(...P(px,pz),b,p);
 const paint=(px,pz,y,w,h,c,a=0)=>{const [x,z]=P(px,pz);return painting(x,y,z,w,h,c,a);};
 const T=(id,px,pz,y,name)=>{const [x,z]=P(px,pz);world.targets.push({id,pos:new THREE.Vector3(x,y,z),name});};
 const slab=(poly,y,m)=>{const shape=new THREE.Shape(poly.map(([x,z])=>new THREE.Vector2(x,-z)));const geo=new THREE.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);const o=new THREE.Mesh(geo,mat(m));o.position.y=y;o.receiveShadow=true;root.add(o);return o;};
 for(const r of HOUSE_ROOMS){
  const timber=['bedroom','bedroom_hall','wardrobe','meditation','theatre','wine','guest'].includes(r.id);
  for(const p of floorPieces(r.polygon,HOUSE_STAIRS))slab(p,r.floor,timber?'oak':'marble');
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
 // Main envelope. Bays retain their angled corners instead of rectangular rooms.
 for(const a of [[299,232,350,181],[350,181,448,181],[448,181,476,208],[476,208,519,208],[299,232,299,332],[299,332,331,359],[331,359,331,397],[331,397,314,397],[314,397,299,409],[299,409,299,468],[299,468,314,482],[314,482,317,482],[317,482,317,548],[317,548,245,548],[245,548,222,575],[222,575,222,670],[222,670,245,695],[245,695,317,695],[317,695,317,741],[317,741,274,741],[274,741,248,768],[248,768,248,850],[248,850,276,883],[276,883,650,883]])W(...a,'plaster',.7);
 // Glazing above low exterior walls, with real mullions and dark views outside.
 const window=(x0,z0,x1,z1,b=.7,h=2.45)=>{const [a,c]=P(x0,z0),[d,e]=P(x1,z1),len=Math.hypot(d-a,e-c),angle=-Math.atan2(e-c,d-a);const glass=box(len,h,.02,(a+d)/2,b+h/2,(c+e)/2,'glass');glass.rotation.y=angle;for(let i=0;i<=Math.ceil(len/1.1);i++){const t=i/Math.ceil(len/1.1);box(.045,h,.045,a+(d-a)*t,b+h/2,c+(e-c)*t,'black');}box(len,.05,.07,(a+d)/2,b,(c+e)/2,'black').rotation.y=angle;};
 for(const a of [[299,232,350,181],[350,181,448,181],[299,232,299,332]])window(...a,1.3,2.25);
 for(const a of [[245,548,222,575],[222,575,222,670],[222,670,245,695],[274,741,248,768],[248,768,248,850]])window(...a,.85,2.15);
 for(const a of [[521,149,538,135],[538,135,584,135],[584,135,601,149],[521,149,521,249],[601,149,601,208],[602,208,868,208],[868,135,942,135],[942,135,952,150],[952,150,952,254],[952,254,1053,273],[1053,273,1053,563],[1053,563,984,563],[984,563,984,706],[984,706,1002,724],[1002,724,1002,820],[1002,820,948,876],[948,876,854,816],[854,816,756,718],[650,953,851,953],[851,953,851,920],[851,920,826,907],[826,907,826,857],[650,883,650,953]])W(...a);
 window(612,208,860,208,1.45,1.7);window(925,273,1046,273,1.7,1.4);
 // Interior wall segments stop at actual door openings, not blocked teleport paths.
 for(const a of [[519,208,519,397],[331,397,432,397],[506,397,519,397],[299,482,415,482],[415,397,415,414],[415,451,415,482],[523,249,545,249],[578,249,602,249],[602,208,602,249],[523,249,523,415],[523,415,734,415],[772,415,783,415],[783,273,783,292],[783,330,783,393],[783,273,816,273],[853,273,910,273],[783,432,853,432],[910,273,910,432],[868,208,868,217],[868,254,902,254],[939,254,952,254],[910,457,988,457],[1026,457,1053,457],[984,457,984,563],[853,457,853,482],[891,457,910,457],[853,482,853,531],[853,531,866,531],[904,531,984,531],[853,531,853,632],[984,632,947,632],[910,632,653,632],[653,482,853,482],[523,718,543,718],[560,718,650,718],[523,739,523,819],[523,855,523,883],[650,718,650,761],[650,797,650,824],[650,860,650,883],[650,718,691,718],[691,718,723,718],[763,726,824,786],[691,718,691,816],[691,786,753,786],[792,786,824,786],[691,816,708,816],[744,816,822,816],[691,857,875,857],[650,857,666,857],[699,857,826,857]])W(...a);
 W(543,718,560,718,"plaster",1.75);W(543,718,560,718,"plaster",.65,2.85);window(543,718,560,718,1.75,1.1);
 W(653,482,653,530,"glass",2.15,.75);W(653,598,653,632,"glass",2.15,.75);
 // Raised living-room perimeter/plinths; only the planned stair runs are passable.
 for(const a of [[317,532,458,532],[514,532,611,532],[562,532,562,650],[317,714,431,714],[523,714,539,714]])W(...a,'marble',.45);
 // Dark glass front door on the diagonal lobby wall (GD01, 1,865 x 2,200 mm).
 const doorFrame=new THREE.Group();doorFrame.rotation.y=Math.PI/4;doorFrame.position.y=.45;root.add(doorFrame);
 for(const x of [-.965,.965])box(.06,2.24,.12,x,1.12,0,'steel',doorFrame);box(1.99,.08,.12,0,2.24,0,'steel',doorFrame);
 world.door=new THREE.Group();world.door.name='Front door';world.door.position.x=-.9325;doorFrame.add(world.door);world.door.rotation.y=-1.45;
 box(1.865,2.2,.045,.9325,1.1,0,0x1b2726,world.door);box(.025,.8,.06,1.67,1.13,.07,'steel',world.door);for(const x of [.04,.7,1.83])box(.02,2.2,.055,x,1.1,.01,'steel',world.door);
 // Lobby floor and entrance floor inlays. The resident remains inside the door.
 slab([[854,816],[908,762],[944,706],[984,706],[1002,724],[1002,820],[948,876]].map(p=>P(...p)),.45,'marble');
 B(962,848,1.75,2.35,.055,1.625,'steel',Math.PI/4);B(974,834,.13,.23,.04,1.9,'black',Math.PI/4);
 B(843,748,.6,.008,3.07,.454,0x35463b,-Math.PI/4);B(920,804,2.05,.009,1.45,.455,0x775139,-Math.PI/4);
 const [ix,iz]=P(931,793);cyl(.59,.59,.008,ix,.46,iz,0x846348,root,48);
 const red=paint(811,636,1.96,1.12,1.46,0x991b23);const ring=new THREE.Mesh(new THREE.TorusGeometry(.41,.055,10,60),mat('black'));ring.scale.y=1.2;ring.position.z=.05;red.add(ring);
 C(749,641,2.1,.8,.5,'walnut',0,.45);B(749,641,2.15,.055,.6,1.28,'marble');C(956,736,1.52,1.215,.45,'sage',Math.PI/4,.45);
 T('records',749,644,1.31,'Read the entry notebook');T('radio',909,708,1.85,'House intercom');B(910,707,.2,.28,.035,1.85,'black');
 const [dx,dz]=P(881,789);world.targets.push({id:'door',pos:new THREE.Vector3(dx,1.9,dz),name:'Front door'},{id:'post',pos:new THREE.Vector3(dx,1.9,dz),name:'Begin the night at the front door',explorationOnly:true});
 // 1,210 x 690 mm office desk, 570 mm cabinets and the blue chair from the video.
 C(967,554,1.355,2.48,.57,'sage',-Math.PI/2,.75);B(869,566,.69,.04,1.21,1.5,'oak');block(...P(869,566),.69,1.21);B(861,566,.07,.47,.7,1.78,'black');B(862,566,.009,.39,.61,1.79,new THREE.MeshBasicMaterial({color:0x273a33}));
 const [cx,cz]=P(898,566);soft(.6,.14,.63,cx,1.22,cz,'blue');soft(.6,.94,.14,cx+.22,1.6,cz,'blue').rotation.y=Math.PI/2;block(cx,cz,.65,.7);T('media',865,566,1.8,'Listen to the computer recording');
 // Sunken lounge: orange seating on the plinth, cream seating, blue low table.
 S(535,584,3.25,-Math.PI/2);S(406,553,2.75,0);S(390,693,2.7,Math.PI,'cream');B(436,620,4.8,.012,3.55,.014,0x4b5039);
 const [tx,tz]=P(432,611);cyl(.64,.6,.29,tx,.15,tz,0x253965,root,40);block(tx,tz,1.3,1.3);for(let i=0;i<3;i++)box(.23,.045,.31,tx-.25+i*.24,.325,tz,0xa59677);
 C(375,516,2.5,2.15,.6,'sage',0,.75);C(561,501,2.5,2.15,.6,'sage',0,.75);C(537,551,.57,.45,.55,'steel',0,.45);
 // Wine cellar island (1,975 x 1,200 x 975 mm) and bottle racks behind glass.
 C(758,555,1.975,.93,1.2,'walnut',0,.75);B(758,555,2.015,.045,1.24,1.7025,'marble');
 for(const y of [500,615]){C(759,y,4.6,.5,.45,'walnut',y===500?0:Math.PI,.75);for(let j=0;j<6;j++)for(let i=0;i<18;i++){const [x,z]=P(676+i*9,y);const bottle=cyl(.035,.04,.28,x,1.4+j*.2,z,0x29382d);bottle.rotation.x=Math.PI/2;}}
 for(const a of [[653,482,653,530],[653,598,653,632]])window(...a,.75,2.15);
 // Dining table, chairs, amber pendant lights and a sideboard matching the video.
 const [dtx,dtz]=P(416,802);soft(2.8,.12,1.15,dtx,1.22,dtz,'oak');block(dtx,dtz,2.8,1.15);for(const x of [-.95,.95])box(.12,.68,.75,dtx+x,.85,dtz,'black');
 for(const x of [-.9,0,.9]){chair(dtx+x,dtz-.94,Math.PI,.45);chair(dtx+x,dtz+.94,0,.45);for(let j=0;j<3;j++)cyl(.33-j*.055,.3-j*.055,.1,dtx+x,2.73-j*.1,dtz,0xad7b38);light(dtx+x,2.35,dtz,0xffbd75,6);}
 C(420,870,3.53,.45,.55,'steel',Math.PI,.45);plant(...P(280,773),.45,1.1);S(281,650,.9,Math.PI/2,'cream');
 // Kitchen dimensions and finishes from sheets 50-56: 900 mm worktops, 600 mm depth.
 C(536,773,2.364,.855,.6,'oak',Math.PI/2,.45);B(536,773,.65,.045,2.414,1.3275,'marble');
 C(584,731,2.3,.855,.6,'oak',0,.45);B(584,731,2.35,.045,.65,1.3275,'marble');
 B(584,722.5,2.42,.72,.035,1.71,0x31593e);B(525,771,.035,.7,2.4,1.7,0xc7c5b4);
 B(577,734,1.05,.88,.62,.89,'orange');B(577,747,.95,.46,.035,.98,'orange');for(const x of [565,587]){B(x,748,.34,.025,.05,1.14,'steel');for(const z of [727,739]){const [xx,zz]=P(x,z);cyl(.095,.095,.025,xx,1.342,zz,'black');}}
 B(577,730,1.1,.78,.6,2.26,0x617259);C(629,768,.84,1.98,.74,'steel',-Math.PI/2,.45);B(613,768,.025,.88,.43,1.8,'black');
 C(537,773,.91,.6,.37,'walnut',Math.PI/2,2.2);B(536,801,.56,.015,.48,1.36,'steel');const [sx,sz]=P(535,801);cyl(.018,.018,.38,sx,1.52,sz,'steel');
 C(584,870,2.45,.85,.55,'white',Math.PI,.45);B(584,870,2.5,.05,.6,1.325,'marble');
 // Storage/service rooms and utility yard with stacked laundry and mounted bikes.
 shelf(...P(712,770),1.1,2.1,Math.PI/2,.45);B(711,741,.5,.7,.5,.8,'black');C(712,838,1.3,.75,.45,'white',0,.45);
 for(let j=0;j<2;j++){B(680,932,.62,.84,.64,.89+j*.84,'white');const [x,z]=P(680,919);cyl(.22,.22,.04,x,.89+j*.84,z,'black').rotation.x=Math.PI/2;}
 C(805,937,1.2,.8,.6,'white',Math.PI,.45);for(let k=0;k<2;k++){const [x,z]=P(720+k*50,867),g=new THREE.Group();g.position.set(x,1.8,z);root.add(g);for(const dx of [-.38,.38]){const w=new THREE.Mesh(new THREE.TorusGeometry(.3,.017,6,28),mat('black'));w.position.x=dx;g.add(w);}box(.8,.025,.025,0,.1,0,'orange',g).rotation.z=.3;}
 // Main bedroom: one bed, open shelf divider, sitting area and sliding mirror.
 const [bx,bz]=P(579,331);soft(2.08,.23,2.13,bx,.98,bz,'walnut');soft(2,.23,2,bx,1.19,bz,'blue');soft(.48,.14,1.55,bx-.65,1.38,bz,'cream');block(bx,bz,2.12,2.17);
 B(534,331,.19,2.3,3.62,1.9,'black');for(let i=0;i<11;i++)B(539,275+i*10,.015,.7,.022,1.7+(i%3)*.21,0x81857a,.2);
 shelf(...P(650,330),4.01,2.66,Math.PI/2,.75);S(725,335,2.3,-Math.PI/2,'cream',.75);C(582,404,1.6,.6,.48,'walnut',Math.PI,.75);
 T('staff',685,408,1.5,'Read the note beside the bed');const [mx,mz,my]=MIRROR_POSITION;painting(mx,my,mz,.87,2.08,0x7a8480);T('board',768,271,2.23,'Look behind the bedroom mirror');
 C(802,345,3.2,2.5,.6,'walnut',Math.PI/2,.75);C(892,345,3.2,2.5,.6,'walnut',-Math.PI/2,.75);C(846,417,2.3,.75,.6,'walnut',Math.PI,.75);
 // Main bathroom and meditation bay.
 const [tubx,tubz]=P(906,161);soft(1.72,.56,.76,tubx,1.03,tubz,'white');soft(1.5,.17,.59,tubx,1.29,tubz,'black');block(tubx,tubz,1.78,.82);
 C(922,218,1.16,.8,.5,'oak',-Math.PI/2,.75);paint(947,218,2.2,1.1,1.05,0x8c9590,-Math.PI/2);B(886,207,.02,2.2,1.15,1.85,'glass');
 const [medx,medz]=P(560,179);cyl(.69,.72,.18,medx,.84,medz,'oak',root,48);soft(.67,.18,.67,medx,1.02,medz,'cream');plant(...P(586,157),.75,.75);
 // Second bedroom has neutral furnishings; fictional occupants only.
 const [gx,gz]=P(1009,355);soft(1.9,.24,2.05,gx,.99,gz,'walnut');soft(1.8,.23,1.95,gx,1.21,gz,'cream');block(gx,gz,1.95,2.1);C(972,285,2.4,.7,.58,'oak',0,.75);
 C(1038,492,1,.85,.55,'white',-Math.PI/2,.75);B(998,488,.02,2.2,1.2,1.85,'glass');
 // Window lounge/home theatre bay, framed glazing, cream seating and telescope.
 S(347,293,2.4,Math.PI/2,'cream',.75);C(498,296,3.78,2.6,.45,'black',-Math.PI/2,.75);B(487,296,.025,1.58,2.82,2.04,'black');
 const [ttx,ttz]=P(388,250);cyl(.034,.034,1.15,ttx,1.3,ttz,'steel');cyl(.11,.1,.78,ttx,2.05,ttz,'cream').rotation.x=.9;for(let i=0;i<3;i++){const leg=cyl(.014,.014,1.1,ttx+Math.cos(i*2.1)*.25,1.17,ttz+Math.sin(i*2.1)*.25,'black');leg.rotation.z=Math.cos(i*2.1)*.5;}block(ttx,ttz,.72,.72);plant(...P(359,213),.75,1.2);
 const [px,pz]=P(541,456);B(541,456,.68,.18,1.25,1.64,'black');B(541,475,.68,.7,.14,2.05,'black');B(541,455,.56,.025,1.08,1.745,0x4a231d,.0);block(px,pz,.73,1.3);
 C(332,467,1.1,.86,.55,'oak',Math.PI,.75);paint(332,479,2.25,.85,1.1,0x87948b,Math.PI);B(331,417,1.1,2.2,.02,1.85,'glass');
 // Downlights follow rooms and their ceiling heights; moonlight enters the bays.
 root.add(new THREE.HemisphereLight(0x91a9ba,0x392b1e,.55));
 for(const [px,pz,b,p] of [[838,701,.15,12],[710,681,.15,11],[627,565,.5,9],[468,608,-.08,15],[376,584,-.08,10],[414,835,.4,12],[602,796,.25,13],[732,918,.25,9],[940,591,.2,8],[704,352,.45,10],[570,287,.45,10],[844,379,.45,10],[1022,409,.45,8],[906,191,.4,8],[417,310,.5,9],[371,441,.45,7]])L(px,pz,b,p);
 world.flicker=L(942,569,.2,9);world.flicker.userData.baseIntensity=9;
 for(const p of [[238,617],[290,269]]){const [x,z]=P(...p);light(x,2.8,z,0x8aa9d0,17,9);}
 const [lx,lz]=P(940,803);light(lx,2.8,lz,0xcbd1c6,13,6);
 const [nx,nz]=P(100,400);for(let i=0;i<6;i++){box(5,18,6,nx-4,5,nz+i*8,0x101c23);for(let y=0;y<15;y+=1.7)if((i+Math.round(y))%2)box(.03,.8,.5,nx-1.48,y,nz+i*8,new THREE.MeshBasicMaterial({color:0x6a6850}));}
 const rain=new Float32Array(1300*3);for(let i=0;i<rain.length;i+=3){rain[i]=nx+(i*7.31%6);rain[i+1]=i*1.71%16;rain[i+2]=nz-8+i*.63%30;}world.rain=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(rain,3)),new THREE.PointsMaterial({color:0x93b0c0,size:.02,transparent:true,opacity:.28}));root.add(world.rain);
 world.flashlight=new THREE.SpotLight(0xe4dfcb,28,16,.32,.6,2);world.camera.add(world.flashlight);world.flashlight.position.set(.15,-.13,0);world.flashlight.target.position.set(0,0,-7);world.camera.add(world.flashlight.target);world.flashlight.visible=false;
 root.traverse(o=>{if(o.isPointLight)o.intensity*=.7;});world.flicker.userData.baseIntensity*=.7;

 return root;
}
