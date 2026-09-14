import {memoryMedia,releaseMemoryUrls,validateMemoryFiles} from './memory-media.js';
import {accessibleMemorySpot} from './memory-access.js';
import {PLAN_SCALE} from './house-layout.js';
import {validateSoundtrack} from './memory-soundtrack.js';
import {planPoint,floorHeight} from './house-layout.js';
// These are approximate viewing positions, not photogrammetry measurements.
export const MEMORY_PLACEMENTS=[
 {id:'living-afternoon',title:'An afternoon in the living room',plan:[507,620],room:'living',view:'living',description:'Beside the orange sofas, looking across the coffee table.',confidence:'Approximate position; living room confirmed from the sofas and stair landing.'},
 {id:'dining-laughter',title:'Laughter at the dining table',plan:[493,846],room:'dining',view:'dining',description:'On the far side of the dining table, looking back toward the living room.',confidence:'Dining room confirmed from the table, pendants and orange sofas behind it.'},
 {id:'hallway-play',title:'A playful moment in the hallway',plan:[632,583],room:'passage',view:'cabinet_hall',description:'On the raised walkway beside the wine cellar, facing the green cabinets and bedroom passage.',confidence:'Walkway confirmed. The camera shifts during this clip; the trigger represents its main viewing area.'},
 {id:'dining-photo',title:'A birthday around the table',plan:[493,759],room:'dining',view:'dining',description:'At the living-room end of the dining table, looking toward the wall art and pendant lights.',confidence:'Dining room confirmed. Trigger is moved slightly to the clear side of the chairs for easy access.'},
];
export function nearMemories(memories,x,y,z,radius=1.25){return memories.filter(m=>Math.abs(m.position[1]-y)<.4&&Math.hypot(m.position[0]-x,m.position[2]-z)<radius);}
export function placedMemory(spec){const [x,z]=planPoint(...spec.plan);return {...spec,position:[x,floorHeight(x,z),z]};}
const db=()=>new Promise((resolve,reject)=>{const req=indexedDB.open('at-home-memories',2);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('memories'))req.result.createObjectStore('memories',{keyPath:'id'});if(!req.result.objectStoreNames.contains('metadata'))req.result.createObjectStore('metadata',{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
async function transact(mode,operation,store='memories'){const d=await db();try{return await new Promise((resolve,reject)=>{const t=d.transaction(store,mode),request=operation(t.objectStore(store));let value;request.onsuccess=()=>value=request.result;t.oncomplete=()=>resolve(value);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});}finally{d.close();}}
export async function loadMemories({cloud=true}={}){let shared=[];try{const r=await fetch(import.meta.env.DEV?'/memories/local-catalog.json':'/memories/catalog.json');if(r.ok)shared=await r.json();}catch{}
 let local=[];try{local=await transact('readonly',store=>store.getAll());}catch{}
 let overrides=[];try{overrides=await transact('readonly',s=>s.getAll(),'metadata');}catch{}
 let remote=[];if(cloud)try{const r=await fetch('/api/memories');if(r.ok){const data=await r.json();if(Array.isArray(data))remote=data;}}catch{}
 return [...shared.filter(m=>!local.some(l=>l.id===m.id)).map(m=>placedMemory({...MEMORY_PLACEMENTS.find(p=>p.id===m.id),...m})),...local.map(hydrateLocalMemory)].map(m=>({...m,...overrides.find(o=>o.id===m.id)})).filter(m=>!m.deleted).map(m=>m.soundtrackFile?{...m,soundtrack:{title:m.soundtrackFile.name.replace(/\.[^.]+$/,''),src:URL.createObjectURL(m.soundtrackFile)}}:m).concat(remote).map(m=>{try{return {...m,position:safePosition(m.position)};}catch{return m;}});
}
function safePosition(position){const spot=accessibleMemorySpot(position[0]*PLAN_SCALE+881,position[2]*PLAN_SCALE+789);if(!spot)throw Error('Choose an accessible location away from furniture.');return spot.position;}
function hydrateLocalMemory(m){const media=(m.files||[{id:'original',file:m.file,type:m.type}]).map(a=>({...a,src:a.file?URL.createObjectURL(a.file):a.src}));return {...m,local:true,media,src:media[0].src};}
export async function saveLocalMetadata(id,metadata){const prior=await transact('readonly',s=>s.get(id),'metadata');await transact('readwrite',s=>s.put({...prior,id,...metadata,...(metadata.position?{position:safePosition(metadata.position)}:{})}),'metadata');}
export async function saveLocalSoundtrack(id,file){if(file)validateSoundtrack(file);await saveLocalMetadata(id,{soundtrackFile:file,soundtrack:null});}
export async function addLocalMemory(fileOrFiles,placement,title){
 const files=validateMemoryFiles(Array.isArray(fileOrFiles)?fileOrFiles:[fileOrFiles]);
 const record={id:crypto.randomUUID(),title:title||files[0].name.replace(/\.[^.]+$/,''),type:files.some(f=>f.type.startsWith('video/'))?'video':'image',position:safePosition(placement.position),description:placement.description||'A moment saved here.',files:files.map(file=>({id:crypto.randomUUID(),type:file.type.startsWith('video/')?'video':'image',file}))};
 await transact('readwrite',s=>s.put(record));return hydrateLocalMemory(record);
}
export async function appendLocalPhotos(memory,photos){
 const current=memory.files|| (memory.file?[{id:'original',file:memory.file,type:memory.type}]:memoryMedia(memory));
 const files=validateMemoryFiles(photos,{photosOnly:true,existing:current.length});
 const record={id:memory.id,title:memory.title,date:memory.date,description:memory.description,position:safePosition(memory.position),view:memory.view,type:memory.type,files:[...current,...files.map(file=>({id:crypto.randomUUID(),type:'image',file}))]};
 await transact('readwrite',s=>s.put(record));
}
export async function replaceLocalPhotos(memory,replacements){
 const d=await db();try{await new Promise((resolve,reject)=>{
  const t=d.transaction('memories','readwrite'),store=t.objectStore('memories'),request=store.get(memory.id);
  request.onsuccess=()=>{try{
   const record=request.result||{id:memory.id,title:memory.title,date:memory.date,description:memory.description,position:memory.position,view:memory.view,type:memory.type,files:memoryMedia(memory)};
   const files=record.files||(record.file?[{id:'original',type:record.type,file:record.file}]:[]),map=new Map();
   for(const replacement of replacements){if(map.has(replacement.id)||!files.some(a=>a.id===replacement.id&&a.type==='image'))throw Error('This memory changed. Refresh before compressing again.');validateMemoryFiles([replacement.file],{photosOnly:true});if(replacement.file.size>1_000_000)throw Error('Compressed photos must be 1 MB or less');map.set(replacement.id,replacement.file);}
   const next={...record,files:files.map(a=>map.has(a.id)?{id:a.id,type:'image',file:map.get(a.id)}:a)};delete next.file;store.put(next);
  }catch(error){reject(error);t.abort();}};
  t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('Photo compression could not be saved.'));
 });}finally{d.close();}
}
export async function removeLocalMemory(memory){
 const d=await db();try{await new Promise((resolve,reject)=>{
  const t=d.transaction(['memories','metadata'],'readwrite');t.objectStore('memories').delete(memory.id);
  if(memory.local&&!MEMORY_PLACEMENTS.some(m=>m.id===memory.id))t.objectStore('metadata').delete(memory.id);
  else t.objectStore('metadata').put({id:memory.id,deleted:true}); // Hide a bundled/local test copy in this browser.
  t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);
 });}finally{d.close();}
 releaseMemoryUrls(memory);
}
