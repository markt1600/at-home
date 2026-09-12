import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {planPoint,PLAN_SCALE,GUEST_MIRROR_POSITION} from './house-layout.js';

function helpers(world,root,m){
 const box=(w,h,d,x,y,z,key='white',parent=root)=>world.box(w,h,d,x,y,z,typeof key==='string'?m[key]:world.mat(key),parent);
 const soft=(w,h,d,x,y,z,key='cream',parent=root)=>{const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,.045),typeof key==='string'?m[key]:world.mat(key));mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 const at=(px,pz,y=.75,a=0)=>{const g=new THREE.Group(),[x,z]=planPoint(px,pz);g.position.set(x,y,z);g.rotation.y=a;root.add(g);return g;};
 const block=(px,pz,w,d)=>{const [x,z]=planPoint(px,pz);world.colliders.push({x,z,w,d});};
 const cyl=(r,h,x,y,z,key='steel',p=root)=>world.cyl(r,r,h,x,y,z,m[key],p,16);
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
 block(954,339,2.12,2.18);
 const bedside=at(929,398);box(.55,.52,.46,0,.29,0,'walnut',bedside);box(.56,.03,.47,0,.565,0,'walnut',bedside);cyl(.035,.13,.14,.65,0,'teal',bedside);block(929,398,.57,.48);
 // Recessed wardrobe fronts between the entry and en-suite, not a desk here.
 const closet=at(947,469,.75,Math.PI);box(1.87,2.42,.60,0,1.21,0,'walnut',closet);
 for(let i=0;i<4;i++){const x=-.935+(i+.5)*1.87/4;box(.455,2.39,.022,x,1.21,.314,'walnut',closet);box(.013,.41,.025,x+.17,1,.34,'black',closet);}
 for(const x of [-1.005,1.005])box(.13,2.66,.67,x,1.33,0,'plaster',closet);box(2.14,.24,.69,0,2.54,0,'plaster',closet);block(947,469,2.12,.69);
 const entryStorage=at(881,516,.75,Math.PI);box(1.1,2.52,.6,0,1.26,0,'walnut',entryStorage);for(const x of [-.28,.28]){box(.53,2.48,.024,x,1.26,.31,'walnut',entryStorage);box(.01,.4,.025,x+.2,1,.33,'black',entryStorage);}block(881,516,1.1,.64);
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
 for(const [px,pz,y] of [[440,610,2.73],[983,352,3.21],[390,300,3.34]]){
  const g=at(px,pz,y);cyl(.065,.17,0,.06,0,'white',g);cyl(.13,.085,0,-.05,0,'white',g);
  for(let i=0;i<3;i++){const shape=new THREE.Shape();shape.moveTo(.07,-.03);shape.bezierCurveTo(.26,-.13,.6,-.21,.71,-.07);shape.bezierCurveTo(.73,.02,.36,.06,.07,.04);const geo=new THREE.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:false});geo.rotateX(-Math.PI/2);const blade=new THREE.Mesh(geo,m.steel);blade.rotation.y=i*Math.PI*2/3;blade.position.y=-.08;blade.castShadow=true;g.add(blade);}
 }
 // Domestic finishing details: switch plates, outlets and sink tap spout.
 for(const [px,pz,y,a] of [[855,481,1.62,Math.PI/2],[526,819,1.35,Math.PI/2],[1049,401,1.05,-Math.PI/2],[415,400,1.6,0],[852,684,1.55,Math.PI]]){
  const g=at(px,pz,y,a);box(.084,.084,.014,0,0,0,'white',g);for(const x of [-.018,.018])box(.018,.045,.017,x,0,.004,'cream',g);
 }
 const [sx,sz]=planPoint(535,801);const tap=new THREE.Mesh(new THREE.TorusGeometry(.085,.018,8,16,Math.PI),m.steel);tap.position.set(sx+.085,1.70,sz);root.add(tap);cyl(.018,.07,sx+.17,1.665,sz,'steel');
 // The walkthrough's black-and-white floor speakers beside the living glazing.
 for(const pz of [568,680]){const g=at(332,pz,0);soft(.3,1.02,.32,0,.53,0,'white',g);soft(.22,.77,.075,0,.59,.164,'black',g);}
}
