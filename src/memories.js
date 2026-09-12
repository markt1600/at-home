import {planPoint,floorHeight} from './house-layout.js';
// These are approximate viewing positions, not photogrammetry measurements.
export const MEMORY_PLACEMENTS=[
 {id:'living-afternoon',title:'An afternoon in the living room',plan:[493,620],room:'living',view:'living',description:'Beside the orange sofas, looking across the coffee table.',confidence:'Approximate position; living room confirmed from the sofas and stair landing.'},
 {id:'dining-laughter',title:'Laughter at the dining table',plan:[493,846],room:'dining',view:'dining',description:'On the far side of the dining table, looking back toward the living room.',confidence:'Dining room confirmed from the table, pendants and orange sofas behind it.'},
 {id:'hallway-play',title:'A playful moment in the hallway',plan:[632,583],room:'passage',view:'cabinet_hall',description:'On the raised walkway beside the wine cellar, facing the green cabinets and bedroom passage.',confidence:'Walkway confirmed. The camera shifts during this clip; the trigger represents its main viewing area.'},
 {id:'dining-photo',title:'A birthday around the table',plan:[493,759],room:'dining',view:'dining',description:'At the living-room end of the dining table, looking toward the wall art and pendant lights.',confidence:'Dining room confirmed. Trigger is moved slightly to the clear side of the chairs for easy access.'},
];
export function nearMemories(memories,x,y,z,radius=1.25){return memories.filter(m=>Math.abs(m.position[1]-y)<.4&&Math.hypot(m.position[0]-x,m.position[2]-z)<radius);}
export function placedMemory(spec){const [x,z]=planPoint(...spec.plan);return {...spec,position:[x,floorHeight(x,z),z]};}
const db=()=>new Promise((resolve,reject)=>{const req=indexedDB.open('at-home-memories',1);req.onupgradeneeded=()=>req.result.createObjectStore('memories',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
async function transact(mode,operation){const d=await db();try{return await new Promise((resolve,reject)=>{const t=d.transaction('memories',mode),request=operation(t.objectStore('memories'));let value;request.onsuccess=()=>value=request.result;t.oncomplete=()=>resolve(value);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});}finally{d.close();}}
export async function loadMemories(){let shared=[];try{const r=await fetch(import.meta.env.DEV?'/memories/local-catalog.json':'/memories/catalog.json');if(r.ok)shared=await r.json();}catch{}
 let local=[];try{local=await transact('readonly',store=>store.getAll());}catch{}
 return [...shared.map(m=>placedMemory({...MEMORY_PLACEMENTS.find(p=>p.id===m.id),...m})),...local.map(m=>({...m,local:true,src:URL.createObjectURL(m.file)}))];
}
export async function addLocalMemory(file,placement,title){if(!/^(image\/(jpeg|png|webp)|video\/(mp4|webm|quicktime))$/.test(file.type))throw new Error('Choose a JPG, PNG, WebP, MP4, MOV or WebM file.');if(file.size>250*1024*1024)throw new Error('Please choose a file smaller than 250 MB.');
 const record={id:crypto.randomUUID(),title:title||file.name.replace(/\.[^.]+$/,''),type:file.type.startsWith('video/')?'video':'image',position:[...placement.position],description:placement.description||'A moment saved here.',file};await transact('readwrite',s=>s.put(record));return {...record,local:true,src:URL.createObjectURL(file)};
}
export async function removeLocalMemory(memory){await transact('readwrite',s=>s.delete(memory.id));URL.revokeObjectURL(memory.src);}
