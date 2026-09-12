import * as THREE from 'three';
import {planPoint} from './house-layout.js';

// Facing the kitchen wall from the cellar walkway, east is on the left.
// These are photo-based proportions; the private reference photos do not ship.
export const HALLWAY_ART=[
 {id:'ink',name:'Tall ink drawing',x:658,y:2.03,width:.54,height:1.01,mat:.042,frame:.058,style:'black',uv:[2,2,570,1020]},
 {id:'bench',name:'Gold-framed bench print',x:620,y:2.16,width:.88,height:.34,mat:.012,frame:.041,style:'gold',uv:[576,2,957,506]},
 {id:'miniature',name:'White-framed mechanical landscape',x:580,y:2.16,width:.24,height:.36,mat:.022,frame:.017,style:'white',uv:[746,514,630,507]}
];

export function buildHallwayGallery(world,root,m){
 const group=new THREE.Group();group.name='Hallway art gallery';root.add(group);
 const black=world.mat(0x292724,.38,.16),gold=world.mat(0x9a702f,.4,.25),edge=world.mat(0x766b56,.45,.22),paper=world.mat(0xcfc7b3,.95);
 const box=(w,h,d,x,y,z,material,parent)=>world.box(w,h,d,x,y,z,material,parent);
 const mount=(px,y)=>{const g=new THREE.Group(),[x,z]=planPoint(px,718);g.position.set(x,y,z-.08);g.rotation.y=Math.PI;group.add(g);return g;};
 // Non-overlapping rails with a shallow moulded lip, not flat picture decals.
 const rails=(g,w,h,t,z,d,material)=>{
  for(const x of [-1,1])box(t,h+2*t,d,x*(w+t)/2,0,z,material,g);
  for(const y of [-1,1])box(w,t,d,0,y*(h+t)/2,z,material,g);
 };
 for(const art of HALLWAY_ART){
  const g=mount(art.x,art.y);g.name=art.name;
  const w=art.width+art.mat*2,h=art.height+art.mat*2,t=art.frame,finish=art.style==='black'?black:art.style==='gold'?gold:m.white;
  box(w+2*t-.012,h+2*t-.012,.016,0,0,.01,black,g);
  box(w,h,.006,0,0,.025,paper,g);
  const surface=new THREE.MeshStandardMaterial({color:0xe4dfd0,roughness:.88});m['hallArt_'+art.id]=surface;
  const print=new THREE.Mesh(new THREE.PlaneGeometry(art.width,art.height),surface);print.name=art.name+' paper';print.position.z=.029;print.receiveShadow=true;g.add(print);
  rails(g,w,h,t,.031,.043,finish);
  rails(g,w-.007,h-.007,.007,.056,.007,art.style==='white'?m.white:edge);
  if(art.style!=='white'){
   rails(g,w+2*t-.014,h+2*t-.014,.007,.057,.01,edge);
   // Small carved corner rosettes and repeated beading catch the room light.
   for(const sx of [-1,1])for(const sy of [-1,1]){
    const c=new THREE.Group();c.position.set(sx*(w+t)/2,sy*(h+t)/2,.055);g.add(c);
    for(let i=0;i<6;i++){const a=i*Math.PI/3,r=t*.26;const leaf=new THREE.Mesh(new THREE.SphereGeometry(t*.19,8,6),edge);leaf.scale.set(.58,1.8,.35);leaf.rotation.z=a;leaf.position.set(Math.sin(a)*r,Math.cos(a)*r,0);c.add(leaf);}
   }
   if(art.style==='gold')for(const sy of [-1,1])for(let x=-w/2+.018;x<w/2;x+=.028){const bead=new THREE.Mesh(new THREE.SphereGeometry(.0035,6,4),edge);bead.position.set(x,sy*(h+t)/2,.059);g.add(bead);}
  }
 }
 // The tall ochre frame surrounds the existing narrow kitchen window.
 const niche=mount(551,2.30);niche.name='Gold hallway window surround';
 rails(niche,.445,1.105,.066,.034,.064,gold);
 box(.44,.024,.12,0,-.55,.062,gold,niche);
 const tint=new THREE.Mesh(new THREE.PlaneGeometry(.43,1.09),new THREE.MeshStandardMaterial({color:0x625344,roughness:.22,transparent:true,opacity:.36,depthWrite:false}));tint.position.z=.005;niche.add(tint);
 for(let i=0;i<6;i++){
  const x=-.15+i*.056,h=.025+(i%3)*.015;
  box(.028,h,.027,x,-.532+h/2,.047,[m.teal,m.white,gold][i%3],niche);
  box(.013,.012,.013,x,-.526+h,.047,black,niche);
 }
}

export function applyHallwayArt(atlas,materials,anisotropy){
 // Inset each atlas rectangle to prevent the neighboring print bleeding in.
 for(const art of HALLWAY_ART){
  const [x,y,w,h]=art.uv,map=atlas.clone();map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=anisotropy;
  map.repeat.set(w/atlas.image.width,h/atlas.image.height);map.offset.set(x/atlas.image.width,1-(y+h)/atlas.image.height);map.needsUpdate=true;
  const material=materials['hallArt_'+art.id];material.map=map;material.color.set(0xffffff);material.needsUpdate=true;
 }
 atlas.dispose();
}
