import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {planPoint} from './house-layout.js';

// The September 13 office photos: camera storage and a left-hand desk,
// The equipment shelving faces the left desk across the room.
export function buildHomeOffice(world,root,m){
 const at=(name,px,pz,y=.75,yaw=0)=>{const g=new THREE.Group(),[x,z]=planPoint(px,pz);g.name=name;g.position.set(x,y,z);g.rotation.y=yaw;root.add(g);return g;};
 const box=(g,w,h,d,x,y,z,key)=>world.box(w,h,d,x,y,z,m[key]||key,g);
 const cyl=(g,r,rb,h,x,y,z,key,n=24)=>world.cyl(r,rb,h,x,y,z,m[key]||key,g,n);
 const soft=(g,w,h,d,x,y,z,key)=>{const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,.025),m[key]);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);return mesh;};
 const block=(g,w,d,top)=>world.colliders.push({x:g.position.x,z:g.position.z,w,d,angle:g.rotation.y,label:g.name,...(top===undefined?{}:{landable:true,top:g.position.y+top})});
 const rod=(g,a,b,r,key)=>{const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va),p=va.add(vb).multiplyScalar(.5),o=cyl(g,r,r,d.length(),p.x,p.y,p.z,key,12);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;};
 const disk=(g,r,x,y,z,key)=>{const o=cyl(g,r,r,.012,x,y,z,key);o.rotation.x=Math.PI/2;return o;};
 const keyboard=(g,x,z,width=.40)=>{box(g,width,.021,.145,x,.806,z,'black');for(let row=0;row<4;row++)for(let col=0;col<12;col++)box(g,width/14,.004,.022,x-width*.43+col*width/12.6,.819,z-.047+row*.027,'steel');};
 const litScreen=new THREE.MeshBasicMaterial({color:0xc4d7dc});
 const monitor=(g,x,y,z,w,h,lit=false)=>{
  box(g,w,h,.039,x,y,z,'black');box(g,.023,.18,.025,x,y-h/2-.075,z,'steel');box(g,.26,.012,.14,x,y-h/2-.165,z+.012,'steel');
  box(g,w-.028,h-.027,.004,x,y,z+.023,lit?litScreen:m.black);
  if(lit){box(g,w-.053,.029,.005,x,y+h/2-.036,z+.027,'blue');for(let i=0;i<9;i++)box(g,w*.52-(i%3)*.035,.009,.006,x+w*.13,y+h*.32-i*.024,z+.029,i%3===1?'teal':'steel');box(g,w*.22,h*.76,.005,x-w*.345,y-.009,z+.028,'sage');}
 };
 const cameraCabinet=at('Glass camera cabinet by office entrance',866,616,.75,Math.PI/2);
 box(cameraCabinet,.60,1.82,.53,0,.91,-.01,'black');
 // Hollow front: black body sits behind the cameras, glass doors in front.
 box(cameraCabinet,.55,1.72,.018,0,.93,.266,'glass');
 for(const y of [.06,.91,1.79])box(cameraCabinet,.59,.03,.035,0,y,.284,'steel');
 for(const x of [-.283,.283])box(cameraCabinet,.023,1.82,.037,x,.91,.283,'black');
 // Cameras project in front of the dark case, enclosed by a separate glass pane.
 for(let row=0;row<5;row++){
  const y=.20+row*.31;box(cameraCabinet,.54,.017,.25,0,y,.30,'steel');
  for(const x of [-.13,.13]){box(cameraCabinet,.15,.09,.065,x,y+.061,.32,'black');box(cameraCabinet,.07,.028,.057,x,y+.118,.32,'black');disk(cameraCabinet,.049,x,y+.062,.36,'steel');disk(cameraCabinet,.037,x,y+.062,.373,'black');disk(cameraCabinet,.020,x,y+.062,.382,'blue');}
 }
 box(cameraCabinet,.61,1.74,.013,0,.94,.395,'glass');for(const y of [.54,1.41])box(cameraCabinet,.017,.19,.029,.235,y,.418,'steel');block(cameraCabinet,.62,.84);
 const desk=at('Left desk with dual monitors',867.3,581.5,.75,Math.PI/2);
 box(desk,1.2,.045,.69,0,.777,0,'oak');for(const x of [-.49,.49]){box(desk,.055,.73,.065,x,.386,0,'steel');box(desk,.065,.04,.64,x,.055,0,'steel');}
 monitor(desk,-.30,1.19,-.20,.58,.35,true);monitor(desk,.30,1.19,-.20,.58,.35,true);keyboard(desk,.13,.15,.38);soft(desk,.055,.025,.08,.39,.82,.17,'black');
 box(desk,.2,.075,.14,-.41,.837,.16,'black');cyl(desk,.031,.031,.125,.48,.864,.15,'teal');box(desk,.8,.035,.36,0,.06,0,'black');block(desk,1.22,.71,.80);
 const simulator=at('Back desk and flight simulator',903,545,.75);
 box(simulator,1.64,.045,.66,0,.777,0,'sage');for(const x of [-.77,.77])box(simulator,.04,.76,.60,x,.38,0,'sage');
 monitor(simulator,0,1.2,-.22,1.20,.46);keyboard(simulator,-.43,.17,.42);
 for(const x of [-.1,.13])box(simulator,.025,.15,.08,x,.719,.31,'black');
 const controls=new THREE.Group();controls.name='Flight yoke and throttle quadrant';simulator.add(controls);box(controls,.48,.14,.28,.02,.86,.22,'black');
 rod(controls,[.02,.92,.26],[.02,.96,.46],.033,'black');rod(controls,[-.21,.99,.47],[.25,.99,.47],.035,'black');for(const x of [-.21,.25]){rod(controls,[x,.99,.47],[x,1.14,.45],.035,'black');disk(controls,.018,x,1.13,.485,'steel');}
 box(controls,.30,.12,.23,.55,.86,.21,'black');for(let i=0;i<4;i++){rod(controls,[.45+i*.058,.93,.18],[.45+i*.058,1.045,.24],.012,'steel');cyl(controls,.024,.024,.036,.45+i*.058,1.06,.24,'cream');}
 for(const [i,color] of ['black','blue','orange'].entries())disk(controls,.018,.47+i*.065,.84,.338,color);
 // Sage overhead cupboards leave an illuminated recess above the monitor.
 box(simulator,1.65,1.02,.42,0,1.94,-.12,'sage');for(const x of [-.275,.275])box(simulator,.009,1,.006,x,1.94,.095,'black');box(simulator,1.57,.012,.28,0,1.421,-.035,'cream');block(simulator,1.67,.69,.80);
 const pc=at('Open water-cooled computer beneath simulator',903,546,.75);
 box(pc,.66,.03,.38,0,.035,0,'black');box(pc,.66,.64,.023,0,.36,-.185,'black');
 for(const x of [-.32,.32])box(pc,.025,.68,.39,x,.37,0,'black');box(pc,.66,.025,.39,0,.705,0,'black');
 for(const y of [.30,.43]){box(pc,.45,.041,.13,-.05,y,.025,'black');box(pc,.43,.008,.015,-.05,y-.014,.106,'steel');}
 box(pc,.14,.14,.035,-.15,.59,.017,'steel');disk(pc,.045,-.15,.59,.044,'black');
 box(pc,.09,.43,.11,.22,.40,-.035,'steel');for(let i=0;i<8;i++)box(pc,.085,.011,.013,.22,.22+i*.043,.028,'black');
 const coolant=world.mat(0x1768a0,.24,.4);coolant.emissive.set(0x064c82);coolant.emissiveIntensity=.55;
 for(const path of [[[-.15,.60,.065],[-.12,.67,.09],[.17,.63,.09],[.20,.51,.09]],[[-.09,.42,.11],[.05,.49,.12],[.20,.46,.11],[.20,.32,.10]],[[-.09,.29,.11],[.03,.19,.12],[.19,.22,.11],[.20,.33,.10]]]){
  const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path.map(p=>new THREE.Vector3(...p))),24,.009,8,false),coolant);pc.add(mesh);
 }box(pc,.31,.12,.24,-.07,.14,-.01,'black');box(pc,.48,.63,.02,.73,.33,-.015,'black').rotation.z=-.08;
 // C-04, sheets 24–25: 1355 × 570 × 2480 mm in the east-wall recess.
 const shelves=at('Recessed office equipment shelving and watch winders',969.8,560,.75,-Math.PI/2);
 shelves.userData.dimensions={width:1.355,depth:.57,height:2.48};
 box(shelves,1.355,2.48,.02,0,1.24,-.275,'sage');for(const x of [-.6675,.6675])box(shelves,.02,2.48,.57,x,1.24,0,'sage');
 for(const y of [.025,.635,1.185,1.578,1.971,2.364,2.465])box(shelves,1.315,.03,.57,0,y,0,'sage');
 for(let row=0;row<3;row++)for(const x of [-.329,.329])box(shelves,.65,.19,.03,x,.12+row*.20,.279,'sage');
 const printer=new THREE.Group();printer.name='Printer';printer.position.set(.27,.65,0);shelves.add(printer);soft(printer,.46,.31,.40,0,.16,0,'white');box(printer,.45,.076,.4,0,.35,0,'black');box(printer,.4,.057,.31,-.018,.413,-.03,'white');box(printer,.25,.031,.09,-.04,.3,.22,'black');box(printer,.11,.059,.013,.14,.385,.21,'black');for(let i=0;i<4;i++)box(printer,.23,.005,.19,-.03,.449+i*.005,-.035,'cream');
 soft(shelves,.29,.07,.27,-.36,.687,.08,'white');box(shelves,.19,.23,.31,-.38,.792,-.075,'steel');
 for(const x of [-.275,.275]){
  const winders=new THREE.Group();winders.name='Eight-watch winder';winders.position.set(x,1.20,0);shelves.add(winders);box(winders,.52,.31,.28,0,.155,0,'black');
  for(let row=0;row<2;row++)for(let col=0;col<4;col++){const xx=-.19+col*.128,yy=.077+row*.15;disk(winders,.053,xx,yy,.147,'steel');disk(winders,.045,xx,yy,.157,'black');disk(winders,.023,xx,yy,.166,'cream');box(winders,.006,.030,.004,xx,yy+.009,.175,'black');}
 }
 for(let i=0;i<3;i++)box(shelves,.26,.21,.33,-.34+i*.33,1.705,0,i%2?'glass':'cream');box(shelves,.59,.16,.34,.19,2.07,0,'black');block(shelves,1.355,.57);
 // Plaster jambs frame the inset instead of leaving a freestanding cabinet.
 for(const x of [-.72,.72])box(shelves,.065,2.48,.81,x,1.24,.12,'plaster');
 box(shelves,1.44,.07,.81,0,2.515,.12,'plaster');
 const chair=at('Blue office gaming chair',903,590,.75,Math.PI/2);
 cyl(chair,.033,.055,.41,0,.24,0,'steel');for(let i=0;i<5;i++){const a=i*Math.PI*2/5;rod(chair,[0,.12,0],[Math.cos(a)*.35,.065,Math.sin(a)*.35],.019,'black');cyl(chair,.039,.039,.043,Math.cos(a)*.35,.043,Math.sin(a)*.35,'black');}
 soft(chair,.58,.12,.57,0,.46,0,'blue');soft(chair,.58,.88,.13,0,.94,-.23,'blue').rotation.x=-.10;soft(chair,.34,.17,.16,0,1.20,-.13,'black');
 for(const x of [-.34,.34]){rod(chair,[x,.39,-.08],[x,.66,-.02],.018,'black');soft(chair,.075,.07,.38,x,.70,.01,'black');}world.movableFurniture.add(chair,{w:.75,d:.72,top:.53});
 world.homeOffice={cameraCabinet,desk,simulator,pc,shelves,chair};
}
