import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {planPoint,PLAN_SCALE,GUEST_MIRROR_POSITION,MASTER_VANITY} from './house-layout.js';
import {addWaterTap} from './house-interactions.js';
import {INTERIOR_WALLS} from './house-architecture.js';
import {buildLivingSpeakers} from './living-speakers.js';
import {Turntable} from './turntable.js';

function helpers(world,root,m){
 const box=(w,h,d,x,y,z,key='white',parent=root)=>world.box(w,h,d,x,y,z,typeof key==='string'?m[key]:world.mat(key),parent);
 const soft=(w,h,d,x,y,z,key='cream',parent=root)=>{const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,.045),typeof key==='string'?m[key]:world.mat(key));mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 const at=(px,pz,y=.75,a=0)=>{const g=new THREE.Group(),[x,z]=planPoint(px,pz);g.position.set(x,y,z);g.rotation.y=a;root.add(g);return g;};
 const block=(px,pz,w,d)=>{const [x,z]=planPoint(px,pz);world.colliders.push({x,z,w,d});};
 const cyl=(r,h,x,y,z,key='steel',p=root)=>world.cyl(r,r,h,x,y,z,typeof key==='string'?m[key]:world.mat(key),p,16);
 return {box,soft,at,block,cyl};
}

export function buildSecondBedroom(world,root,m){
 const {box,soft,at,block,cyl}=helpers(world,root,m);
 // Enter eastwards, with the mirror on the north (left) wall. The room opens
 // north of the closet; the bed is on its west side and piano/desk on the east.
 const bed=at(954,339);bed.name='Second bedroom bed';
 soft(2.08,.28,2.12,0,.23,0,'cream',bed);soft(2,.24,2.06,0,.47,0,'cream',bed);
 soft(.12,1.16,2.17,-1.01,.63,0,'cream',bed);
 for(const z of [-.53,.53]){const pillow=soft(.45,.16,.73,-.7,.66,z,'white',bed);pillow.rotation.z=-.1;}
 // A softly folded navy duvet rather than a perfectly flat mattress block.
 const duvet=new THREE.PlaneGeometry(1.26,2.08,24,28),p=duvet.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,.024*Math.sin(x*24+y*9)+.015*Math.sin(y*30)+.055*Math.exp(-((x+.22)**2)*20));}
 duvet.computeVertexNormals();duvet.rotateX(-Math.PI/2);const quilt=new THREE.Mesh(duvet,m.blue);quilt.position.set(.39,.70,0);quilt.castShadow=quilt.receiveShadow=true;bed.add(quilt);
 soft(.13,.39,2.06,1.01,.39,0,'blue',bed);soft(.48,.12,.71,.32,.77,-.3,0xb9947c,bed).rotation.y=.3;
 block(954,339,2.12,2.18);world.colliders.at(-1).top=1.49;world.colliders.at(-1).landable=true;
 const bedside=at(929,398);box(.55,.52,.46,0,.29,0,'walnut',bedside);box(.56,.03,.47,0,.565,0,'walnut',bedside);cyl(.035,.13,.14,.65,0,'teal',bedside);block(929,398,.57,.48);
 // Continuous fitted storage: the two-door entrance recess is set back,
 // while the four-door bedroom bank projects forward. Both fill to the wall.
 const fittedCloset=(x0,x1,front,back,doors,name)=>{
  const px=(x0+x1)/2,pz=(front+back)/2,w=(x1-x0)/PLAN_SCALE,d=(back-front)/PLAN_SCALE,g=at(px,pz,.75,Math.PI);g.name=name;
  box(w,2.66,d,0,1.33,0,'plaster',g);const face=w-.15;
  box(face,2.45,.035,0,1.245,d/2+.006,'walnut',g);
  for(let i=0;i<doors;i++){const x=-face/2+(i+.5)*face/doors;box(face/doors-.007,2.42,.025,x,1.245,d/2+.029,'walnut',g);box(.011,.43,.024,x+(i%2?-.12:.12),1.08,d/2+.055,'black',g);}
  block(px,pz,w,d+.04);world.colliders.at(-1).label=name;return g;
 };
 const entryStorage=fittedCloset(853,910,482,531,2,'Recessed second-bedroom entrance cupboard');
 const closet=fittedCloset(910,984,457,482,4,'Fitted second-bedroom wardrobe bank');
 world.guestClosets={entryStorage,closet};
 const [mx,mz,my]=GUEST_MIRROR_POSITION;box(.92,2.22,.055,mx,my,mz,'oak');box(.80,2.1,.061,mx,my,mz+.012,0x84928b);
 // Upright piano faces the bed. Its keyboard and pedals remain below the lid.
 const piano=at(1040,385,.75,-Math.PI/2);piano.name='Second bedroom piano';
 box(1.48,1.16,.4,0,.58,-.08,'black',piano);box(1.51,.08,.6,0,.77,0,'black',piano);
 for(let i=0;i<35;i++){const x=-.7+i*.04;box(.038,.022,.19,x,.827,.17,'white',piano);if(![2,6].includes(i%7))box(.022,.026,.11,x+.021,.852,.125,'black',piano);}
 for(const x of [-.65,.65])box(.055,.73,.06,x,.365,.25,'black',piano);
 for(const x of [-.08,0,.08])box(.034,.022,.14,x,.075,.23,'steel',piano);
 soft(.65,.1,.4,0,.47,.77,'black',piano);for(const x of [-.26,.26])for(const z of [.63,.91])box(.035,.42,.035,x,.21,z,'black',piano);
 box(.3,.045,.22,-.35,1.19,-.04,0x813640,piano);box(.26,.045,.19,-.33,1.235,-.04,'cream',piano);block(1040,385,.62,1.51);block(1010,385,.43,.69);
 // Writing desk toward the window, across from the bed.
 const desk=at(1040,312,.75,-Math.PI/2);box(1.07,.07,.6,0,.76,0,'walnut',desk);
 for(const x of [-.49,.49]){box(.045,1.4,.045,x,.7,-.24,'walnut',desk);box(.045,.72,.045,x,.36,.24,'walnut',desk);}box(1.08,.035,.24,0,1.36,-.15,'walnut',desk);
 box(.65,.44,.045,0,1.04,-.12,'white',desk);box(.595,.36,.012,0,1.065,-.09,'black',desk);box(.45,.025,.16,0,.81,.13,'white',desk);cyl(.045,.11,.38,.85,.07,'cream',desk);block(1040,312,.64,1.1);
 soft(.45,.1,.44,0,.47,.66,'walnut',desk);soft(.43,.46,.07,0,.71,.84,'walnut',desk);cyl(.023,.42,0,.21,.66,'steel',desk);block(1015,312,.43,.49);
 // Low window storage, bedside vanity and muted framed art seen in the photos.
 const storage=at(992,282);box(1.48,.65,.34,0,.325,0,'white',storage);
 for(const x of [-.49,0,.49]){box(.43,.25,.035,x,.47,.187,'cream',storage);box(.43,.23,.035,x,.18,.187,0x8c796c,storage);}block(992,282,1.5,.36);
 for(let i=0;i<5;i++)box(.13,.09+.02*(i%2),.14,-.57+i*.22,.7,.01,i%2?'cream':'teal',storage);
 for(const z of [355,381,410]){const art=at(1049,z,2.48,-Math.PI/2);box(.55,.46,.03,0,0,0,z===381?'teal':0x943d55,art);box(.49,.40,.035,0,0,.007,'cream',art);box(.40,.23,.04,0,-.065,.011,z===381?0x58806c:0x98677a,art);}
 const ac=at(913,337,3.1,Math.PI/2);soft(1.05,.27,.2,0,0,0,'white',ac);box(.91,.035,.035,0,-.09,.108,'black',ac);
 const rug=at(980,430,.762);box(2.45,.012,.96,0,0,0,0xb8a58b,rug);box(2.28,.015,.80,0,.003,0,0x9f8c70,rug);box(2.11,.017,.65,0,.005,0,0xb3a287,rug);
 for(let i=0;i<36;i++)for(const z of [-.51,.51])box(.012,.009,.09,-1.18+i*.067,0,z,'cream',rug);
}

export function addHouseDetails(world,root,m){
 const {box,soft,at,cyl}=helpers(world,root,m);
 // Pleated curtains hang beside the glazing, leaving the doors and routes open.
 for(const [px,pz,width,height,yaw,base] of [[923,280,.45,2.45,0,.78],[1040,280,.46,2.45,0,.78],[303,541,.36,2.72,Math.PI/2,.05],[303,704,.36,2.72,Math.PI/2,.05],[346,188,.3,2.45,0,.78]]){
  const g=at(px,pz,base,yaw),geo=new THREE.PlaneGeometry(width,height,30,1),p=geo.attributes.position;
  for(let i=0;i<p.count;i++)p.setZ(i,.044*Math.sin(p.getX(i)/width*Math.PI*12));geo.computeVertexNormals();const curtain=new THREE.Mesh(geo,m.cream);curtain.position.y=height/2;curtain.castShadow=curtain.receiveShadow=true;g.add(curtain);box(width+.08,.04,.16,0,height+.015,0,'plaster',g);
 }
 // Three-blade ceiling fans visible in the living area and bedroom photographs.
 for(const [px,pz,y] of [[440,610,2.73],[983,352,3.21]]){
  const g=at(px,pz,y);cyl(.065,.17,0,.06,0,'white',g);cyl(.13,.085,0,-.05,0,'white',g);
  for(let i=0;i<3;i++){const shape=new THREE.Shape();shape.moveTo(.07,-.03);shape.bezierCurveTo(.26,-.13,.6,-.21,.71,-.07);shape.bezierCurveTo(.73,.02,.36,.06,.07,.04);const geo=new THREE.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:false});geo.rotateX(-Math.PI/2);const blade=new THREE.Mesh(geo,m.steel);blade.rotation.y=i*Math.PI*2/3;blade.position.y=-.08;blade.castShadow=true;g.add(blade);}
 }
 // Domestic finishing details: switch plates, outlets and sink tap spout.
 for(const [px,pz,y,a] of [[855,481,1.62,Math.PI/2],[526,819,1.35,Math.PI/2],[1049,401,1.05,-Math.PI/2],[415,400,1.6,0]]){
  const g=at(px,pz,y,a);box(.084,.084,.014,0,0,0,'white',g);for(const x of [-.018,.018])box(.018,.045,.017,x,0,.004,'cream',g);
 }
 // Mount on the entrance's actual 160 mm return wall, below the intercom.
 const wall=INTERIOR_WALLS.find(w=>w.id==='shoe-cabinet-return'),yaw=-Math.atan2(wall.b[1]-wall.a[1],wall.b[0]-wall.a[0])-Math.PI;
 const entranceSwitch=at((wall.a[0]+wall.b[0])/2,(wall.a[1]+wall.b[1])/2,1.55,yaw);
 entranceSwitch.name='Entrance wall switch';entranceSwitch.position.addScaledVector(new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),.087);
 box(.084,.084,.014,0,0,0,'white',entranceSwitch);for(const x of [-.018,.018])box(.018,.045,.017,x,0,.004,'cream',entranceSwitch);
 const [sx,sz]=planPoint(535,801);const tap=new THREE.Mesh(new THREE.TorusGeometry(.085,.018,8,16,Math.PI),m.steel);tap.position.set(sx+.085,1.70,sz);root.add(tap);cyl(.018,.07,sx+.17,1.665,sz,'steel');
 const handle=box(.02,.065,.065,sx-.05,1.57,sz,'steel');
 addWaterTap(world,root,{id:'kitchen-tap',name:'kitchen tap',spout:[sx+.17,1.63,sz],bottom:1.375,control:[sx-.05,1.58,sz],handle});
 buildLivingSpeakers(world,root,m);
}

export function buildMasterVanity(world,root,m){
 const {box,at,block,cyl}=helpers(world,root,m),v=MASTER_VANITY;
 const g=at(...v.center,v.floor);g.name='C-23 master bathroom vanity';
 const stone=world.mat(0xb29b80,.26,.08);m.vanityStone=stone;stone.userData.textureMeters=1.9;
 const basin=world.mat(0x79584a,.34,.04);m.basinBrown=basin;
 const put=(w,h,d,x,y,z,material=stone)=>world.box(w,h,d,x,y,z,material,g);
 // Full marble apron, end panels and top strips leave the basin truly open.
 put(1.86,.872,.02,0,.436,.29);for(const x of [-.94,.94])put(.02,.88,.58,x,.44,0);
 put(1.86,.72,.018,0,.36,-.29);
 for(const x of [-.85,.85])put(.2,.02,.6,x,.89,0);
 put(1.5,.02,.295,0,.89,-.1525);put(1.5,.02,.055,0,.89,.2725);
 put(1.9,.12,.02,0,.96,-.285);
 // A 12 mm solid-surface trough with 130 mm depth, rather than a flat decal.
 put(1.476,.012,.226,0,.767,.12,basin);
 for(const x of [-.744,.744])put(.012,.142,.25,x,.832,.12,basin);
 for(const z of [.001,.239])put(1.476,.142,.012,0,.832,z,basin);
 for(const x of [-.36,.36]){
  box(.055,.008,.055,x,.905,-.10,'black',g);box(.034,.19,.034,x,1.004,-.10,'black',g);
  box(.034,.029,.135,x,1.09,-.044,'black',g);box(.027,.035,.027,x,1.06,.008,'black',g);
  const handle=box(.052,.012,.018,x+.026,1.077,-.10,'black',g);
  addWaterTap(world,g,{id:`master-tap-${x}`,name:'basin tap',spout:[x,1.042,.028],bottom:.782,control:[x,1.08,.01],handle});
  const drain=cyl(.022,.002,x,.774,.12,'steel',g);drain.name='Basin drain';
 }
 // The drawing shows a black frame and 100 x 3 mm bottom ledge.
 const mirror=at(...v.mirror,v.mirrorY);mirror.name='Master vanity mirror backing';
 box(v.mirrorWidth+.024,v.mirrorHeight+.024,.022,0,0,0,'black',mirror);
 box(v.mirrorWidth,v.mirrorHeight,.004,0,0,.013,0x8b9793,mirror);
 box(v.mirrorWidth+.04,.003,.10,0,-v.mirrorHeight/2-.012,.025,'black',mirror);
 for(const y of [-.60,.32])box(1.9,.02,.028,0,y,-.03,'black',mirror);
 // A few non-identifying countertop details from the drawn elevation.
 for(const x of [.66,.80]){box(.105,.11,.07,x,.96,-.12,'white',g);box(.055,.014,.055,x,1.022,-.12,'black',g);}
 block(...v.center,v.width,v.depth);
}

export function buildLivingAudioShelf(world,root,m){
 const {box,at,block,cyl}=helpers(world,root,m);
 const g=at(374,715,.45,Math.PI);g.name='Living room display and record shelf';
 const plinth=at(374,715,0);box(2.90,.447,.37,0,.2235,0,'marble',plinth);
 const metal=world.mat(0x8c8880,.4,.55),silver=world.mat(0xc3c3bc,.42,.2);
 box(2.88,.025,.36,0,.71,0,'marble',g);box(2.88,.025,.34,0,.013,0,'marble',g);box(2.88,.68,.025,0,.36,-.16,'walnut',g);
 for(let i=0;i<=6;i++)box(.024,.68,.34,-1.44+i*.48,.36,0,'walnut',g);
 for(let i=0;i<6;i++){
  const x=-1.2+i*.48;
  if(i%2===0)world.box(.446,.658,.018,x,.355,.174,metal,g);
  else{
   box(.455,.022,.32,x,.35,0,'walnut',g);
   for(let j=0;j<5;j++){const xx=x-.16+j*.07;box(.053,.22+.025*(j%2),.15,xx,.13,.015,[0x756b5b,0x2d4c58,0xa06a48,0x51484b,0xc0b596][j],g);box(.043,.017,.006,xx,.16,.094,'cream',g);}
   box(.31,.17,.19,x,.445,.02,i===3?'white':'black',g);cyl(.018,.018,x+.10,.45,.124,'steel',g).rotation.x=Math.PI/2;
  }
 }
 // LPs lean on a black stand; covers are abstract, not personal photographs.
 const lp=at(413,715,1.2,Math.PI);box(.42,.035,.22,0,0,0,'black',lp);
 for(let i=0;i<5;i++){const record=box(.32,.32,.012,0,.17,-.06+i*.021,[0x5e6150,0x827565,0xa09276,0x303b43,0x695344][i],lp);record.rotation.x=-.14;}
 for(const x of [-.11,.11])box(.022,.12,.12,x,.055,.06,'black',lp);
 for(let i=0;i<3;i++)box(.24,.075,.18,.35+i*.26,.76,0,i%2?'cream':'blue',g);
 const ornament=cyl(.11,.025,-.67,.754,0,'steel',g);ornament.scale.z=.7;
 block(374,715,2.9,.37);world.colliders.at(-1).handTop=1.18;
 // Corner rack with a turntable above two amplifier shelves.
 const rack=at(333,700,0,Math.PI/2);rack.name='Turntable and amplifier rack';
 for(const x of [-.26,.26])for(const z of [-.20,.20])cyl(.017,.81,x,.43,z,'steel',rack);
 for(const y of [.10,.38,.75])box(.60,.033,.49,0,y,0,'walnut',rack);
 for(const y of [.205,.485]){
  box(.49,.15,.37,0,y,0,'black',rack);
  for(const x of [-.135,.135])world.box(.19,.125,.016,x,y,.193,silver,rack);
  cyl(.006,.004,0,y,.207,0xc4bd71,rack).rotation.x=Math.PI/2;
 }
 box(.49,.055,.35,0,.797,0,'walnut',rack);world.turntable=new Turntable(world,rack,m);
 const [rx,rz]=planPoint(333,700);world.turntablePosition=new THREE.Vector3(rx,.86,rz);
 block(333,700,.52,.64);
}
