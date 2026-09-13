import * as THREE from 'three';
export function displayHandbag(world,parent,{x,y,z,width=.37,color=0xa1774c,style='kelly',scarf=false,angle=0}){
 const g=new THREE.Group();g.name=style==='birkin'?'Birkin with twin handles and sangles':'Kelly with single handle and turn-lock';g.position.set(x,y,z);g.rotation.y=angle;parent.add(g);
 const leather=world.mat(color,.88,.02),gold=world.mat(0xc6a058,.3,.78),seam=world.mat(new THREE.Color(color).multiplyScalar(.7).getHex(),.98);
 const w=width,h=w*.72,d=w*.41,top=style==='kelly'?.37:.43;
 const shape=new THREE.Shape().moveTo(-w/2,.012).lineTo(w/2,.012).lineTo(w*top,h).lineTo(-w*top,h).closePath();
 const body=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSize:.007,bevelThickness:.006,bevelSegments:2,steps:1}),leather);body.position.z=-d/2;body.castShadow=body.receiveShadow=true;g.add(body);
 const box=(w,h,d,x,y,z,m)=>world.box(w,h,d,x,y,z,m,g);
 const line=(points,r,m)=>{const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),20,r,5,false),m);mesh.castShadow=true;g.add(mesh);return mesh;};
 const face=d/2+.009;
 // Turn-lock, two front closure straps, strap plates and stitched flap.
 box(w*.77,h*.23,.01,0,h*.85,face,leather);
 for(const s of [-1,1]){box(w*.36,h*.075,.012,s*w*.24,h*.69,face+.006,leather);box(w*.11,h*.079,.016,s*w*.095,h*.69,face+.016,gold);box(w*.055,h*.041,.018,s*w*.095,h*.69,face+.025,seam);}
 box(w*.13,h*.075,.014,0,h*.69,face+.028,gold);box(w*.062,.008,.012,0,h*.69,face+.04,seam);
 for(const s of [-1,1])line([[s*w*.45,.025,face],[s*w*.42,h*.4,face],[s*w*top,h*.96,face]],.0019,seam);
 line([[-w*.37,h*.76,face+.009],[0,h*.745,face+.009],[w*.37,h*.76,face+.009]],.0017,seam);
 const handleZ=style==='birkin'?[-d*.3,d*.3]:[0];
 for(const zz of handleZ){
  line([[-w*.20,h-.022,zz],[-w*.21,h+.055,zz],[-w*.13,h+.118,zz],[0,h+.14,zz],[w*.13,h+.118,zz],[w*.21,h+.055,zz],[w*.20,h-.022,zz]],.009,leather);
  for(const s of [-1,1]){box(.025,.045,.012,s*w*.20,h-.015,zz+.007,leather);world.sphere(.005,s*w*.20,h-.023,zz+.016,gold,g);}
  if(scarf){const fabric=world.mat(0xd9d5c6,.95);for(let i=0;i<13;i++){const t=i/12*Math.PI,xx=-Math.cos(t)*w*.205,yy=h+.036+Math.sin(t)*.103;const band=new THREE.Mesh(new THREE.TorusGeometry(.012,.004,5,10),i%3===0?world.mat(0xc66b3f):fabric);band.position.set(xx,yy,zz);band.rotation.y=Math.PI/2;band.rotation.z=-t;g.add(band);}line([[w*.2,h+.027,zz],[w*.22,h-.02,zz+.03],[w*.30,h-.092,zz+.035]],.012,fabric);}
 }
 // Hanging clochette and small padlock rather than a generic central buckle.
 line([[w*.20,h+.025,d*.3],[w*.28,h*.69,face+.017],[w*.25,h*.37,face+.02]],.0035,leather);
 box(w*.11,h*.15,.022,w*.25,h*.34,face+.025,leather);
 box(.023,.031,.018,-w*.045,h*.58,face+.035,gold);
 const shackle=new THREE.Mesh(new THREE.TorusGeometry(.009,.0025,5,14,Math.PI),gold);shackle.position.set(-w*.045,h*.604,face+.035);g.add(shackle);
 for(const s of [-1,1])for(const zz of [-d*.31,d*.31])world.sphere(.007,s*w*.37,.004,zz,gold,g,1,.6,1);
 return g;
}
