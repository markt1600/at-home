import * as THREE from 'three';
import {planPoint} from './house-layout.js';

// Beolab 50, natural aluminium / black fabric. Authored geometry following B&O's
// 45.5 cm top width, 28.5 cm base width, 50 cm depth and 103.6 cm closed height.
export function buildLivingSpeakers(world,root,m){
 const aluminium=world.mat(0xbfc3c0,.29,.82),fabric=world.mat(0x171b1a,.96);
 const weave=new Uint8Array(8*8*4);
 for(let y=0;y<8;y++)for(let x=0;x<8;x++){const i=(y*8+x)*4,v=(x%2===0?155:93)+(y%2===0?16:0);weave.set([v,v,v,255],i);}
 const texture=new THREE.DataTexture(weave,8,8);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(130,260);texture.needsUpdate=true;fabric.bumpMap=texture;fabric.bumpScale=.0006;
 // Rounded triangular plan: broad curved grille in front, tapering to the rear.
 const footprint=new THREE.Shape();footprint.moveTo(-1,.63);footprint.bezierCurveTo(-1,1,1,1,1,.63);footprint.bezierCurveTo(1,.15,.30,-1,0,-1);footprint.bezierCurveTo(-.30,-1,-1,.15,-1,.63);
 const outline=footprint.getPoints(24),levels=[[.024,.118],[.044,.135],[.09,.145],[.19,.159],[.48,.185],[.84,.215],[.996,.2275],[1.026,.224],[1.036,.215]];
 function hull(){
  const positions=[],uv=[],indices=[],n=outline.length;
  for(let j=0;j<levels.length;j++){const [y,w]=levels[j];for(let i=0;i<n;i++){const p=outline[i];positions.push(p.x*w,y,p.y*.25);uv.push(i/(n-1),y);}}
  for(let j=0;j<levels.length-1;j++)for(let i=0;i<n-1;i++){const a=j*n+i,b=a+n;indices.push(a,a+1,b,a+1,b+1,b);}
  for(const j of [0,levels.length-1]){const center=positions.length/3;positions.push(0,levels[j][0],0);uv.push(.5,.5);for(let i=0;i<n-1;i++){const a=j*n+i;indices.push(...(j?[center,a,a+1]:[center,a+1,a]));}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
 }
 // Curved fabric grille inset inside the visible aluminium rim, including rounded toe.
 function grille(){
  const positions=[],uv=[],indices=[],rows=36,cols=24;
  for(let j=0;j<=rows;j++){const t=j/rows,y=.075+t*.938;let k=1;while(k<levels.length-1&&levels[k][0]<y)k++;const [ya,wa]=levels[k-1],[yb,wb]=levels[k],width=wa+(wb-wa)*(y-ya)/(yb-ya)-.013;
   const round=Math.min(1,Math.sqrt(Math.max(0,1-((Math.max(0,.085-t)/.085))**2)),Math.sqrt(Math.max(0,1-(Math.max(0,t-.975)/.025)**2)));
   for(let i=0;i<=cols;i++){const u=i/cols*2-1;positions.push(u*width*round,y,.248-.055*u*u);uv.push(i/cols,t);}}
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;indices.push(a,a+1,b,a+1,b+1,b);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
 }
 for(const pz of [568,676]){
  const group=new THREE.Group(),[x,z]=planPoint(332,pz);group.name='Beolab 50 speaker';group.position.set(x,0,z);group.rotation.y=Math.PI/2;root.add(group);
  for(const [geometry,material] of [[hull(),aluminium],[grille(),fabric]]){const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}
  // Recessed black side grilles and the closed acoustic lens on the top cap.
  const points=[],tex=[],triangles=[],first=27,last=outline.length-4,count=last-first+1;
  for(let j=2;j<=6;j++)for(let i=first;i<=last;i++){const p=outline[i];points.push(p.x*(levels[j][1]+.0015),levels[j][0],p.y*.252);tex.push((i-first)/(count-1),levels[j][0]);}
  for(let j=0;j<4;j++)for(let i=0;i<count-1;i++){const a=j*count+i,b=a+count;triangles.push(a,a+1,b,a+1,b+1,b);}
  const sideGeometry=new THREE.BufferGeometry();sideGeometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));sideGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(tex,2));sideGeometry.setIndex(triangles);sideGeometry.computeVertexNormals();const sides=new THREE.Mesh(sideGeometry,fabric);sides.castShadow=true;group.add(sides);
  const cap=world.cyl(.070,.070,.006,0,1.037,.069,aluminium,group,48);cap.scale.z=.82;
  const lens=world.cyl(.059,.059,.002,0,1.041,.069,m.black,group,48);lens.scale.z=.82;
  world.box(.041,.004,.002,0,.118,.250,aluminium,group);
  world.colliders.push({x,z,w:.5,d:.455,top:1.044});
 }
}
