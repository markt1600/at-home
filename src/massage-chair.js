import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {planPoint,floorHeight} from './house-layout.js';

// OSIM OS-8258: 1500 L x 825 W x 1450 H mm, canopy retracted.
// Shape follows OSIM's parts diagram; beige finish and location follow the tour.
export function buildMassageChair(world,root,m){
 const g=new THREE.Group(),[x,z]=planPoint(561,178);g.name='OSIM uDream AI massage chair';g.position.set(x,floorHeight(x,z),z);root.add(g);
 const shell=world.mat(0xaaa18f,.40,.07),leather=world.mat(0xcabca3,.69),seam=world.mat(0x91816d,.77),trim=world.mat(0xb6ad96,.31,.6);
 const glow=new THREE.MeshStandardMaterial({color:0xb5aecb,emissive:0x9388b3,emissiveIntensity:.35,roughness:.45});
 const soft=(name,w,h,d,x,y,z,material=leather,r=.03)=>{const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/3,h/3,d/3)),material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);return mesh;};
 const tube=(name,points,r,material=trim)=>{const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,24,r,6,false),material);mesh.name=name;g.add(mesh);return mesh;};
 const sideShape=new THREE.Shape();sideShape.moveTo(-.64,.25);
 sideShape.bezierCurveTo(-.76,.55,-.65,1.09,-.49,1.22);
 sideShape.bezierCurveTo(-.26,1.02,.13,.85,.43,.79);
 sideShape.bezierCurveTo(.52,.59,.35,.28,.12,.16);
 sideShape.bezierCurveTo(-.16,.03,-.52,.08,-.64,.25);
 function side(sign){
  const geometry=new THREE.ExtrudeGeometry(sideShape,{depth:.063,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.012,bevelThickness:.012,curveSegments:16});
  const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){const u=p.getX(i),v=p.getY(i),depth=p.getZ(i);p.setXYZ(i,sign*(.3375+depth),v,u);}
  // Swapping the extrusion and profile axes reverses the right shell's winding.
  if(sign>0){const a=p.array;for(let i=0;i<a.length;i+=9)for(let j=0;j<3;j++){const t=a[i+3+j];a[i+3+j]=a[i+6+j];a[i+6+j]=t;}}
  geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,shell);mesh.name='Curved nautilus side shell';mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);
  tube('Side shell piping',[[-.64,.25],[-.42,.11],[-.12,.10],[.16,.20],[.37,.43],[.43,.78]].map(([z,y])=>[sign*.408,y,z]),.004);
  tube('Side ambient light',[[-.49,1.217],[-.25,1.027],[.06,.91],[.27,.83],[.427,.79]].map(([z,y])=>[sign*.363,y+.005,z]),.009,glow);
 }
 soft('Recessed plinth',.65,.16,1.06,0,.11,-.11,m.black,.035);
 soft('Rear shell',.64,.99,.19,0,.69,-.57,shell,.065).rotation.x=-.13;
 side(-1);side(1);
 soft('Contoured back upholstery',.59,.87,.15,0,.88,-.37,leather,.065).rotation.x=-.27;
 soft('Back cushion inset',.45,.60,.06,0,.90,-.275,leather,.028).rotation.x=-.27;
 soft('Headrest seam',.374,.285,.075,0,1.195,-.352,seam,.033).rotation.x=-.27;
 soft('Head support pillow',.358,.27,.09,0,1.20,-.337,leather,.038).rotation.x=-.27;
 soft('Lumbar cushion',.48,.19,.15,0,.62,-.22,leather,.04).rotation.x=-.15;
 soft('Seat cushion',.557,.112,.536,0,.465,.127,leather,.034);
 tube('Seat cushion piping',[[-.27,.452,.32],[-.25,.452,.394],[0,.452,.397],[.25,.452,.394],[.27,.452,.32]],.0025,seam);
 for(const sign of [-1,1]){
  soft('Upper arm airbag',.125,.34,.185,sign*.272,.955,-.19,leather,.04).rotation.z=sign*.14;
  soft('Arm massage channel',.11,.17,.59,sign*.289,.695,.102,seam,.035);
  soft('Armrest bolster',.105,.12,.62,sign*.307,.783,.09,leather,.035).rotation.x=.12;
  soft('Hip airbag',.10,.17,.34,sign*.258,.575,.145,leather,.032);
  // Circular speakers are inset in the shoulder wings.
  const speaker=world.cyl(.044,.044,.009,sign*.235,1.087,-.077,m.black,g,24);speaker.rotation.x=Math.PI/2;speaker.rotation.z=sign*.18;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.045,.0035,6,24),trim);ring.position.copy(speaker.position);ring.position.z+=.006;g.add(ring);
  soft('Inset arm control panel',.079,.015,.18,sign*.315,.852,.245,m.black,.008).rotation.x=.15;
  for(let i=0;i<5;i++)world.cyl(.006,.006,.003,sign*.316,.865,.188+i*.025,trim,g,8);
 }
 // Open arch: outer shell, upholstered underside and a narrow lit front edge.
 // These are static surfaces, so the existing material batching combines them.
 function canopy(yOffset,material){
  const vertices=[],uv=[],indices=[],nx=24,nz=16;
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
   const u=i/nx*2-1,t=j/nz;
   vertices.push(u*.391,1.17+.27*Math.sin(t*Math.PI*.72)-.075*u*u+yOffset,-.665+t*.625+.035*u*u);
   uv.push(i/nx,j/nz);
  }
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;if(yOffset===0)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);mesh.name=yOffset?'SkyCanopy upholstered underside':'SkyCanopy outer shell';mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);
 }
 canopy(0,shell);canopy(-.035,leather);
 const edge=Array.from({length:13},(_,i)=>{const u=i/6-1;return [u*.391,1.17+.27*Math.sin(Math.PI*.72)-.075*u*u-.016,-.04+.035*u*u];});
 tube('SkyCanopy ambient rim',edge,.016,glow);
 for(const sign of [-1,1])tube('Canopy side edge',Array.from({length:13},(_,i)=>{const t=i/12;return [sign*.391,1.17+.27*Math.sin(t*Math.PI*.72)-.075-.017,-.63+t*.625];}),.017,shell);
 // Paired calf wells and foot cups are visibly recessed between padded walls.
 soft('Leg unit shell',.66,.33,.38,0,.265,.535,shell,.05).rotation.x=-.22;
 soft('Foot unit base',.655,.09,.36,0,.125,.601,leather,.032);
 for(const sign of [-1,1]){
  soft('Calf channel',.221,.239,.036,sign*.156,.323,.725,m.black,.028).rotation.x=-.23;
  soft('Foot cup',.215,.027,.244,sign*.156,.180,.608,m.black,.024);
  soft('Heel cushion',.184,.06,.09,sign*.156,.184,.724,leather,.022);
 }
 for(const x of [-.305,0,.305])soft('Calf dividing bolster',.048,.286,.16,x,.29,.686,leather,.024).rotation.x=-.23;
 soft('Footrest front lip',.648,.092,.064,0,.17,.749,leather,.022);
 // Small entertainment mount beside the right arm, as seen in the tour.
 tube('Entertainment stand stem',[[.315,.78,-.08],[.305,.91,-.095],[.293,1.01,-.07]],.011,m.black);
 soft('Entertainment stand',.105,.17,.022,.293,1.065,-.048,m.black,.009).rotation.x=-.18;
 soft('Entertainment stand inset',.087,.145,.004,.293,1.065,-.034,world.mat(0x263b38,.37),.006).rotation.x=-.18;
 // A small embossed badge uses geometry, with no extra texture download.
 const badge=new THREE.Group();badge.position.set(0,1.224,-.282);badge.rotation.x=-.27;g.add(badge);
 const letter=(pts)=>{const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(p[0],p[1],0)),false,'centripetal'),12,.0012,4,false);badge.add(new THREE.Mesh(geo,seam));};
 letter([[-.027,.009],[-.034,.007],[-.034,-.006],[-.027,-.009],[-.021,-.006],[-.021,.006],[-.027,.009]]);
 letter([[-.006,.008],[-.016,.008],[-.016,.001],[-.006,-.001],[-.006,-.008],[-.016,-.008]]);
 letter([[.002,.009],[.002,-.009]]);letter([[.011,-.009],[.011,.009],[.019,0],[.027,.009],[.027,-.009]]);
 const collider={x,z:z+.04,w:.825,d:1.50,angle:0};world.colliders.push(collider);
 // Recline the chair above its fixed plinth. Keep the many upholstered parts
 // batched by material, including while the cradle is moving.
 const cradle=new THREE.Group();cradle.name='Reclining massage cradle';cradle.position.y=.43;cradle.userData.dynamic=true;
 g.updateWorldMatrix(true,true);const inverse=g.matrixWorld.clone().invert(),groups=new Map(),originals=[];
 g.traverse(o=>{if(!o.isMesh||o.name==='Recessed plinth')return;const geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geometry.applyMatrix4(inverse.clone().multiply(o.matrixWorld));geometry.translate(0,-.43,0);const list=groups.get(o.material)||[];list.push(geometry);groups.set(o.material,list);originals.push(o);});
 for(const o of originals){o.removeFromParent();o.geometry.dispose();}
 for(const [material,parts] of groups){const mesh=new THREE.Mesh(mergeGeometries(parts),material);mesh.castShadow=mesh.receiveShadow=true;cradle.add(mesh);parts.forEach(p=>p.dispose());}g.add(cradle);
 world.massageChair={group:g,cradle,collider};
 return g;
}
