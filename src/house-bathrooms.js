import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {addWaterTap,addBathWater} from './house-interactions.js';
import {planPoint} from './house-layout.js';

// The mirror belongs above the powder-room basin, on the south wall.
export const POWDER_MIRROR={plan:[391,478.6],y:2.48,width:.64,height:.965,yaw:Math.PI};
export const GUEST_BATH_MIRROR={plan:[987.5,502],y:2.47,width:.66,height:.94,yaw:Math.PI/2};

function fixtures(world,root,m){
 m.ceramic??=new THREE.MeshStandardMaterial({color:0xeceae1,roughness:.22});
 m.chrome??=new THREE.MeshStandardMaterial({color:0xb6bec0,roughness:.18,metalness:.65});
 m.showerGlass??=new THREE.MeshStandardMaterial({color:0xbad1d2,roughness:.09,metalness:.05,transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide});
 const at=(name,px,pz,y=.75,yaw=0)=>{const g=new THREE.Group(),[x,z]=planPoint(px,pz);g.name=name;g.position.set(x,y,z);g.rotation.y=yaw;root.add(g);return g;};
 const box=(w,h,d,x,y,z,material,g)=>world.box(w,h,d,x,y,z,material,g);
 const mesh=(geo,material,g,x=0,y=0,z=0)=>{const o=new THREE.Mesh(geo,material);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
 const soft=(w,h,d,x,y,z,material,g,r=.05)=>mesh(new RoundedBoxGeometry(w,h,d,3,r),material,g,x,y,z);
 const tube=(points,r,g,material=m.chrome)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),32,r,8,false),material,g);
 const block=(g,w,d,x=0,z=0)=>{g.updateWorldMatrix(true,false);const p=g.localToWorld(new THREE.Vector3(x,0,z));world.colliders.push({x:p.x,z:p.z,w,d,angle:g.rotation.y});};
 const lathe=(profile,g,material,scaleX=1)=>{const o=mesh(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),64),material,g);o.scale.x=scaleX;return o;};
 const disc=(radius,length,x,y,z,g,material=m.chrome)=>world.cyl(radius,radius,length,x,y,z,material,g,32);
 const toilet=(px,pz,yaw,tank=false)=>{
  const g=at(tank?'Main bathroom toilet':'Powder room toilet',px,pz,.75,yaw);
  soft(.32,.33,.49,0,.18,.025,m.ceramic,g,.10);
  soft(.39,.32,.62,0,.28,.015,m.ceramic,g,.12);
  soft(.405,.04,.65,0,.448,.025,m.white,g,.08);
  soft(.40,.044,.64,0,.482,.025,m.ceramic,g,.08);
  if(tank){soft(.36,.55,.16,0,.46,-.265,m.ceramic,g,.025);soft(.38,.035,.185,0,.75,-.265,m.ceramic,g,.018);disc(.025,.007,.09,.771,-.265,g);}
  else {soft(.34,.06,.18,0,.51,-.205,m.ceramic,g,.025);box(.065,.045,.012,-.205,.31,-.1,m.chrome,g);}
  block(g,.43,.70);return g;
 };
 const shower=(px,pz,yaw)=>{
  const g=at('Chrome shower fittings',px,pz,.75,yaw);
  disc(.053,.022,0,1.12,.025,g).rotation.x=Math.PI/2;
  const handle=box(.025,.07,.075,0,1.13,.067,m.chrome,g);
  tube([[0,1.17,.02],[0,1.92,.02],[0,2.08,.09],[0,2.08,.27]],.017,g);
  const head=disc(.105,.027,0,2.06,.29,g);head.rotation.x=.35;
  for(let i=0;i<15;i++){const a=i*2.4,r=.08*Math.sqrt(i/15);disc(.003,.002,Math.cos(a)*r,2.042, .29+Math.sin(a)*r,g,m.black);}
  tube([[.14,1.14,.05],[.22,.39,.12],[.45,.44,.13],[.40,1.35,.075]],.011,g);
  tube([[.40,1.28,.08],[.40,1.53,.13]],.025,g);
  box(.08,.05,.08,.40,1.36,.04,m.chrome,g);
  box(.31,.02,.13,-.08,.89,.09,m.chrome,g);
  addWaterTap(world,g,{id:`shower-${px}`,name:'shower',spout:[0,2.038,.29],bottom:.018,control:[0,1.13,.11],handle,shower:true});
  return g;
 };
 // The door is held open into the wet area, retaining a clear 800 mm entry.
 // Fixed glass and the open leaf have physical colliders, not invisible walls.
 const enclosure=(px,pz,width,yaw,doorSide=-1)=>{
  const g=at('Glass shower enclosure',px,pz,.755,yaw),h=2.40,dw=.8,fw=width-dw;
  const fx=-doorSide*dw/2,hingeX=doorSide*width/2;
  box(fw-.02,h-.03,.009,fx,h/2,0,m.showerGlass,g);block(g,fw,.012,fx,0);
  for(const x of [-width/2,width/2])box(.018,h,.024,x,h/2,0,m.chrome,g);
  box(width,.018,.022,0,h,0,m.chrome,g);
  // Two small polished clamps retain the fixed panel.
  for(const y of [.18,2.18])box(.06,.035,.027,-doorSide*(width/2-.025),y,0,m.chrome,g);
  const leaf=new THREE.Group();leaf.position.x=hingeX;leaf.rotation.y=-doorSide*Math.PI/2;g.add(leaf);
  box(dw-.02,h-.035,.009,-doorSide*dw/2,h/2,0,m.showerGlass,leaf);
  for(const y of [.30,2.06])box(.065,.065,.03,0,y,0,m.chrome,leaf);
  box(.018,.34,.065,-doorSide*(dw-.1),1.12,.036,m.chrome,leaf);
  // Convert the perpendicular leaf to an enclosure-local rectangle.
  block(g,.012,dw,hingeX,-dw/2);
  return g;
 };
 return {at,box,mesh,soft,tube,block,lathe,disc,toilet,shower,enclosure};
}

export function buildMasterBathroom(world,root,m){
 const f=fixtures(world,root,m),{at,box,lathe,block,tube,disc}=f;
 const tub=at('Freestanding oval bath',906,161);
 // A closed shell with an actual hollow basin, rim and curved outer apron.
 lathe([[0,.04],[.25,.04],[.32,.10],[.36,.30],[.40,.54],[.40,.59],[.385,.61],[.37,.585],[.335,.27],[.275,.15],[0,.15]],tub,m.ceramic,2.15);
 disc(.027,.004,.18,.154,0,tub);block(tub,1.74,.82);
 const filler=at('Bath filler',920,181);
 tube([[0,0,0],[0,.7,0],[0,.82,-.06],[0,.82,-.30]],.023,filler);
 disc(.075,.025,0,.018,0,filler);const bathHandle=box(.018,.10,.06,.065,.65,0,m.chrome,filler);
 addBathWater(world,tub,filler,bathHandle);
 f.toilet(935,254,-Math.PI/2,true);
 f.enclosure(910,233,2.01,0,-1);
 f.shower(948.5,211,-Math.PI/2);
 const niche=at('Shower niche',948.5,190,2.04,-Math.PI/2);
 box(.25,.65,.015,0,0,0,m.black,niche);
 for(const x of [-.134,.134])box(.018,.69,.09,x,0,.025,m.chrome,niche);
 for(const y of [-.335,.335])box(.286,.018,.09,0,y,.025,m.chrome,niche);
 for(const x of [-.06,.05])box(.045,.13,.035,x,-.26,.045,x<0?m.white:m.teal,niche);
 const holder=at('Main bathroom toilet roll',948.4,243,1.37,-Math.PI/2);
 disc(.055,.10,0,0,.095,holder,m.white).rotation.z=Math.PI/2;
 box(.16,.018,.15,0,.072,.055,m.chrome,holder);
}

export function buildPowderBathroom(world,root,m){
 const f=fixtures(world,root,m),{at,box,mesh,soft,tube,disc,block,lathe}=f;
 m.powderTile=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.27});m.powderTile.userData.textureMeters=1.15;
 m.powderStone=new THREE.MeshStandardMaterial({color:0xe2e0d8,roughness:.66});m.powderStone.userData.textureMeters=.85;
 const wall=(a,b,base=.755,h=2.65,material=m.powderTile)=>{
  const [x,z]=planPoint(...a),[xx,zz]=planPoint(...b),g=new THREE.Group();root.add(g);g.name='Bathroom tile';
  const panel=box(Math.hypot(xx-x,zz-z),h,.014,(x+xx)/2,base+h/2,(z+zz)/2,material,g);panel.rotation.y=-Math.atan2(zz-z,xx-x);
 };
 // Tile stops at the shower screen and follows the two chamfered bay corners.
 wall([316,400.4],[342,400.4]);wall([302.4,411],[316,400.4]);
 wall([302.4,411],[302.4,432]);wall([302.4,451],[302.4,466]);
 wall([302.4,432],[302.4,451],.755,.695);wall([302.4,432],[302.4,451],3.1,.305);
 wall([302.4,466],[316,478.6]);wall([316,478.6],[342,478.6]);
 const wet=[[302.4,411],[316,400.4],[342,400.4],[342,478.6],[316,478.6],[302.4,466]].map(p=>planPoint(...p));
 const shape=new THREE.Shape(wet.map(([x,z])=>new THREE.Vector2(x,-z))),geo=new THREE.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);
 const floorGroup=new THREE.Group();root.add(floorGroup);mesh(geo,m.powderTile,floorGroup,0,.763,0);
 const ceiling=geo.clone(),indices=Array.from(ceiling.index.array);for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];ceiling.setIndex(indices);ceiling.computeVertexNormals();mesh(ceiling,m.powderTile,floorGroup,0,3.399,0);
 wall([342,478.6],[411,478.6],.755,2.65,m.powderStone);
 // SS03: shower at the west end; the north-side door opens into the enclosure.
 f.enclosure(344,439.5,2.03,Math.PI/2,1);
 f.shower(327,478.4,Math.PI);
 const drain=at('Shower drain',327,456,.775);box(.14,.006,.14,0,0,0,m.chrome,drain);
 for(let i=0;i<5;i++)box(.1,.001,.005,0,.004,-.04+i*.02,m.black,drain);
 const strip=at('Shower ceiling light',323,477.7,3.375,Math.PI);
 box(.74,.012,.018,0,0,0,new THREE.MeshBasicMaterial({color:0xffe6ba}),strip);
 const glow=new THREE.PointLight(0xe0dfd0,2.1,2.6,2);glow.position.set(...[planPoint(324,444)[0],2.95,planPoint(324,444)[1]]);root.add(glow);
 f.toilet(360,464,Math.PI);
 const vanity=at('Golden curved powder vanity',391,468.9,.75,Math.PI);
 const yellow=new THREE.MeshStandardMaterial({color:0xe6a21c,roughness:.30});
 const drum=disc(.32,.75,0,.415,0,vanity,yellow);drum.scale.z=.73;
 const top=disc(.338,.032,0,.806,0,vanity,yellow);top.scale.z=.74;
 const plinth=disc(.295,.045,0,.031,0,vanity,m.walnut);plinth.scale.z=.73;
 box(.008,.68,.01,0,.424,.236,m.walnut,vanity);
 const bowl=new THREE.Group();bowl.position.set(0,.824,0);vanity.add(bowl);
 lathe([[0,0],[.08,0],[.13,.025],[.19,.11],[.214,.174],[.209,.18],[.203,.174],[.18,.11],[.12,.04],[0,.035]],bowl,m.chrome);
 disc(.022,.004,0,.039,0,bowl,m.chrome);block(vanity,.69,.51);
 const tap=at('Powder wall tap',391,478.4,1.90,Math.PI);
 disc(.047,.015,0,0,.012,tap).rotation.x=Math.PI/2;
 tube([[0,0,.02],[0,.02,.11],[0,.01,.25],[0,-.065,.27]],.012,tap);
 addWaterTap(world,tap,{id:'powder-tap',name:'basin tap',spout:[0,-.065,.27],bottom:-.288,control:[.10,0,.10],handle:box(.02,.07,.045,.10,0,.09,m.chrome,tap)});
 const spec=POWDER_MIRROR,mirror=at('Illuminated powder mirror',...spec.plan,spec.y,spec.yaw);
 box(spec.width+.015,spec.height+.015,.014,0,0,0,m.chrome,mirror);
 // Separate ring sits in front of the live reflection, without coplanar faces.
 const led=new THREE.MeshBasicMaterial({color:0xffe2a1});
 const ring=mesh(new THREE.TorusGeometry(.275,.005,8,96),led,mirror,0,0,.045);ring.scale.y=1.38;
 const light=new THREE.PointLight(0xffe3b4,1.6,1.8,2);light.position.set(0,0,.12);mirror.add(light);
 const paper=at('Powder toilet roll',375,478.3,1.47,Math.PI);
 box(.19,.012,.13,0,.065,.07,m.chrome,paper);disc(.05,.105,0,-.02,.095,paper,m.white).rotation.z=Math.PI/2;
 const towel=at('Powder hand towel',405,478.3,1.46,Math.PI);
 box(.035,.075,.03,0,.32,.015,m.chrome,towel);soft(.17,.59,.027,0,0,.04,m.blue,towel,.01);
}

export function buildGuestBathroom(world,root,m){
 const f=fixtures(world,root,m),{at,box,mesh,soft,disc,tube,lathe,block}=f;
 m.guestStone=new THREE.MeshStandardMaterial({color:0x847567,roughness:.52});m.guestStone.userData.textureMeters=.85;
 const wall=(a,b,base=.758,h=2.64)=>{const [x,z]=planPoint(...a),[xx,zz]=planPoint(...b),g=new THREE.Group();g.name='Second bathroom stone';root.add(g);const o=box(Math.hypot(xx-x,zz-z),h,.014,(x+xx)/2,base+h/2,(z+zz)/2,m.guestStone,g);o.rotation.y=-Math.atan2(zz-z,xx-x);};
 wall([987.5,460],[987.5,559.5]);wall([1049.5,460],[1049.5,559.5]);
 wall([987.5,559.5],[1029.3,559.5]);wall([1044.7,559.5],[1049.5,559.5]);
 wall([1029.3,559.5],[1044.7,559.5],.758,.692);wall([1029.3,559.5],[1044.7,559.5],3.15,.25);
 const wc=f.toilet(998,477,Math.PI/2);wc.name='Second bathroom toilet';
 const shelf=at('Second bathroom shelf and toilet paper',987.7,478,1.82,Math.PI/2);
 box(.55,.025,.13,0,0,.065,m.chrome,shelf);for(const x of [-.14,.04])disc(.06,.09,x,.06,.08,shelf,m.white);
 const paper=at('Second bathroom toilet roll',987.8,464,1.3,Math.PI/2);disc(.052,.105,0,0,.10,paper,m.white).rotation.z=Math.PI/2;box(.15,.017,.14,0,.065,.07,m.chrome,paper);
 const vanity=at('Round yellow second bathroom vanity',996,502,.75,Math.PI/2),yellow=world.mat(0xe5bc21,.28);
 for(const [r,h,y,material] of [[.30,.73,.405,yellow],[.32,.032,.786,yellow],[.27,.045,.034,m.walnut]]){const drum=disc(r,h,0,y,0,vanity,material);drum.scale.z=.77;}
 box(.007,.67,.009,0,.412,.234,m.walnut,vanity);block(vanity,.65,.51);
 const bowl=new THREE.Group();bowl.position.y=.804;vanity.add(bowl);
 lathe([[0,0],[.09,0],[.15,.035],[.20,.13],[.216,.177],[.21,.184],[.204,.175],[.185,.13],[.13,.049],[0,.035]],bowl,m.chrome);disc(.022,.004,0,.039,0,bowl);
 const tap=at('Second bathroom wall tap',987.7,502,1.90,Math.PI/2);disc(.042,.018,0,0,.01,tap).rotation.x=Math.PI/2;tube([[0,0,.01],[0,.015,.15],[0,-.015,.26],[0,-.06,.26]],.013,tap);
 addWaterTap(world,tap,{id:'guest-tap',name:'basin tap',spout:[0,-.06,.26],bottom:-.305,control:[.10,0,.10],handle:box(.02,.07,.045,.10,0,.09,m.chrome,tap)});
 const spec=GUEST_BATH_MIRROR,mirror=at('Illuminated second bathroom mirror',...spec.plan,spec.y,spec.yaw);
 box(spec.width+.018,spec.height+.018,.014,0,0,0,m.chrome,mirror);
 const ring=mesh(new THREE.TorusGeometry(.285,.005,8,80),new THREE.MeshBasicMaterial({color:0xffdc98}),mirror,0,0,.045);ring.scale.y=1.35;
 const light=new THREE.PointLight(0xffe4b6,1.6,2.1,2);light.position.set(0,0,.12);mirror.add(light);
 f.enclosure(1018.5,524,1.61,Math.PI,1);f.shower(987.8,548,Math.PI/2);
 const towel=at('Pink shower towel',1037,524,1.85,Math.PI);box(.36,.017,.075,0,.28,.08,m.chrome,towel);soft(.29,.54,.023,0,0,.12,world.mat(0xb96b7b,.95),towel,.012);
 const wet=at('Second bathroom shower floor',1018.5,542,.765);box(1.59,.013,.88,0,0,0,m.guestStone,wet);
 for(let i=0;i<12;i++)box(.64,.017,.021,0,.018,-.25+i*.041,world.mat(0x887190,.9),wet);
 const ledge=at('Shower bottles',988,556,1.55,Math.PI/2);box(.33,.02,.12,0,0,.08,m.chrome,ledge);for(let i=0;i<3;i++){box(.06,.15+i*.018,.04,-.11+i*.1,.09,.08,i===1?m.teal:m.white,ledge);box(.03,.022,.03,-.11+i*.1,.175+i*.018,.08,m.black,ledge);}
}

export function applyBathroomTextures(tile,materials,anisotropy){
 tile.colorSpace=THREE.SRGBColorSpace;tile.wrapS=tile.wrapT=THREE.RepeatWrapping;tile.anisotropy=anisotropy;
 materials.powderTile.map=tile;materials.powderTile.needsUpdate=true;
 // Fine vertical stone striations, with no photo lighting baked into the wall.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
 ctx.fillStyle='#b4b2a9';ctx.fillRect(0,0,256,256);
 for(let i=0;i<256;i++){const v=170+Math.round(8*Math.sin(i*4.13)+4*Math.sin(i*.43));ctx.fillStyle=`rgb(${v+16},${v+14},${v+6})`;ctx.fillRect(i,0,1,256);}
 const stone=new THREE.CanvasTexture(canvas);stone.colorSpace=THREE.SRGBColorSpace;stone.wrapS=stone.wrapT=THREE.RepeatWrapping;stone.anisotropy=anisotropy;
 materials.powderStone.map=stone;materials.powderStone.bumpMap=stone;materials.powderStone.bumpScale=.0006;materials.powderStone.needsUpdate=true;
 materials.guestStone.map=stone;materials.guestStone.bumpMap=stone;materials.guestStone.bumpScale=.0008;materials.guestStone.needsUpdate=true;
}
