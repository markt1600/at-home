import * as THREE from 'three';
import {planPoint} from './house-layout.js';

export function buildBalconyWallDetails(world,root,m){
 const at=(name,px,pz,y=0)=>{const g=new THREE.Group(),[x,z]=planPoint(px,pz);g.name=name;g.position.set(x,y,z);root.add(g);return g;};
 const box=(g,w,h,d,x,y,z,mat)=>world.box(w,h,d,x,y,z,mat,g);
 // Canvas on the solid bathroom wall, above the orange sofa and left of the claw machine.
 const art=at('Circular collage above orange sofa',386,486.2,2.17);
 const surface=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.92});m.balconyCollage=surface;
 box(art,1.22,1.22,.036,0,0,0,m.cream);
 const paper=new THREE.Mesh(new THREE.PlaneGeometry(1.22,1.22),surface);paper.position.z=.0195;art.add(paper);
 // A slim freestanding spine shelf almost hidden behind irregular horizontal stacks.
 const books=at('Tall stacked bookshelf beside balcony',343,548);const [x,z]=planPoint(343,548);
 box(books,.47,.035,.41,0,.0175,0,m.steel);box(books,.045,2.46,.045,0,1.25,-.12,m.steel);
 const covers=[m.cream,m.teal,m.black,m.orange,m.oak,m.blue,m.white,m.walnut];
 let y=.044;
 for(let i=0;i<72;i++){
  const h=.020+(i*7%5)*.006,w=.34+(i*11%7)*.013,d=.24+(i%4)*.017,g=new THREE.Group();g.position.set(Math.sin(i*1.7)*.024,y,Math.cos(i*1.3)*.018);g.rotation.y=Math.sin(i*2.13)*.10;books.add(g);
  const cover=covers[i%covers.length];box(g,w,h-.003,d,0,h/2,0,m.cream);
  for(const yy of [.001,h-.001])box(g,w+.005,.002,d+.005,0,yy,0,cover);
  box(g,w,h,.007,0,h/2,d/2,cover);
  // Fine bands suggest spine lettering without copying private book inscriptions.
  for(let j=0;j<3;j++)box(g,w*(.18+j*.10),.002,.001,0,h/2+(j-1)*.005,d/2+.004,i%8===0?m.black:m.cream);
  if(i%6===0)box(books,.32,.012,.28,0,y-.007,0,m.steel);
  y+=h+.001;
 }
 world.colliders.push({x,z,w:.53,d:.47});
}

export function applyBalconyWallArt(texture,m,anisotropy){texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=anisotropy;m.balconyCollage.map=texture;m.balconyCollage.needsUpdate=true;}
