import * as THREE from 'three';

const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
const area=p=>Math.abs(p.reduce((a,v,i)=>a+v.q[0]*p[(i+1)%p.length].q[1]-v.q[1]*p[(i+1)%p.length].q[0],0)/2);
const bounds=p=>[Math.min(...p.map(v=>v.q[0])),Math.min(...p.map(v=>v.q[1])),Math.max(...p.map(v=>v.q[0])),Math.max(...p.map(v=>v.q[1]))];
const intersects=(a,b)=>Math.min(a[2],b[2])-Math.max(a[0],b[0])>1e-7&&Math.min(a[3],b[3])-Math.max(a[1],b[1])>1e-7;
function split(poly,a,b){
 const inside=[],outside=[];
 for(let i=0;i<poly.length;i++){
  const s=poly[i],e=poly[(i+1)%poly.length],ds=cross(a,b,s.q),de=cross(a,b,e.q);
  (ds>=0?inside:outside).push(s);
  if((ds>=0)!==(de>=0)){
   const t=ds/(ds-de),v={};for(const key of Object.keys(s))v[key]=s[key].map((x,j)=>x+(e[key][j]-x)*t);
   inside.push(v);outside.push(v);
  }
 }
 return{inside,outside};
}
function subtract(subject,clip){
 let intersection=subject;
 for(let i=0;i<clip.length&&intersection.length>=3;i++)intersection=split(intersection,clip[i].q,clip[(i+1)%clip.length].q).inside;
 if(intersection.length<3||area(intersection)<1e-9)return[subject];
 const remainder=[];let inside=subject;
 for(let i=0;i<clip.length&&inside.length>=3;i++){
  const next=split(inside,clip[i].q,clip[(i+1)%clip.length].q);if(next.outside.length>=3&&area(next.outside)>1e-9)remainder.push(next.outside);inside=next.inside;
 }
 return remainder;
}

// Opaque box faces are clipped against earlier faces on the same plane before
// batching. This removes z-fighting at partial joins without moving surfaces,
// hiding whole walls, altering collisions or changing interpolated texture UVs.
// Opposite-facing contact faces, glass and curved geometry remain independent.
export function resolveSurfaceJoins(records){
 const planes=new Map();let trimmedFaces=0,removedArea=0;
 for(const record of records){
  if(!record.box||record.material.transparent)continue;
  const g=record.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,color=g.attributes.color,output=[];let changed=false;
  for(let face=0;face<6;face++){
   const normal=new THREE.Vector3().fromBufferAttribute(n,face*6).normalize();
   const canonical=normal.toArray().map(x=>Math.round(x*1e5)/1e5),normalKey=canonical.join(',');
   const axis=new THREE.Vector3(...canonical).normalize(),u=new THREE.Vector3().crossVectors(axis,Math.abs(axis.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0)).normalize(),v=new THREE.Vector3().crossVectors(axis,u);
   const polygon=[0,1,4,2].map(j=>{const i=face*6+j,pos=new THREE.Vector3().fromBufferAttribute(p,i);return{p:pos.toArray(),n:[n.getX(i),n.getY(i),n.getZ(i)],uv:[uv.getX(i),uv.getY(i)],q:[pos.dot(u),pos.dot(v)],...(color?{color:[color.getX(i),color.getY(i),color.getZ(i)]}:{})};});
   const signed=polygon.reduce((a,p,i)=>a+p.q[0]*polygon[(i+1)%4].q[1]-p.q[1]*polygon[(i+1)%4].q[0],0);if(signed<0)polygon.reverse();
   const distance=axis.dot(new THREE.Vector3(...polygon[0].p)),bin=Math.round(distance*1e4),box=bounds(polygon);let pieces=[polygon];
   for(const offset of [-1,0,1])for(const previous of planes.get(normalKey+':'+(bin+offset))||[]){
    if(Math.abs(previous.distance-distance)>1e-5||!intersects(box,previous.bounds))continue;
    pieces=pieces.flatMap(piece=>subtract(piece,previous.polygon));if(!pieces.length)break;
   }
   const difference=area(polygon)-pieces.reduce((sum,p)=>sum+area(p),0);
   if(difference>1e-9){trimmedFaces++;removedArea+=difference;changed=true;}
   for(const piece of pieces)for(let i=1;i<piece.length-1;i++)output.push(piece[0],piece[i],piece[i+1]);
   const key=normalKey+':'+bin;if(!planes.has(key))planes.set(key,[]);planes.get(key).push({polygon,bounds:box,distance});
  }
  if(changed){
   const geometry=new THREE.BufferGeometry();for(const [name,key,size] of [['position','p',3],['normal','n',3],['uv','uv',2]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(output.flatMap(v=>v[key]),size));
   if(color)geometry.setAttribute('color',new THREE.Float32BufferAttribute(output.flatMap(v=>v.color),3));
   g.dispose();record.geometry=geometry;
  }
 }
 return{trimmedFaces,removedArea};
}
