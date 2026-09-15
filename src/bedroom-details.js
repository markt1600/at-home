import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {planPoint} from './house-layout.js';

export function buildBedroomDetails(world,root,m){
 const group=(name,px,pz,y=0,yaw=0)=>{const g=new THREE.Group(),[x,z]=planPoint(px,pz);g.name=name;g.position.set(x,y,z);g.rotation.y=yaw;root.add(g);return g;};
 const box=(g,material,w,h,d,x,y,z)=>world.box(w,h,d,x,y,z,material,g);
 const soft=(g,material,w,h,d,x,y,z,r=.025)=>{const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,r),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);return mesh;};
 const metal=world.mat(0xaaa99f,.19,.8),mirror=world.mat(0x777f7c,.10,.94),fabric=world.mat(0x817372,.94);
 m.bedroomMarble=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.23,metalness:.04});
 const head=group('Black and white marble headboard wall',534,331,0,Math.PI/2);
 soft(head,fabric,3.62,.83,.17,0,1.165,0,.008);
 box(head,mirror,3.62,1.86,.09,0,2.48,-.065);
 // A single broad stone slab within a fine mirrored metal grid.
 box(head,m.bedroomMarble,3.10,1.32,.055,0,2.48,.022);
 for(const y of [1.80,3.16])box(head,metal,3.17,.022,.07,0,y,.022);
 for(const x of [-1.57,1.57])box(head,metal,.022,1.38,.07,x,2.48,.022);
 for(let i=0;i<=16;i++){const x=-1.81+i*3.62/16;for(const y of [1.675,3.315])box(head,metal,.013,.23,.12,x,y,.005);}
 for(const y of [1.55,3.41])box(head,metal,3.65,.017,.12,0,y,.005);
 for(const x of [-1.81,1.81]){box(head,metal,.014,1.86,.12,x,2.48,.005);for(let y=1.81;y<3.16;y+=.23)box(head,metal,.23,.014,.12,x<0?-1.69:1.69,y,.005);}
 for(const x of [-1.35,1.35]){box(head,m.walnut,.17,.09,.02,x,1.42,.097);for(let i=0;i<3;i++)box(head,m.steel,.033,.05,.007,x-.047+i*.047,1.42,.111);}
 // The deep black window sill carries the two rose-colored robot figures.
 const ledge=group('Bedroom window ledge',690,212,1.445);box(ledge,m.black,4.48,.03,.28,0,0,0);
 const rose=world.mat(0x9b5260,.6),red=world.mat(0x98403e,.5),joints=world.mat(0x363b38,.7);
 for(let i=0;i<2;i++){
  const robot=group(i?'Rose robot on window sill':'Rust robot on window sill',714+i*10,213.3,1.463,i?-.12:.25),color=i?rose:red;
  soft(robot,color,.16,.19,.13,0,.19,0);soft(robot,color,.145,.055,.12,0,.091,0,.012);
  for(const side of [-1,1]){soft(robot,color,.055,.068,.06,side*.044,.037,.014,.008);world.sphere(.028,side*.098,.171,0,joints,robot);soft(robot,color,.045,.085,.05,side*.116,.126,.005,.012);world.sphere(.018,side*.12,.075,.01,joints,robot);}
  if(i){box(robot,joints,.102,.075,.009,0,.219,.070);for(let j=0;j<6;j++)box(robot,m.steel,.092,.003,.006,0,.188+j*.011,.076);soft(robot,joints,.040,.025,.045,0,.299,0,.007);}
  else{soft(robot,color,.135,.045,.125,0,.302,-.012,.008);box(robot,joints,.072,.044,.012,0,.235,-.073);for(const side of [-1,1]){world.cyl(.018,.018,.055,side*.093,.221,.035,m.steel,robot,12).rotation.z=Math.PI/2;}}
 }
 // Repeated glass colours share a material so the static figures can batch.
 const sillGlass=[0xe5eadc,0xd9e6de,0xe8b0a0,0xeea441,0xe8c01a].map(color=>new THREE.MeshStandardMaterial({color,roughness:.12,metalness:.15,transparent:true,opacity:.82}));
 for(let i=0;i<11;i++){const duck=group('Tiny glass sill figure',714+i*1.43,209.3,1.464),glass=sillGlass[Math.min(4,Math.floor(i/2.3))];world.sphere(.012,0,.011,0,glass,duck,1,.7,1.2);world.sphere(.008,0,.026,-.004,glass,duck);box(duck,m.walnut,.008,.004,.006,0,.025,-.011);}
}

export function buildSageDrawing(world,root,m){
 const [x,z]=planPoint(527,461),g=new THREE.Group();g.name='Floral pitcher drawing beside sage cabinets';g.position.set(x,2.03,z);g.rotation.y=Math.PI/2;root.add(g);
 m.sageDrawing=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.86});
 world.box(.58,.79,.032,0,0,0,m.black,g);world.box(.542,.752,.007,0,0,.019,m.steel,g);world.box(.523,.733,.009,0,0,.026,m.black,g);world.box(.496,.706,.007,0,0,.034,m.white,g);
 const face=new THREE.Mesh(new THREE.PlaneGeometry(.390,.585),m.sageDrawing);face.position.z=.039;g.add(face);
}

export function applyDetailTexture(texture,material,anisotropy){texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=anisotropy;material.map=texture;material.needsUpdate=true;}
