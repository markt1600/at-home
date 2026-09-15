import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {planPoint} from './house-layout.js';
import {buildOliveTree} from './olive-tree.js';
import {buildBalconyWallDetails} from './balcony-wall-details.js';
import {buildEntranceIslandDetails} from './entrance-island-details.js';

export const FEEDER_PLAN=[278,679];
export function buildHomeFurnishings(world,root,m){
 const group=(name,px,pz,y=0,a=0)=>{const g=new THREE.Group(),[x,z]=planPoint(px,pz);g.name=name;g.position.set(x,y,z);g.rotation.y=a;root.add(g);return g;};
 const box=(g,w,h,d,x,y,z,mat)=>world.box(w,h,d,x,y,z,mat,g);
 const soft=(g,w,h,d,x,y,z,mat,r=.09)=>{const o=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,4,r),mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
 const sphere=(g,r,x,y,z,mat,sx=1,sy=1,sz=1)=>world.sphere(r,x,y,z,mat,g,sx,sy,sz);
 const rod=(g,a,b,r,mat)=>{const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p),mesh=world.cyl(r,r,d.length(),...p.add(q).multiplyScalar(.5).toArray(),mat,g,10);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return mesh;};
 const block=(g,w,d,top)=>world.colliders.push({x:g.position.x,z:g.position.z,w,d,angle:g.rotation.y,top:g.position.y+top,landable:true});
 // Its back faces the dining shelf; the seats face the north orange sofa.
 const fabric=world.mat(0xe4decb,.97);m.boucle=fabric;fabric.userData.textureMeters=.09;
 const couch=group('White tufted living sofa',417,646,0,Math.PI);
 for(let i=0;i<9;i++){const x=(i-4)*.285;soft(couch,.32,.38,1.02,x,.27,0,fabric,.13);soft(couch,.32,.24,.81,x,.49,.08,fabric,.11);soft(couch,.32,.58,.30,x,.72,-.4,fabric,.13);}
 soft(couch,.3,.44,1.04,-1.24,.51,0,fabric,.14);soft(couch,.3,.44,1.04,1.24,.51,0,fabric,.14);
 soft(couch,.58,.56,.18,-.62,.85,-.12,m.blue).rotation.z=-.12;
 soft(couch,.57,.6,.18,.79,.89,-.10,m.cream).rotation.z=.11;
 const bolster=world.cyl(.12,.12,1.38,-.1,.67,.16,m.orange,couch,24);bolster.rotation.z=Math.PI/2;
 block(couch,2.78,1.09,.61);
 const ottoman=group('Tufted white ottoman',355,618);
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)soft(ottoman,.34,.46,.34,(i-1)*.30,.24,(j-1)*.30,fabric,.12);block(ottoman,1.0,1.0,.48);
 const table=group('Oval brown coffee table and wooden Monopoly',421,596);
 // Revolved, rounded profile scaled to an ellipse: no rectangular corners.
 const profile=[[0,0],[.60,0],[.88,.035],[1,.105],[.99,.155],[.90,.185],[0,.185]].map(p=>new THREE.Vector2(...p));
 const top=new THREE.Mesh(new THREE.LatheGeometry(profile,64),m.walnut);top.scale.set(.84,1,.59);top.position.y=.25;top.castShadow=top.receiveShadow=true;table.add(top);
 const base=world.cyl(.52,.46,.26,0,.13,0,m.walnut,table,48);base.scale.z=.72;block(table,1.68,1.18,.435);
 const boardMat=world.mat(0x604133,.48);m.monopolyBoard=boardMat;
 soft(table,.74,.095,.74,0,.482,0,m.walnut,.025);
 box(table,.69,.008,.69,0,.533,0,boardMat);
 for(const sx of [-1,1]){box(table,.022,.018,.72,sx*.36,.545,0,m.oak);box(table,.70,.018,.022,0,.545,sx*.36,m.oak);}
 const board=new THREE.Mesh(new THREE.PlaneGeometry(.685,.685),boardMat);board.rotation.x=-Math.PI/2;board.position.y=.544;table.add(board);
 buildOliveTree(world,root,m);
 buildBalconyWallDetails(world,root,m);
 const feeder=group('Hanging balcony bird feeder',...FEEDER_PLAN);
 const feederRed=world.mat(0x814238,.5);
 rod(feeder,[0,2.89,0],[0,2.66,0],.005,m.black);
 world.cyl(.09,.14,.11,0,2.65,0,feederRed,feeder,12);world.cyl(.065,.065,.19,0,2.51,0,new THREE.MeshStandardMaterial({color:0xf0de93,transparent:true,opacity:.47,roughness:.2}),feeder,20);
 world.cyl(.15,.13,.035,0,2.405,0,feederRed,feeder,24);rod(feeder,[-.18,2.355,0],[.18,2.355,0],.009,feederRed);
 // The entrance keydrop is clad in one continuous marble finish.
 // Its clipped end follows the diagonal entry, with clear air under the overhang.
 const console=group('Angled cantilevered marble keydrop',853,646,.75,-Math.PI/4);
 const stone=world.mat(0xb68b72,.29,.08);m.keydropStone=stone;
 const shape=new THREE.Shape();shape.moveTo(-1.25,.45);shape.lineTo(1.25,.45);shape.lineTo(1.25,-.45);shape.lineTo(-.35,-.45);shape.closePath();
 const geo=new THREE.ExtrudeGeometry(shape,{depth:.30,bevelEnabled:false});geo.rotateX(-Math.PI/2);
 const positions=geo.attributes.position,uv=geo.attributes.uv,normals=geo.attributes.normal;for(let i=0;i<positions.count;i++){const xx=positions.getX(i),yy=positions.getY(i),zz=positions.getZ(i);uv.setXY(i,Math.abs(normals.getX(i))>.9?(zz+.45)/.9:(xx+1.25)/2.5,(zz+.45+.3-yy)/1.5);}uv.needsUpdate=true;
 const solid=new THREE.Mesh(geo,stone);solid.position.y=.10;solid.castShadow=solid.receiveShadow=true;console.add(solid);
 box(console,1.605,.10,.365,.15,.05,0,stone);block(console,2.5,.9,.40);world.keydrop=console;
 buildEntranceIslandDetails(world,console,m);
 // A shallow wooden key bowl and small book remain at the clear end.
 // Keep the front-right spot clear for setting down the candle's glass cover.
 sphere(console,.19,.96,.43,-.20,m.oak,1.4,.2,1);box(console,.16,.023,.1,.95,.48,-.20,m.black);box(console,.20,.07,.13,1.04,.435,-.33,m.cream);
 // Photo-based hollow, patinated metal sculpture on a timber presentation box.
 const sculpture=group('Patinated circle sculpture beside cellar',775,649,.45);
 box(sculpture,.58,.10,.43,0,.05,0,m.oak);
 const patina=world.mat(0x64857c,.79,.35),rust=world.mat(0x745740,.86,.3);
 const points=[];for(let i=0;i<=9;i++)points.push(new THREE.Vector2(.13+.02*Math.sin(i*2),.13+i*.065));
 const shell=new THREE.Mesh(new THREE.LatheGeometry(points,26,0,Math.PI*1.78),patina);shell.rotation.y=.4;sculpture.add(shell);
 for(let i=0;i<22;i++){const a=i*2.4,r=.143;sphere(sculpture,.025,Math.cos(a)*r,.13+(i%10)*.059,Math.sin(a)*r,i%3?patina:rust,.5,1.5,.45);}
 const circle=new THREE.Mesh(new THREE.TorusGeometry(.26,.010,8,64,Math.PI*1.91),patina);circle.position.set(0,.94,0);circle.rotation.z=.14;sculpture.add(circle);
 const hook=new THREE.CatmullRomCurve3([new THREE.Vector3(-.04,1.20,0),new THREE.Vector3(0,1.13,0),new THREE.Vector3(.08,1.15,0),new THREE.Vector3(.06,1.20,0)]);sculpture.add(new THREE.Mesh(new THREE.TubeGeometry(hook,16,.017,6,false),patina));
 rod(sculpture,[-.06,.37,.13],[-.36,.56,.16],.012,rust);sphere(sculpture,.073,-.39,.58,.16,rust,.85,1,.12);
 world.colliders.push({x:sculpture.position.x,z:sculpture.position.z,w:.67,d:.47});
 // Clean artwork surfaces use only the extracted paintings, never private rooms.
 const picture=(key,px,pz,y,w,h,a=0)=>{const g=group(key,px,pz,y,a);box(g,w+.14,h+.14,.035,0,0,0,key==='artCats'?m.black:m.oak);box(g,w+.10,h+.10,.009,0,0,.024,world.mat(0xf4f0e7,.92));const mat=world.mat(key==='artBay'?0x6c91a4:key==='artTickets'?0x397969:0xe1d5bc,.92);m[key]=mat;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);mesh.position.z=.031;g.add(mesh);};
 // Keep each full frame within its wall run, 104 mm off the wall centreline.
 // Hang the wave print on the apartment-facing side of the cabinet wall.
 picture('artBay',913.66,744.34,2.12,.44,.30,-Math.PI/4);
 picture('artTickets',882,636.02,2.18,.62,.69);
 picture('artCats',955,646.02,1.99,.26,.30);
 const disc=group('Round white wall relief',851,635.5,2.18);const rim=new THREE.Mesh(new THREE.CircleGeometry(.25,48),m.white);disc.add(rim);sphere(disc,.095,0,0,.01,m.blue,1,1,.5);
}

export function applyHomeDetails(atlas,m,anisotropy){
 for(const [key,col,row] of [['artBay',0,0],['artTickets',1,0],['artCats',0,1],['keydropStone',1,1]]){const t=atlas.clone();t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=anisotropy;t.repeat.set(.497,.497);t.offset.set(col*.5+.0015,(1-row)*.5+.0015);t.needsUpdate=true;m[key].map=t;m[key].color.set(0xffffff);m[key].needsUpdate=true;}atlas.dispose();
 if(typeof document==='undefined')return;
 const barkCanvas=document.createElement('canvas');barkCanvas.width=barkCanvas.height=256;const barkContext=barkCanvas.getContext('2d');barkContext.fillStyle='#8a897a';barkContext.fillRect(0,0,256,256);
 for(let i=0;i<170;i++){const x=(i*61.7)%256;barkContext.strokeStyle=i%3?'#66685b':'#b3ad94';barkContext.lineWidth=i%4===0?2.5:.7;barkContext.beginPath();for(let y=0;y<=256;y+=8){const u=x+Math.sin(y*.051+i)*2.8;y?barkContext.lineTo(u,y):barkContext.moveTo(u,y);}barkContext.stroke();}
 const barkMap=new THREE.CanvasTexture(barkCanvas);barkMap.colorSpace=THREE.SRGBColorSpace;barkMap.wrapS=barkMap.wrapT=THREE.RepeatWrapping;barkMap.anisotropy=anisotropy;m.oliveBark.map=m.oliveBark.bumpMap=barkMap;m.oliveBark.bumpScale=.016;m.oliveBark.color.set(0xffffff);m.oliveBark.needsUpdate=true;
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#664637';ctx.fillRect(0,0,512,512);ctx.strokeStyle='#c6ac77';ctx.lineWidth=3;ctx.strokeRect(8,8,496,496);ctx.strokeRect(70,70,372,372);
 for(let i=0;i<=10;i++){const x=8+i*49.6;ctx.beginPath();ctx.moveTo(x,8);ctx.lineTo(x,70);ctx.moveTo(x,442);ctx.lineTo(x,504);ctx.moveTo(8,x);ctx.lineTo(70,x);ctx.moveTo(442,x);ctx.lineTo(504,x);ctx.stroke();}
 ctx.save();ctx.translate(256,256);ctx.rotate(-Math.PI/4);ctx.fillStyle='#d2bd87';ctx.textAlign='center';ctx.font='bold 38px Georgia';ctx.fillText('MONOPOLY',0,12);ctx.restore();const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=anisotropy;m.monopolyBoard.map=texture;m.monopolyBoard.color.set(0xffffff);m.monopolyBoard.needsUpdate=true;
}
