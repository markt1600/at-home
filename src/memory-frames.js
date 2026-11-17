import * as THREE from 'three';
import {planPoint} from './house-layout.js';
import {memoryMedia} from './memory-media.js';

// Standing picture frames that show photos from the memory library: one each on
// the blue dining sideboard, the office desk and a bedside table. Each is placed on an
// existing, clear furniture top. Empty frames are put away, so the house looks
// the same when there are no photo memories (or while exploring without them).
export const MEMORY_FRAME_SPOTS=[
 // Between the ceramics and the clock, behind them, on the blue dining sideboard.
 {id:'sideboard',name:'Tall brass picture frame on the dining sideboard',plan:[432,872],base:.45,yaw:Math.PI,x:-.04,y:1.0,z:-.06,turn:-.05,width:.2,height:.27,finish:'brass'},
 // Between the black box and the keyboard on the left office desk.
 {id:'office-desk',name:'Small picture frame on the office desk',plan:[867.3,581.5],base:.75,yaw:Math.PI/2,x:-.19,y:.7995,z:.21,turn:.16,width:.12,height:.16,finish:'black'},
 // The clear back corner of the bedside table by the open shelves, beside the lamp.
 {id:'bedside',name:'Walnut picture frame on the bedside table',plan:[548.46,382.68],base:.75,yaw:Math.PI/2,x:.12,y:.485,z:-.14,turn:-.18,width:.12,height:.16,finish:'walnut'}
];
const LEAN=.17,BORDER=.016,MAT=.014;

// The first photo of each chosen memory, one memory per frame.
export function chooseFramePhotos(memories,count=MEMORY_FRAME_SPOTS.length){
 const chosen=[],used=new Set();
 for(const memory of memories){
  if(chosen.length>=count)break;if(!memory||used.has(memory.id))continue;
  const photo=memoryMedia(memory).find(item=>item.type==='image'&&item.src);if(!photo)continue;
  used.add(memory.id);chosen.push({memory,src:photo.src});
 }
 return chosen;
}
// The centred region of a w×h photo that fills a frame of the given shape.
export function coverCrop(width,height,aspect){
 if(!(width>0&&height>0&&aspect>0))return null;
 const w=Math.min(width,height*aspect),h=w/aspect;
 return {x:(width-w)/2,y:(height-h)/2,width:w,height:h};
}

export class MemoryFrames{
 constructor(world,root){
  this.world=world;this.frames=[];this.serial=0;
  // One shared 1×1 texture from the start, so swapping a photo in later never
  // changes the compiled material (and never stalls a frame on first sight).
  this.blank=new THREE.DataTexture(new Uint8Array([228,222,205,255]),1,1);this.blank.colorSpace=THREE.SRGBColorSpace;this.blank.needsUpdate=true;
  const finishes={walnut:world.mat(0x5f4028,.5),brass:world.mat(0x957b4b,.32,.7),black:world.mat(0x1c1b1a,.42,.1)},card=world.mat(0xf1ede2,.9);
  for(const spot of MEMORY_FRAME_SPOTS){
   const [px,pz]=planPoint(...spot.plan),anchor=new THREE.Group();anchor.position.set(px,spot.base,pz);anchor.rotation.y=spot.yaw;anchor.userData.dynamic=true;root.add(anchor);
   const g=new THREE.Group();g.name=spot.name;g.position.set(spot.x,spot.y,spot.z);g.rotation.y=spot.turn;g.visible=false;anchor.add(g);
   // Leaning back on its foot, bottom edge resting on the furniture top.
   const tilt=new THREE.Group();tilt.rotation.x=-LEAN;g.add(tilt);
   const outerW=spot.width+2*(BORDER+MAT),outerH=spot.height+2*(BORDER+MAT),frame=finishes[spot.finish];
   const part=(w,h,d,x,y,z,material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;tilt.add(mesh);return mesh;};
   part(outerW,outerH,.012,0,outerH/2,0,frame);                                   // back board
   part(outerW-2*BORDER,outerH-2*BORDER,.004,0,outerH/2,.008,card);                // mount card
   for(const side of [-1,1]){part(BORDER,outerH,.02,side*(outerW-BORDER)/2,outerH/2,.006,frame);part(outerW-2*BORDER,BORDER,.02,0,outerH/2+side*(outerH-BORDER)/2,.006,frame);}
   const strut=part(.03,outerH*.72,.008,0,outerH*.36,-.006,frame);strut.rotation.x=-.52;strut.position.z=-outerH*.2;strut.position.y=outerH*.33;
   const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.62,map:this.blank,emissive:0xffffff,emissiveMap:this.blank,emissiveIntensity:.16});
   const photo=new THREE.Mesh(new THREE.PlaneGeometry(spot.width,spot.height),material);photo.name=spot.name+' photo';photo.position.set(0,outerH/2,.0112);photo.receiveShadow=true;tilt.add(photo);
   const entry={spot,group:g,photo,material,memory:null,texture:null};this.frames.push(entry);
   anchor.updateWorldMatrix(true,true);
   world.houseInteractions.add({id:'memory-frame-'+spot.id,pos:photo.localToWorld(new THREE.Vector3(0,0,.04)),range:2.3,touchObjects:[photo],surfaceOffset:.1,
    available:()=>!!entry.memory&&g.visible,label:()=>`Look at “${entry.memory?.title||'this photo'}”`,activate:()=>entry.memory&&world.onMemoryFrame?.(entry.memory.id)});
  }
 }
 // Put photos in the frames, loading and cropping each to its frame's shape.
 show(memories,{load=loadFramePhoto}={}){
  const token=++this.serial,chosen=chooseFramePhotos(memories,this.frames.length);
  this.frames.forEach((frame,i)=>{
   const pick=chosen[i];
   if(!pick){this.clear(frame);return;}
   if(frame.memory?.id===pick.memory.id&&frame.src===pick.src){frame.memory=pick.memory;return;}
   load(pick.src,frame.spot.width/frame.spot.height).then(canvas=>{
    if(token!==this.serial)return;
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    this.clear(frame);frame.texture=texture;frame.memory=pick.memory;frame.src=pick.src;frame.material.map=frame.material.emissiveMap=texture;frame.group.visible=true;
   }).catch(()=>{if(token===this.serial)this.clear(frame);});
  });
 }
 clear(frame){frame.group.visible=false;frame.memory=null;frame.src=null;frame.material.map=frame.material.emissiveMap=this.blank;frame.texture?.dispose();frame.texture=null;}
}
async function loadFramePhoto(src,aspect,size=640){
 const image=new Image();image.decoding='async';image.src=src;await image.decode();
 const crop=coverCrop(image.naturalWidth,image.naturalHeight,aspect);if(!crop)throw Error('Photo has no size');
 const canvas=document.createElement('canvas');canvas.width=Math.round(aspect>=1?size:size*aspect);canvas.height=Math.round(aspect>=1?size/aspect:size);
 canvas.getContext('2d').drawImage(image,crop.x,crop.y,crop.width,crop.height,0,0,canvas.width,canvas.height);
 return canvas;
}
