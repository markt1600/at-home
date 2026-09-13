import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Volumetric close-up companions. +Z is forward; feet stay above the local floor.
export function createPetModel(id,height){
 const root=new THREE.Group();root.name='3D '+({sunny:'Leo',miso:'Cyrus',pebble:'Pebble'}[id]);
 const rig=new THREE.Group();root.add(rig);const materials=new Map(),geometry=new THREE.SphereGeometry(1,20,14),legs=[];
 const mat=(color,roughness=.86)=>{const key=color+':'+roughness;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness}));return materials.get(key);};
 const ell=(parent,color,x,y,z,sx,sy,sz)=>{const mesh=new THREE.Mesh(geometry,mat(color));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 const group=(parent,x,y,z)=>{const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;};
 const curve=(parent,points,r,color)=>{const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),16,r,6,false),mat(color));mesh.castShadow=true;parent.add(mesh);return mesh;};
 let head,tail,ears=[],body,hipHeight,legLength;
 const dog=id==='sunny',cat=id==='miso',tortoise=id==='pebble';
 const coat=dog?0xe6d4aa:cat?0xb77436:0x797747,shade=dog?0xc4aa7d:cat?0x965c2b:0x62653b;
 if(tortoise){
  body=ell(rig,0x685a35,0,.105,0,.155,.09,.205);hipHeight=.068;legLength=.061;
  ell(rig,0x9b8d58,0,.053,.004,.142,.035,.192);
  // Raised scutes follow the dome, with dark seams visible from above.
  for(const [x,z,sx,sz] of [[0,0,.054,.074],[-.07,0,.05,.073],[.07,0,.05,.073],[0,.119,.05,.056],[0,-.119,.05,.056],[-.09,.11,.038,.054],[.09,.11,.038,.054],[-.09,-.11,.038,.054],[.09,-.11,.038,.054]]){
   const y=.105+.087*Math.sqrt(Math.max(0,1-(x/.163)**2-(z/.215)**2));ell(rig,0xa38e4d,x,y,z,sx,.014,sz);
  }
  head=group(rig,0,.085,.22);ell(head,coat,0,0,0,.043,.041,.07);ell(head,shade,0,-.006,.057,.033,.026,.03);
  for(const s of [-1,1]){ell(head,0x171b0e,s*.034,.012,.027,.009,.009,.008);ell(head,0xbcc083,s*.036,.015,.031,.002,.003,.002);}
  tail=group(rig,0,.066,-.186);curve(tail,[[0,0,0],[0,-.014,-.07],[.01,-.02,-.083]],.012,shade);
 }else{
  hipHeight=dog?.145:.16;legLength=dog?.132:.145;
  body=ell(rig,coat,0,dog?.226:.231,0,dog?.14:.265,dog?.115:.198,dog?.39:.33);
  ell(rig,dog?0xf0dfba:0xc68a4b,0,dog?.198:.14,.03,dog?.127:.222,dog?.089:.11,dog?.35:.267);
  if(cat){ell(rig,shade,0,.355,-.10,.187,.035,.208);ell(rig,coat,-.195,.198,-.17,.09,.135,.14);ell(rig,coat,.195,.198,-.17,.09,.135,.14);}
  head=group(rig,0,dog?.292:.329,dog?.347:.285);
  ell(head,coat,0,0,0,dog?.109:.133,dog?.115:.108,dog?.12:.115);
  ell(head,dog?0xefdfb9:0xcc9456,0,-.046,dog?.118:.09,dog?.066:.093,dog?.057:.058,dog?.118:.049);
  ell(head,dog?0x302b23:0x725044,0,-.022,dog?.217:.137,dog?.031:.023,dog?.021:.014,.018);
  for(const s of [-1,1]){
   ell(head,shade,s*(dog?.056:.064),.025,.087,dog?.03:.037,.031,.021);
   ell(head,dog?0x261e15:0x90a674,s*(dog?.056:.064),.026,.104,dog?.018:.027,.023,.012);
   if(cat)ell(head,0x111d0e,s*.064,.026,.115,.006,.018,.006);
   ell(head,0xfff0d0,s*(dog?.052:.059),.034,.116,.004,.005,.003);
   const ear=group(head,s*(dog?.103:.092),dog?.039:.077,-.016);ears.push(ear);
   if(dog){ell(ear,shade,s*.005,-.090,-.018,.044,.137,.063).rotation.z=s*.15;for(let i=0;i<4;i++)ell(ear,0xd8c18f,s*(.016+i*.007),-.153,.004-i*.023,.017,.067,.017);}
   else{
    const shape=new THREE.Shape().moveTo(-.045,0).lineTo(.008,.105).lineTo(.055,0).closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:.044,bevelEnabled:true,bevelThickness:.012,bevelSize:.01,bevelSegments:2,steps:1});const mesh=new THREE.Mesh(geo,mat(coat));mesh.position.set(0,-.01,-.026);mesh.rotation.z=-s*.18;ear.add(mesh);mesh.castShadow=true;
    const inner=ell(ear,0xb08a68,.005,.03,.032,.026,.043,.007);inner.rotation.z=-s*.14;
    curve(head,[[s*.054,-.037,.133],[s*.125,-.025,.142],[s*.187,-.015,.12]],.0016,0xd7bc86);
    curve(head,[[s*.06,-.055,.132],[s*.129,-.057,.139],[s*.19,-.061,.114]],.0013,0xd7bc86);
   }
  }
  if(dog){
   for(const s of [-1,1])for(let i=0;i<6;i++)ell(rig,0xdcc69a,s*.126,.123,-.27+i*.1,.037,.047,.047);
  }else{
   // Cyrus is orange all over: darker ginger brow marks, no white bib or paws.
   for(const s of [-1,1])curve(head,[[s*.018,.089,.052],[s*.034,.071,.091],[s*.038,.047,.103]],.006,shade);
   const collar=new THREE.Mesh(new THREE.TorusGeometry(.098,.012,6,24),mat(0x294958));collar.rotation.x=Math.PI/2;collar.position.set(0,.29,.261);rig.add(collar);ell(rig,0xb4974e,0,.235,.344,.013,.015,.005);
  }
  tail=group(rig,0,dog?.255:.212,dog?-.36:-.30);
  curve(tail,[[0,0,0],[.025,.05,-.08],[.07,.095,-.18],[.13,.15,-.27]],dog?.025:.035,coat);
  if(cat)curve(tail,[[.09,.114,-.217],[.13,.15,-.27],[.14,.168,-.29]],.033,0x513b29);
  else for(let i=0;i<6;i++)ell(tail,0xefddb4,.027+i*.018,.015+i*.02,-.07-i*.033,.014,.046,.027).rotation.z=-.25;
 }
 const xs=tortoise?.13:dog?.09:.155,zs=tortoise?.135:dog?.25:.205;
 for(let i=0;i<4;i++){
  const side=i%2?1:-1,front=i<2,joint=group(rig,side*xs,hipHeight,front?zs:-zs);
  const limb=ell(joint,coat,0,-legLength*.40,0,tortoise?.026:dog?.038:.054,legLength*.53,tortoise?.052:.045);
  const paw=ell(joint,coat,side*(tortoise?.023:0),-legLength+.026,.024,tortoise?.035:dog?.038:.052,.026,tortoise?.045:.067);
  for(let j=0;j<3;j++)ell(joint,shade,side*(tortoise?.023:0)+(j-1)*.013,-legLength+.020,.080,.003,.005,.012);
  legs.push({joint,paw,limb,phase:[0,Math.PI,Math.PI,0][i]});
 }
 // Merge rigid details within each joint; joints and the breathing torso remain animated.
 const groups=[];root.traverse(o=>{if(o.isGroup)groups.push(o);});const obsolete=new Set();
 for(const parent of groups){const batches=new Map();for(const child of parent.children){if(!child.isMesh||child===body)continue;child.updateMatrix();const list=batches.get(child.material)||[];list.push(child);batches.set(child.material,list);}
  for(const [material,parts] of batches){if(parts.length<2)continue;const geometries=parts.map(p=>{const copy=p.geometry.index?p.geometry.toNonIndexed():p.geometry.clone();return copy.applyMatrix4(p.matrix);});const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(!merged)continue;const mesh=new THREE.Mesh(merged,material);mesh.castShadow=mesh.receiveShadow=true;for(const p of parts){obsolete.add(p.geometry);p.removeFromParent();}parent.add(mesh);}
 }
 const used=new Set();root.traverse(o=>{if(o.isMesh)used.add(o.geometry);});for(const g of obsolete)if(!used.has(g))g.dispose();
 root.scale.setScalar(height/(tortoise?.20:dog?.44:.49));let yaw=0,settled=0,time=0;
 root.userData.update=(dt,data,parentYaw=0)=>{
  time+=dt;const speed=data.speed||0,walking=data.activity==='walk'&&speed>.001,sleep=data.activity==='sleep';
  if(walking){const desired=Math.atan2(data.vx,data.vz),angle=Math.atan2(Math.sin(desired-yaw),Math.cos(desired-yaw));yaw+=angle*(1-Math.exp(-dt*9));}
  root.rotation.y=yaw-parentYaw;settled=THREE.MathUtils.damp(settled,sleep?1:0,3,dt);
  const phase=(data.travel||0)/(tortoise?.16:dog?.36:.41)*Math.PI*2;
  rig.position.y=0;rig.rotation.z=0;rig.rotation.x=0;
  for(const leg of legs){const p=phase+leg.phase,swing=walking?Math.sin(p):0,lift=walking?Math.max(0,Math.cos(p)):0;
   leg.joint.rotation.x=swing*(tortoise?.18:.25)*(1-settled);leg.joint.position.y=hipHeight+lift*(tortoise?.009:.021)-settled*.014;
  }
  body.scale.y=(tortoise?.09:dog?.115:.198)*(1+Math.sin(time*(sleep?1.3:2))*.014);
  head.rotation.y=sleep?.2:walking?Math.sin(phase)*.035:Math.sin(time*.6)*.09;head.rotation.x=settled*.22;
  tail.rotation.y=dog?Math.sin(time*(data.care?10:walking?8:4))*(sleep?.03:data.care?.5:.28):cat?Math.sin(time*.8)*.17:Math.sin(phase)*.12;
  for(let i=0;i<ears.length;i++)ears[i].rotation.x=dog&&walking?Math.sin(phase+i*.4)*.15:0;
 };
 root.userData.dispose=()=>{const geometries=new Set();root.traverse(o=>{if(o.isMesh)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());};
 return root;
}
