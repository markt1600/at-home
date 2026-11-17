import * as THREE from 'three';
import {PLAN_SCALE} from './house-layout.js';
import {accessibleMemorySpot} from './memory-access.js';
import {MEMORY_OPEN_SPOTS} from './memory-floor-geometry.js';
import {compressPhoto} from './photo-compression.js';
import {PETS} from './life.js';

// A photo taken in the house becomes a memory at the spot it was taken from.
const localDay=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
// Pets comfortably inside the picture, nearest first.
export function petsInFrame(world){
 const found=[];
 for(const [id,actor] of world.actors){
  const pet=PETS.find(p=>p.id===id);if(!pet||actor.visible===false)continue;
  const centre=actor.position.clone().add(new THREE.Vector3(0,pet.height/2,0)),distance=centre.distanceTo(world.camera.position),screen=centre.clone().project(world.camera);
  if(distance<9&&screen.z<1&&Math.abs(screen.x)<.82&&Math.abs(screen.y)<.82)found.push({id,name:pet.name,distance});
 }
 return found.sort((a,b)=>a.distance-b.distance);
}
export function photoMemoryTitle(pets,room=''){
 const names=pets.map(p=>p.name),who=names.length>2?`${names.slice(0,-1).join(', ')} and ${names.at(-1)}`:names.join(' and ');
 const named=/^Penny/.test(room),place=named?room:room?room[0].toLowerCase()+room.slice(1):'';
 const where=!place?'at home':named?`in ${place}`:/balcony|yard/.test(place)?`on the ${place}`:`in the ${place}`;
 return (who?`With ${who} ${where}`:`A moment ${where}`).slice(0,100);
}
// Where the memory's marker goes: where the photographer stood, or the nearest open floor.
export function photoMemoryPosition(x,z){
 const spot=accessibleMemorySpot(x*PLAN_SCALE+881,z*PLAN_SCALE+789);if(spot)return spot.position;
 let best=null,distance=Infinity;
 for(const p of MEMORY_OPEN_SPOTS){const d=Math.hypot(p[0]-x,p[2]-z);if(d<distance){best=p;distance=d;}}
 return best.slice(0,3);
}
// Signed-in editors keep the photo in the cloud library as a private draft;
// everyone else keeps it in this browser, exactly like a photo added by hand.
export async function keepPhotoAsMemory(blob,{title,description='',position,today=new Date(),compress=compressPhoto,fetch:request=globalThis.fetch,uploadBlob,addLocal,saveLocalMetadata}){
 title=String(title||'').trim().slice(0,100);if(!title)throw Error('Give this photo a title first.');
 const file=await compress(new File([blob],'at-home-photo.png',{type:'image/png'}),{force:true}),date=localDay(today);
 let session=null;try{const r=await request('/api/memories?action=session',{credentials:'same-origin',cache:'no-store'});if(r.ok)session=await r.json();}catch{}
 if(session?.authenticated&&session.storage){
  const id=crypto.randomUUID(),path=`media/${id}/${crypto.randomUUID()}.jpg`;
  await (uploadBlob||(await import('@vercel/blob/client')).upload)(path,file,{access:'private',handleUploadUrl:'/api/memory-upload',multipart:true,contentType:'image/jpeg'});
  const r=await request('/api/memories',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({id,title,date,description,position,addMediaPaths:[path],published:false})});
  const saved=await r.json().catch(()=>({}));if(!r.ok)throw Error(saved.error||'The photo could not be saved to your library.');
  return {where:'cloud',id:saved.id,message:'Saved to your memory library as a private draft. Publish it in the memory studio to show it in the house.'};
 }
 const added=await addLocal([file],{position,description},title);await saveLocalMetadata(added.id,{title,date,description,position});
 return {where:'device',id:added.id,memory:added,message:'Saved as a memory on this device. Its marker is where you were standing.'};
}
