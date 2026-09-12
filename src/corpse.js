import * as THREE from 'three';

// Reconstruct a closed, rounded relief from the actual visitor silhouette. The
// photograph supplies face/clothing detail; geometry supplies depth and lighting.
export function corpseGeometry(atlas,index,height,{rows=192}={}){
 const frame=atlas.userData.frames[index%3],pixels=atlas.userData.pixels;
 const fw=frame.x1-frame.x0,fh=frame.y1-frame.y0,width=height*fw/fh;
 const cols=Math.max(8,Math.round(rows*width/height)),dx=width/cols,dy=height/rows;
 const mask=new Uint8Array(cols*rows),distance=new Float32Array(mask.length);
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const px=Math.min(frame.x1-1,Math.floor(frame.x0+(x+.5)/cols*fw));
  const py=Math.min(frame.y1-1,Math.floor(frame.y1-(y+.5)/rows*fh));
  const i=y*cols+x;mask[i]=pixels[(py*atlas.image.width+px)*4+3]>=128?1:0;distance[i]=mask[i]?rows:0;
 }
 // Distance inside the silhouette rounds each limb independently, preserving
 // the empty spaces between arms and torso and between the two legs.
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const i=y*cols+x;if(mask[i])distance[i]=Math.min(distance[i],x?distance[i-1]+1:1,y?distance[i-cols]+1:1);
 }
 for(let y=rows-1;y>=0;y--)for(let x=cols-1;x>=0;x--){
  const i=y*cols+x;if(mask[i])distance[i]=Math.min(distance[i],x<cols-1?distance[i+1]+1:1,y<rows-1?distance[i+cols]+1:1);
 }
 const inside=(x,y)=>x>=0&&y>=0&&x<cols&&y<rows&&mask[y*cols+x];
 const positions=[],uvs=[],indices=[],vertices=new Map();
 function vertex(x,y,front){
  const key=((y*(cols+1)+x)*2)+(front?1:0);if(vertices.has(key))return vertices.get(key);
  let d=Infinity;for(const [a,b] of [[x-1,y-1],[x,y-1],[x-1,y],[x,y]])d=Math.min(d,inside(a,b)?distance[b*cols+a]:0);
  const r=Math.min(1,d*Math.min(dx,dy)/.15),depth=.012+.25*Math.sqrt(1-(1-r)**2);
  const n=positions.length/3;positions.push(x*dx-width/2,y*dy,front?depth:0);uvs.push(x/cols,y/rows);vertices.set(key,n);return n;
 }
 function quad(a,b,c,d){indices.push(a,b,c,a,c,d);}
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(inside(x,y)){
  const a=vertex(x,y,true),b=vertex(x+1,y,true),c=vertex(x+1,y+1,true),d=vertex(x,y+1,true);
  const A=vertex(x,y,false),B=vertex(x+1,y,false),C=vertex(x+1,y+1,false),D=vertex(x,y+1,false);
  quad(a,b,c,d);quad(D,C,B,A);
  if(!inside(x,y-1))quad(A,B,b,a);
  if(!inside(x+1,y))quad(B,C,c,b);
  if(!inside(x,y+1))quad(C,D,d,c);
  if(!inside(x-1,y))quad(D,A,a,d);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 return geometry;
}

export function corpseTexture(atlas,index){
 const frame=atlas.userData.frames[index%3],source=atlas.userData.pixels;
 const h=Math.min(1024,frame.y1-frame.y0),w=Math.max(1,Math.round(h*(frame.x1-frame.x0)/(frame.y1-frame.y0)));
 const data=new Uint8Array(w*h*4),seen=new Uint8Array(w*h),queue=new Uint32Array(w*h);let tail=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const px=Math.floor(frame.x0+(x+.5)/w*(frame.x1-frame.x0)),py=Math.floor(frame.y0+(y+.5)/h*(frame.y1-frame.y0));
  const src=(py*atlas.image.width+px)*4,i=y*w+x;
  data.set(source.subarray(src,src+3),i*4);data[i*4+3]=255;
  if(source[src+3]>=128){seen[i]=1;queue[tail++]=i;}
 }
 // Extend edge colours into transparent pixels so rounded sidewalls and mipmaps
 // never reveal the magenta photography backdrop. No extra texture downloads.
 for(let head=0;head<tail;head++){
  const i=queue[head],x=i%w,y=Math.floor(i/w);
  for(const j of [x?i-1:-1,x<w-1?i+1:-1,y?i-w:-1,y<h-1?i+w:-1])if(j>=0&&!seen[j]){
   seen[j]=1;queue[tail++]=j;data.set(data.subarray(i*4,i*4+3),j*4);
  }
 }
 const map=new THREE.DataTexture(data,w,h);map.colorSpace=THREE.SRGBColorSpace;map.flipY=true;map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.needsUpdate=true;return map;
}

export function collapseVisitor(visitor,atlas,index){
 const old=visitor.userData.body,height=visitor.userData.height;
 const body=new THREE.Mesh(corpseGeometry(atlas,index,height),new THREE.MeshStandardMaterial({map:corpseTexture(atlas,index),color:0xc2c6bb,roughness:.88,metalness:0}));
 body.name='Textured volumetric body';body.castShadow=true;body.receiveShadow=true;
 old.removeFromParent();old.geometry.dispose();old.material.map?.dispose();old.material.dispose();
 const fall=new THREE.Group();fall.name='Falling body';fall.add(body);visitor.add(fall);visitor.userData.body=body;visitor.userData.fall=fall;visitor.userData.fallTime=0;
 // The outer group keeps its world yaw. Only the inner group pitches, avoiding
 // the Euler-axis error that left the previous flat sprite on its edge.
 const shadow=visitor.userData.contactShadow;
 if(shadow){shadow.geometry.dispose();shadow.geometry=new THREE.PlaneGeometry(height*.45,height*1.12);shadow.position.z=-height/2;shadow.material.uniforms.opacity.value=.25;}
 return body;
}

export function updateVisitorFall(visitor,dt){
 const fall=visitor.userData.fall;if(!fall)return;
 visitor.userData.fallTime=Math.min(.85,visitor.userData.fallTime+dt);
 const t=visitor.userData.fallTime/.85,ease=t*t*(3-2*t);
 fall.rotation.x=-Math.PI/2*ease;fall.position.y=.012*ease;
}

export function bodyWoundAnchor(visitor,point){
 const parent=visitor.userData.fall||visitor;parent.updateWorldMatrix(true,true);
 const local=parent.worldToLocal(point.clone()),body=visitor.userData.body;
 if(visitor.userData.fall&&body){
  const origin=parent.localToWorld(new THREE.Vector3(local.x,local.y,1));
  const direction=new THREE.Vector3(0,0,-1).transformDirection(parent.matrixWorld);
  const hit=new THREE.Raycaster(origin,direction,0,2).intersectObject(body,false)[0];
  if(hit)return{parent,point:parent.worldToLocal(hit.point),normal:hit.face.normal.clone()};
 }
 local.z=.018;return{parent,point:local,normal:new THREE.Vector3(0,0,1)};
}
