import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {planPoint} from './house-layout.js';

// Looking toward this wall: wine fridge, lamp, blue cabinet, then timber cabinet.
export function buildDiningDetails(world,root,m){
 const group=(name,px,pz)=>{const g=new THREE.Group(),[x,z]=planPoint(px,pz);g.name=name;g.position.set(x,.45,z);g.rotation.y=Math.PI;root.add(g);return g;};
 const box=(g,w,h,d,x,y,z,mat)=>world.box(w,h,d,x,y,z,mat,g);
 const cyl=(g,r,h,x,y,z,mat)=>world.cyl(r,r,h,x,y,z,mat,g,24);
 const soft=(g,w,h,d,x,y,z,mat,r=.03)=>{const o=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,r),mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
 const block=(g,w,d)=>world.colliders.push({x:g.position.x,z:g.position.z,w,d});
 const navy=world.mat(0x233d54,.56),timber=world.mat(0xa36938,.52),brass=world.mat(0x957b4b,.32,.7);timber.userData.textureMeters=1.1;m.diningTimber=timber;
 const blue=group('Blue dining sideboard',432,872);
 soft(blue,1.75,.86,.46,0,.57,0,navy);
 for(const x of [-.71,.71])for(const z of [-.16,.16])cyl(blue,.014,.14,x,.07,z,m.black);
 for(const y of [.365,.795])soft(blue,1.735,.414,.019,0,y,.244,navy,.008);
 block(blue,1.78,.49);
 const brown=group('Brown timber dining cupboard',366,872);
 box(brown,1.34,.93,.46,0,.465,0,timber);box(brown,1.39,.045,.51,0,.953,0,timber);
 for(const x of [-.333,.333]){box(brown,.652,.86,.03,x,.475,.249,timber);box(brown,.51,.68,.01,x,.475,.270,m.oak);box(brown,.052,.024,.025,x+(x<0?.22:-.22),.825,.282,brass);}
 box(brown,1.36,.065,.5,0,.035,.012,timber);block(brown,1.40,.53);
 const fridge=group('Tall black dining wine fridge',501,869);
 box(fridge,.70,1.94,.035,0,.97,-.303,m.black);for(const x of [-.33,.33])box(fridge,.04,1.94,.64,x,.97,0,m.black);
 // Bottles and shelf edges remain visible beneath the smoked glass door.
 for(let row=0;row<10;row++){const y=.17+row*.155;box(fridge,.565,.02,.34,0,y,.08,m.oak);for(let col=0;col<4;col++){const bottle=cyl(fridge,.038,.26,(col-1.5)*.128,y+.052,.14,m.black);bottle.rotation.x=Math.PI/2;const label=cyl(fridge,.039,.066,(col-1.5)*.128,y+.052,.21,m.cream);label.rotation.x=Math.PI/2;}}
 const glass=new THREE.MeshStandardMaterial({color:0x67736a,transparent:true,opacity:.17,roughness:.22,depthWrite:false});box(fridge,.595,1.80,.006,0,.99,.329,glass);
 for(const x of [-.326,.326])box(fridge,.047,1.90,.05,x,.97,.35,m.black);for(const y of [.028,1.91])box(fridge,.70,.048,.05,0,y,.35,m.black);
 box(fridge,.025,.52,.055,.268,1.08,.389,m.steel);box(fridge,.18,.038,.007,0,1.83,.38,world.mat(0xc5a65d,.4));block(fridge,.72,.76);
 const lamp=group('White shaded dining floor lamp',477,870);cyl(lamp,.16,.025,0,.013,0,brass);cyl(lamp,.011,1.43,0,.73,0,brass);world.cyl(.19,.255,.31,0,1.55,0,m.white,lamp,40);block(lamp,.37,.37);
 const picture=(key,px,w,h,frame)=>{const g=group(key,px,879);g.position.y=2.42;box(g,w+.09,h+.09,.035,0,0,0,frame);box(g,w+.047,h+.047,.009,0,0,.024,m.white);const mat=new THREE.MeshStandardMaterial({color:0xe8e1cb,roughness:.87});m[key]=mat;const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);face.position.z=.031;g.add(face);};
 picture('diningButterflies',432,1.10,1.10,m.white);picture('diningFrance',366,.87,.87,m.black);
 // Clock, stationery, ceramics and the dried flower vase from the reference.
 for(let i=0;i<4;i++)box(blue,.047,.14+i*.008,.09,-.73+i*.054,1.085,.01,m.blue);
 for(let i=0;i<3;i++)cyl(blue,.032,.085,-.35+i*.09,1.052,.04,[m.teal,m.cream,timber][i]);
 const clock=cyl(blue,.105,.024,.34,1.119,.02,m.steel);clock.rotation.x=Math.PI/2;
 const face=cyl(blue,.09,.008,.34,1.119,.037,m.black);face.rotation.x=Math.PI/2;
 box(blue,.008,.078,.006,.34,1.15,.044,m.white);box(blue,.065,.008,.006,.369,1.119,.044,m.white);
 const vase=world.mat(0x6e3940,.32);cyl(blue,.082,.36,.69,1.18,-.045,vase);
 for(let i=0;i<24;i++){const a=i*2.4,r=.07+(i%4)*.029,x=.69+Math.cos(a)*r,z=-.045+Math.sin(a)*r,y=1.45+(i%3)*.035;cyl(blue,.003,.27,x,y-.12,z,timber);world.sphere(.035,x,y,z,world.mat(i%2?0xa5724b:0x825442),blue,1,.85,1.1);}
 const bottleMat=world.mat(0x384d33,.27),clear=new THREE.MeshStandardMaterial({color:0xd6dfd1,transparent:true,opacity:.30,roughness:.12,depthWrite:false});
 for(let i=0;i<4;i++){const x=-.44+i*.125;cyl(brown,.033,.21,x,1.087,-.05,bottleMat);cyl(brown,.014,.105,x,1.24,-.05,bottleMat);cyl(brown,.015,.015,x,1.30,-.05,brass);}
 for(const x of [.18,.39]){world.sphere(.072,x,1.045,.04,clear,brown,1,.7,1);cyl(brown,.021,.21,x,1.16,.04,clear);}
 for(let i=0;i<3;i++){const x=-.06+i*.15;world.sphere(.042,x,1.08,.15,clear,brown,1,1.2,1);cyl(brown,.004,.065,x,1.008,.15,clear);cyl(brown,.03,.005,x,.976,.15,clear);}
 const corks=group('Dining cork collection',332,870);box(corks,.25,.68,.14,0,.55,0,timber);box(corks,.207,.60,.015,0,.55,.081,m.walnut);for(let i=0;i<38;i++){const c=cyl(corks,.018,.07,Math.sin(i*9)*.074,.275+i*.014,.12,m.oak);c.rotation.z=i*.8;}block(corks,.28,.20);
}

export function applyDiningArt(atlas,m,anisotropy){
 for(const [i,key] of ['diningButterflies','diningFrance'].entries()){const t=atlas.clone();t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=anisotropy;t.repeat.set(.498,.996);t.offset.set(i*.5+.001,.002);t.needsUpdate=true;m[key].map=t;m[key].color.set(0xffffff);m[key].needsUpdate=true;}atlas.dispose();
}
