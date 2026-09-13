import * as THREE from 'three';

// Project each triangle in metres, before merging meshes. This keeps fine grain
// the same size on a 20 cm cabinet edge and a five-metre wall.
export function scaleMaterialUVs(geometry,meters){
 const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),uv=new Float32Array(p.count*2);
 for(let i=0;i<p.count;i+=3){
  const normal=new THREE.Vector3();for(let j=0;j<3;j++)normal.add(new THREE.Vector3().fromBufferAttribute(n,i+j));
  const a=[Math.abs(normal.x),Math.abs(normal.y),Math.abs(normal.z)],axis=a.indexOf(Math.max(...a));
  for(let j=0;j<3;j++){const k=i+j,x=p.getX(k),y=p.getY(k),z=p.getZ(k);uv[k*2]=(axis===0?z:x)/meters;uv[k*2+1]=(axis===1?z:y)/meters;}
 }
 geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));return geometry;
}

export function applyHouseTextures(atlas,materials,anisotropy){
 const tile=(col,row)=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const w=atlas.image.width/3,h=atlas.image.height/2;
  canvas.getContext('2d').drawImage(atlas.image,col*w+1,row*h+1,w-2,h-2,0,0,512,512);
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=anisotropy;return t;
 };
 const plaster=tile(0,0),paint=tile(1,0),stone=tile(2,0),wood=tile(0,1),breccia=tile(1,1),fabric=tile(2,1);
 const floor=tile(0,1),ctx=floor.image.getContext('2d');
 // Narrow staggered boards instead of one stretched timber sheet.
 ctx.strokeStyle='rgba(46,29,17,.22)';ctx.lineWidth=1;
 for(let x=0;x<512;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,512);ctx.stroke();const y=(x/64%3)*170;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+64,y);ctx.stroke();}floor.needsUpdate=true;
 for(const [key,map,bump,tint] of [['plaster',plaster,.0006,0xffffff],['sage',paint,.0004,0xffffff],['marble',stone,.0007,0xffffff],['oak',wood,.001,0xffffff],['oakFloor',floor,.001,0xc6a786],['walnut',wood,.001,0x685243],['breccia',breccia,.0003,0xffffff],['vanityStone',breccia,.0003,0xb29b80],['orange',fabric,.0008],['cream',fabric,.0008],['blue',fabric,.0008]]){
  const m=materials[key];if(tint)m.color.set(tint);m.map=map;m.bumpMap=map;m.bumpScale=bump;m.needsUpdate=true;
 }
 if(materials.boucle){materials.boucle.map=fabric;materials.boucle.bumpMap=fabric;materials.boucle.bumpScale=.0018;materials.boucle.needsUpdate=true;}
 if(materials.diningTimber){materials.diningTimber.map=wood;materials.diningTimber.bumpMap=wood;materials.diningTimber.bumpScale=.001;materials.diningTimber.needsUpdate=true;}
 atlas.dispose();
}
