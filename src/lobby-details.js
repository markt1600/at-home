import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {planPoint} from './house-layout.js';

export function buildLobbyDetails(world,root,m){
 const g=new THREE.Group();g.name='Metal shoe bench by lobby mirror';
 const [x,z]=planPoint(908,838);g.position.set(x,.45,z);g.rotation.y=Math.PI-Math.atan2(58,91);root.add(g);
 const box=(w,h,d,x,y,z,key)=>world.box(w,h,d,x,y,z,m[key],g);
 // Brushed metal slats wrap across the seat and down both end panels.
 for(let i=0;i<27;i++){const x=-.65+i*1.3/26;box(.026,.022,.43,x,.45,0,'steel');}
 for(const x of [-.65,.65]){
  for(let i=0;i<9;i++)box(.024,.43,.025,x,.225,-.2+i*.05,'steel');
  box(.038,.035,.45,x,.025,0,'steel');
 }
 for(const z of [-.205,.205]){box(1.32,.035,.027,0,.427,z,'steel');box(1.30,.018,.018,0,.11,z,'steel');}
 for(let i=0;i<15;i++)box(.015,.012,.39,-.61+i*.087,.11,0,'steel');
 box(.38,.11,.26,.38,.516,.015,'cream');box(.027,.112,.262,.38,.519,.015,'white');box(.382,.008,.028,.38,.576,.015,'white');
 box(.38,.033,.26,.38,.474,.015,'blue');box(.29,.05,.21,.33,.602,.02,'black');
 // Individual, slightly untidy pairs of trainers, loafers, sandals and boots.
 function shoe(x,z,yaw,key,boot=false){
  const s=new THREE.Group();s.position.set(x,.016,z);s.rotation.y=yaw;g.add(s);
  const soft=(w,h,d,x,y,z,key)=>{const o=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,.024),m[key]);o.position.set(x,y,z);s.add(o);return o;};
  soft(.11,.025,.27,0,.018,0,key==='cream'?'white':'black');
  soft(.106,.068,.25,0,.06,0,key);soft(.095,boot?.14:.04,.10,0,boot?.12:.088,-.071,key);
  soft(.063,.008,.053,0,boot?.193:.112,-.063,'black');
  if(key==='cream'||key==='blue')for(let i=0;i<4;i++)soft(.070,.008,.009,0,.098,-.01+i*.024,'white');
 }
 for(const [x,z,a,c,b] of [[-.43,.31,.25,'black'],[-.29,.35,.06,'black'],[-.10,.44,-.42,'cream'],[.04,.41,-.12,'cream'],[.31,.49,.3,'walnut'],[.46,.55,.6,'walnut'],[-.77,.08,-.5,'blue'],[-.80,.26,.2,'blue'],[.76,.12,-.3,'oak',true],[.87,.17,.04,'oak',true],[-.3,-.02,.13,'cream'],[-.13,0,.02,'cream'],[.15,0,-.2,'black'],[.30,.01,0,'black']])shoe(x,z,a,c,b);
 world.colliders.push({x,z,w:1.34,d:.45,angle:g.rotation.y,top:.91,landable:true,label:g.name});
 world.lobbyBench=g;
}
