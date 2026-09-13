import {cleanMemoryMetadata} from '../src/memory-metadata.js';
import {cleanMemoryPet} from '../src/pet-memories.js';
import {HOUSE_ROOMS,pointInPolygon,PLAN_SCALE} from '../src/house-layout.js';
import {accessibleMemorySpot} from '../src/memory-access.js';
import {MAX_MEMORY_ITEMS} from '../src/memory-media.js';
import {audioContentType,AUDIO_FORMATS} from '../src/audio-formats.js';
export {MAX_SOUNDTRACK_SIZE} from '../src/memory-soundtrack.js';
export const SOUNDTRACK_CONTENT_TYPES=[...new Set(Object.values(AUDIO_FORMATS))];
export const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const MEDIA_PATH=/^media\/([a-f0-9-]{36})\/(image\.(jpg|png|webp)|video\.(mp4|webm|mov)|[a-f0-9-]{36}\.(jpg|png|webp|mp4|webm|mov))$/;
export const CONTENT_TYPES=['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'];
export const MAX_SIZE=250*1024*1024;
export function validMediaPath(path){const m=typeof path==='string'&&path.match(MEDIA_PATH);return !!m&&UUID.test(m[1]);}
export const recordMediaPaths=r=>r?.mediaPaths?.length?r.mediaPaths:r?.mediaPath?[r.mediaPath]:[];
export const validSoundtrackPath=path=>typeof path==='string'&&!!audioContentType(path)&&/^soundtracks\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.[a-z0-9]+$/.test(path)&&UUID.test(path.split('/')[1])&&UUID.test(path.split('/')[2].split('.')[0]);
export const recordAssetPaths=r=>[...recordMediaPaths(r),...(r?.soundtrackPath?[r.soundtrackPath]:[])];
const mediaType=path=>/\.(mp4|webm|mov)$/.test(path)?'video':'image';
export function validateRecord(input,existing){
 if(!UUID.test(input.id||''))throw Error('Invalid memory ID');
 const metadata={...cleanMemoryMetadata(input),petId:cleanMemoryPet(input.petId===undefined?existing?.petId:input.petId)};
 if(!Array.isArray(input.position)||input.position.length!==3||!input.position.every(Number.isFinite))throw Error('Choose a location in the house');
 const [x,,z]=input.position;
 if(!HOUSE_ROOMS.some(r=>r.walkable!==false&&pointInPolygon(x,z,r.polygon)))throw Error('Choose a location inside the house');
 const spot=accessibleMemorySpot(x*PLAN_SCALE+881,z*PLAN_SCALE+789);
 if(!spot)throw Error('Choose an accessible location away from furniture');
 if(input.addMediaPaths!==undefined&&!Array.isArray(input.addMediaPaths))throw Error('Invalid photo list');
 const mediaPaths=[...new Set([...recordMediaPaths(existing||{mediaPath:input.mediaPath}),...(input.addMediaPaths||[])])];
 if(!mediaPaths.length||mediaPaths.length>MAX_MEMORY_ITEMS||mediaPaths.some(p=>!validMediaPath(p)||p.split('/')[1]!==input.id))throw Error('Upload media for this memory first (up to 30 items)');
 const soundtrackPath=input.soundtrackPath===undefined?existing?.soundtrackPath||null:input.soundtrackPath;
 if(soundtrackPath!==null&&(!validSoundtrackPath(soundtrackPath)||soundtrackPath.split('/')[1]!==input.id))throw Error('Upload a soundtrack for this memory first');
 if(soundtrackPath&&mediaPaths.some(p=>p.split('/').at(-1)===soundtrackPath.split('/').at(-1)))throw Error('Use a distinct soundtrack file');
 const soundtrackTitle=soundtrackPath?String(input.soundtrackTitle??existing?.soundtrackTitle??'Memory soundtrack').trim().slice(0,100):'';
 return {id:input.id,...metadata,position:spot.position,mediaPath:mediaPaths[0],mediaPaths,soundtrackPath,soundtrackTitle,type:mediaPaths.some(p=>mediaType(p)==='video')?'video':'image',published:input.published===true,updatedAt:new Date().toISOString(),createdAt:existing?.createdAt||new Date().toISOString()};
}
export function publicRecord(r){const {mediaPath,mediaPaths,soundtrackPath,soundtrackTitle,...safe}=r;const url=path=>`/api/memories?action=media&id=${encodeURIComponent(r.id)}&asset=${encodeURIComponent(path.split('/').at(-1))}`;const media=recordMediaPaths(r).map(path=>({id:path.split('/').at(-1),type:mediaType(path),src:url(path)}));return {...safe,media,soundtrack:soundtrackPath?{src:url(soundtrackPath),title:soundtrackTitle}:null,cloud:true,src:media[0]?.src};}
