import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {planPoint} from './house-layout.js';
import {displayHandbag} from './display-handbags.js';
export function buildBedroomStorage(world,root,m){
 const at=(name,x,z,y=.75,yaw=0)=>{const p=planPoint(x,z),g=new THREE.Group();g.name=name;g.position.set(p[0],y,p[1]);g.rotation.y=yaw;root.add(g);return g;};
 const box=(g,w,h,d,x,y,z,key)=>world.box(w,h,d,x,y,z,m[key],g);
 const soft=(g,w,h,d,x,y,z,key)=>{const o=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,.025),m[key]);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
 const ball=(g,r,x,y,z,key,sx=1,sy=1,sz=1)=>world.sphere(r,x,y,z,m[key],g,sx,sy,sz);
 const bag=(parent,x,y,z,width,key,yaw=0)=>{const g=new THREE.Group();g.name='Displayed handbag';g.position.set(x,y,z);g.rotation.y=yaw;parent.add(g);const h=width*.7,d=width*.4;soft(g,width,h,d,0,h/2,0,key);soft(g,width*.92,h*.38,.018,0,h*.73,d/2,key);box(g,.037,.027,.027,0,h*.59,d/2+.021,'steel');
  for(const zz of [-d*.32,d*.32]){const handle=new THREE.Mesh(new THREE.TorusGeometry(width*.23,.009,6,24,Math.PI),m[key]);handle.position.set(0,h-.01,zz);g.add(handle);}return g;};
 const cabinet=at('Bedside open shelving and mirror cabinet',570,403,.75,Math.PI);
 box(cabinet,2.16,2.66,.045,0,1.33,-.22,'walnut');
 for(const x of [-1.055,.14,1.055])box(cabinet,.045,2.66,.49,x,1.33,0,'walnut');
 // Open shelves to the right of the sliding mirror when viewed from the bed.
 for(const y of [.08,.47,.93,1.37,1.83,2.17])box(cabinet,.87,.032,.47,.60,y,0,'walnut');
 for(const [y,key] of [[.10,'black'],[.49,'black'],[.95,'blue'],[1.39,'sage']]){bag(cabinet,.5,y,.025,.42,key,.13);bag(cabinet,.85,y,.035,.23,y<.6?'black':'walnut',-.22);}
 box(cabinet,.45,.07,.23,.52,1.88,0,'black');
 box(cabinet,2.10,.44,.08,0,2.42,.19,'black');box(cabinet,1.08,.29,.06,-.10,2.42,.237,'white');
 for(let i=0;i<9;i++)box(cabinet,2.07,.021,.035,0,2.21+i*.049,.284,'walnut');
 world.colliders.push({x:cabinet.position.x,z:cabinet.position.z,w:2.16,d:.51,label:cabinet.name});
 const side=at('Mirror beside bedside cupboard',619,398,2.015,Math.PI);box(side,.49,2.40,.04,0,0,0,'walnut');box(side,.45,2.36,.049,0,0,.01,'steel');
 const divider=at('Metal bag display divider',652,337,.75,Math.PI/2);
 box(divider,4.01,.76,.38,0,.38,0,'black');for(const x of [-1.5,-.5,.5,1.5])box(divider,.984,.71,.019,x,.38,.199,'black');
 for(const y of [.77,1.62,2.28,2.65])box(divider,4.01,.015,.40,0,y,0,'steel');
 for(let i=0;i<=8;i++){const x=-2+i*.5;for(const z of [-.175,.175])world.cyl(.009,.009,2.66,x,1.33,z,m.black,divider,8);}
 // Keep the central opening clear; bags occupy the upper shelf.
 for(let i=0;i<8;i++){const x=-1.77+i*.50,key=['black','cream','walnut','black','cream','black','oak','sage'][i],raise=[2,4,6].includes(i)?.09:0;
  if(raise){box(divider,.43,.082,.30,x,1.67,0,'orange');box(divider,.45,.013,.315,x,1.717,0,'orange');}
  if(i===5){displayHandbag(world,divider,{x,y:1.63+raise,z:-.06,width:.36,color:0x77675a,style:'birkin',scarf:true});displayHandbag(world,divider,{x:x-.04,y:1.63+raise,z:.12,width:.23,color:0x202326,style:'kelly'});}
  else if(i===6)displayHandbag(world,divider,{x,y:1.63+raise,z:0,width:.38,color:0xba934c,style:'kelly',scarf:true,angle:-.10});
  else bag(divider,x,1.63+raise,0,.37,key,(i%3-1)*.12);
 }
 for(let i=0;i<6;i++){const x=-1.6+i*.61,key=['oak','teal','white','steel','cream','white'][i],y=2.30;ball(divider,.055,x,y+.105,0,key,.9,1.3,.65);ball(divider,.06,x,y+.208,0,key);for(const s of [-1,1]){ball(divider,.025,x+s*.049,y+.25,0,key);ball(divider,.022,x+s*.071,y+.12,0,key,.8,1.5,.8);ball(divider,.026,x+s*.028,y+.023,.008,key,.7,1,.9);}for(const s of [-1,1])ball(divider,.008,x+s*.021,y+.212,.054,'black');}
 for(let i=0;i<4;i++)box(divider,.40,.10,.28,-1.5+i*.43,.827,0,i%2?'black':'orange');
 world.colliders.push({x:divider.position.x,z:divider.position.z,w:.43,d:4.03,label:divider.name});
}
