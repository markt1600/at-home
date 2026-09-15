import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {planPoint} from './house-layout.js';

// Thick ribbed privacy glass diffuses the room behind it. Opaque shaded blocks
// approximate that scattering without a transparent pane or an extra refraction pass.
export function glassBlockMaterial() {
  const size=128, pixels=new Uint8Array(size*size*4),tones=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/(size-1),v=y/(size-1),edge=Math.min(u,1-u,v,1-v);
    const rim=THREE.MathUtils.smoothstep(edge,.015,.065);
    const rib=Math.cos(u*Math.PI*32),value=Math.round(128+rim*65*rib);
    const i=(y*size+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=value;pixels[i+3]=255;
    // Dense fluting, a darker thick-glass rim and a softly clouded centre also
    // read at low phone resolutions where subtle bump highlights disappear.
    const centre=THREE.MathUtils.smoothstep(edge,.055,.18);
    const lip=Math.exp(-Math.pow((edge-.034)/.014,2));
    const glow=.72+centre*.20+lip*.16+rim*rib*.047;
    tones[i]=tones[i+1]=tones[i+2]=Math.round(Math.min(1,glow)*255);tones[i+3]=255;
  }
  const bump=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat);
  bump.magFilter=THREE.LinearFilter;bump.minFilter=THREE.LinearMipmapLinearFilter;
  bump.generateMipmaps=true;bump.needsUpdate=true;
  const map=new THREE.DataTexture(tones,size,size,THREE.RGBAFormat);
  map.colorSpace=THREE.SRGBColorSpace;map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;
  map.generateMipmaps=true;map.needsUpdate=true;
  return new THREE.MeshStandardMaterial({color:0xbecfca,roughness:.29,metalness:.12,
    emissive:0x94aaa7,emissiveIntensity:.08,map,bumpMap:bump,bumpScale:.006,vertexColors:true});
}

export function buildGlassBlockWall(world,root,wall,materials,{base=.75,top=3.41}={}) {
  const [x,z]=planPoint(...wall.a),[xx,zz]=planPoint(...wall.b);
  const width=Math.hypot(xx-x,zz-z),height=top-base,depth=.105,joint=.009;
  const group=new THREE.Group();group.name='Translucent square glass-block partition';
  group.position.set((x+xx)/2,base,(z+zz)/2);group.rotation.y=-Math.atan2(zz-z,xx-x);root.add(group);
  const columns=Math.round(width/.205),rows=Math.round(height/.205);
  const w=width/columns,h=height/rows;
  const template=new RoundedBoxGeometry(w-joint,h-joint,depth,2,.013);
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
    const geometry=template.clone(),count=geometry.attributes.position.count,colors=new Float32Array(count*3);
    const tint=.94+((row*7+col*3)%5)*.014;colors.fill(tint);
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    const block=new THREE.Mesh(geometry,materials.glassblock);block.name='Ribbed translucent glass block';
    block.position.set(-width/2+(col+.5)*w,(row+.5)*h,0);
    block.castShadow=block.receiveShadow=true;group.add(block);
  }
  template.dispose();
  // Mortar fills the joints without a continuous flat backing that could show
  // through the grooves or fight with the individual block faces.
  for(let i=0;i<=columns;i++)world.box(joint,height,depth-.025,-width/2+i*w,height/2,0,materials.white,group);
  for(let i=0;i<=rows;i++)world.box(width,joint,depth-.025,0,i*h,0,materials.white,group);
  world.colliders.push({x:group.position.x,z:group.position.z,w:width,d:depth,
    angle:group.rotation.y,wall:wall.id});
  return group;
}
