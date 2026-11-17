import {cleanMemoryMetadata} from '../src/memory-metadata.js';
import {cleanMemoryPet} from '../src/pet-memories.js';
import {HOUSE_ROOMS,pointInPolygon,PLAN_SCALE} from '../src/house-layout.js';
import {accessibleMemorySpot} from '../src/memory-access.js';
import {MAX_MEMORY_ITEMS} from '../src/memory-media.js';
import {audioContentType,AUDIO_FORMATS} from '../src/audio-formats.js';
import {validFileSize} from '../src/memory-storage.js';
export {MAX_SOUNDTRACK_SIZE} from '../src/memory-soundtrack.js';
export const SOUNDTRACK_CONTENT_TYPES=[...new Set(Object.values(AUDIO_FORMATS))];
export const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const MEDIA_PATH=/^media\/([a-f0-9-]{36})\/(image\.(jpg|png|webp)|video\.(mp4|webm|mov)|[a-f0-9-]{36}\.(jpg|png|webp|mp4|webm|mov))$/;
export const CONTENT_TYPES=['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'];
export const MAX_SIZE=250*1024*1024;
export function validMediaPath(path){const m=typeof path==='string'&&path.match(MEDIA_PATH);return !!m&&UUID.test(m[1]);}
export const recordMediaPaths=r=>r?.mediaPaths?.length?r.mediaPaths:r?.mediaPath?[r.mediaPath]:[];
export const validSoundtrackPath=path=>typeof path==='string'&&!!audioContentType(path)&&/^soundtracks\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.[a-z0-9]+$/.test(path)&&UUID.test(path.split('/')[1])&&UUID.test(path.split('/')[2].split('.')[0]);
import {ORIGINAL_TYPES,MAX_ORIGINAL_SIZE} from '../src/memory-originals.js';
export {ORIGINAL_TYPES,MAX_ORIGINAL_SIZE};
export const ORIGINAL_CONTENT_TYPES=[...new Set(Object.values(ORIGINAL_TYPES))];
export const MAX_HISTORY=20;
export const DELETED_RETENTION_MS=30*24*3600000;
// Untouched originals are kept beside the prepared copies for download and
// backup. They are never part of the slideshow and never served to the game.
export const validOriginalPath=path=>{const m=typeof path==='string'&&path.match(/^originals\/([a-f0-9-]{36})\/([a-f0-9-]{36})\.([a-z0-9]+)$/);return !!m&&UUID.test(m[1])&&UUID.test(m[2])&&Object.hasOwn(ORIGINAL_TYPES,m[3]);};
const assetName=path=>path.split('/').at(-1);
export const recordLivePaths=r=>Object.values(r?.livePhotos||{});
export const recordOriginalPaths=r=>Object.values(r?.originals||{}).map(o=>o.path);
// Everything a signed-in or published viewer may play: slides, Live Photo motion and the soundtrack.
export const recordAssetPaths=r=>[...recordMediaPaths(r),...recordLivePaths(r),...(r?.soundtrackPath?[r.soundtrackPath]:[])];
// Every file the memory owns in the store, for deletion and backup.
export const recordStoredPaths=r=>[...recordAssetPaths(r),...recordOriginalPaths(r)];
const mediaType=path=>/\.(mp4|webm|mov)$/.test(path)?'video':'image';
const story=r=>({title:r.title||'',date:r.date||'',description:r.description||'',position:r.position,petId:r.petId||null});
const sameStory=(a,b)=>a.title===b.title&&a.date===b.date&&a.description===b.description&&a.petId===b.petId&&Array.isArray(a.position)&&a.position.every((v,i)=>Math.abs(v-b.position[i])<.02);
export function validateRecord(input,existing){
 if(!UUID.test(input.id||''))throw Error('Invalid memory ID');
 const metadata={...cleanMemoryMetadata(input),petId:cleanMemoryPet(input.petId===undefined?existing?.petId:input.petId)};
 if(!Array.isArray(input.position)||input.position.length!==3||!input.position.every(Number.isFinite))throw Error('Choose a location in the house');
 const [x,,z]=input.position;
 if(!HOUSE_ROOMS.some(r=>r.walkable!==false&&pointInPolygon(x,z,r.polygon)))throw Error('Choose a location inside the house');
 const spot=accessibleMemorySpot(x*PLAN_SCALE+881,z*PLAN_SCALE+789);
 if(!spot)throw Error('Choose an accessible location away from furniture');
 if(input.addMediaPaths!==undefined&&!Array.isArray(input.addMediaPaths))throw Error('Invalid photo list');
 let originals=recordMediaPaths(existing||{mediaPath:input.mediaPath});
 const replacements=new Map();
 if(input.replacePhotos!==undefined){
  if(!existing||!Array.isArray(input.replacePhotos)||input.replacePhotos.length>MAX_MEMORY_ITEMS)throw Error('Invalid photo replacements');
  for(const entry of input.replacePhotos){
   const old=originals.find(path=>path.split('/').at(-1)===entry?.id),path=entry?.path;
   if(!old||mediaType(old)!=='image'||replacements.has(old)||!validMediaPath(path)||path.split('/')[1]!==input.id||mediaType(path)!=='image'||originals.includes(path)||[...replacements.values()].includes(path))throw Error('Replace only photos belonging to this memory');
   replacements.set(old,path);
  }
  originals=originals.map(path=>replacements.get(path)||path);
 }
 const mediaPaths=[...new Set([...originals,...(input.addMediaPaths||[])])];
 if(!mediaPaths.length||mediaPaths.length>MAX_MEMORY_ITEMS||mediaPaths.some(p=>!validMediaPath(p)||p.split('/')[1]!==input.id))throw Error('Upload media for this memory first (up to 30 items)');
 const soundtrackPath=input.soundtrackPath===undefined?existing?.soundtrackPath||null:input.soundtrackPath;
 if(soundtrackPath!==null&&(!validSoundtrackPath(soundtrackPath)||soundtrackPath.split('/')[1]!==input.id))throw Error('Upload a soundtrack for this memory first');
 if(soundtrackPath&&mediaPaths.some(p=>p.split('/').at(-1)===soundtrackPath.split('/').at(-1)))throw Error('Use a distinct soundtrack file');
 const soundtrackTitle=soundtrackPath?String(input.soundtrackTitle??existing?.soundtrackTitle??'Memory soundtrack').trim().slice(0,100):'';
 // Originals and Live Photo motion are keyed by the slide they belong to. A
 // recompressed photo keeps both under its new file name.
 const names=new Set(mediaPaths.map(assetName)),renamed=new Map([...replacements].map(([old,path])=>[assetName(old),assetName(path)]));
 const carry=map=>Object.fromEntries(Object.entries(map||{}).map(([asset,value])=>[renamed.get(asset)||asset,value]).filter(([asset])=>names.has(asset)));
 const keptOriginals=carry(existing?.originals),livePhotos=carry(existing?.livePhotos);
 if(input.addOriginals!==undefined){
  if(!Array.isArray(input.addOriginals)||input.addOriginals.length>MAX_MEMORY_ITEMS)throw Error('Invalid original files');
  for(const entry of input.addOriginals){
   const path=entry?.path;
   if(!names.has(entry?.asset)||keptOriginals[entry.asset]||!validOriginalPath(path)||path.split('/')[1]!==input.id||Object.values(keptOriginals).some(o=>o.path===path))throw Error('Originals must belong to a photo or video in this memory');
   keptOriginals[entry.asset]={path,name:String(entry.name||'').replace(/[\\/\u0000-\u001f"]/g,' ').trim().slice(0,120)||assetName(path)};
  }
 }
 if(input.addLivePhotos!==undefined){
  if(!Array.isArray(input.addLivePhotos)||input.addLivePhotos.length>MAX_MEMORY_ITEMS)throw Error('Invalid Live Photo list');
  for(const entry of input.addLivePhotos){
   const path=entry?.path,asset=entry?.asset;
   if(!names.has(asset)||mediaType(asset)!=='image'||livePhotos[asset]||!validMediaPath(path)||path.split('/')[1]!==input.id||mediaType(path)!=='video'||mediaPaths.includes(path)||Object.values(livePhotos).includes(path))throw Error('Live Photo motion must belong to a photo in this memory');
   livePhotos[asset]=path;
  }
 }
 const record={id:input.id,...metadata,position:spot.position,mediaPath:mediaPaths[0],mediaPaths,soundtrackPath,soundtrackTitle,type:mediaPaths.some(p=>mediaType(p)==='video')?'video':'image',published:input.published===true,updatedAt:new Date().toISOString(),createdAt:existing?.createdAt||new Date().toISOString()};
 if(Object.keys(keptOriginals).length)record.originals=keptOriginals;
 if(Object.keys(livePhotos).length)record.livePhotos=livePhotos;
 // Keep the earlier story whenever the words, date or place change, so an edit can be undone.
 const history=existing?(sameStory(story(existing),story(record))?existing.history||[]:[{at:existing.updatedAt||record.updatedAt,...story(existing)},...(existing.history||[])].slice(0,MAX_HISTORY)):[];
 if(history.length)record.history=history;
 return record;
}
export function publicRecord(r,{admin=false}={}){
 const {mediaPath,mediaPaths,soundtrackPath,soundtrackTitle,assetSizes,originals,livePhotos,history,deletedAt,...safe}=r;
 const size=path=>validFileSize(assetSizes?.[path])?assetSizes[path]:null;
 const url=(path,action='media')=>`/api/memories?action=${action}&id=${encodeURIComponent(r.id)}&asset=${encodeURIComponent(assetName(path))}`;
 const media=recordMediaPaths(r).map(path=>{
  const name=assetName(path),live=livePhotos?.[name],original=admin&&originals?.[name];
  return {id:name,type:mediaType(path),src:url(path),thumb:mediaType(path)==='image'?url(path,'thumb'):null,size:size(path),...(live?{live:url(live)}:{}),...(original?{original:{name:original.name,size:validFileSize(original.size)?original.size:null,src:url(path,'original')}}:{})};
 });
 return {...safe,media,soundtrack:soundtrackPath?{src:url(soundtrackPath),title:soundtrackTitle,size:size(soundtrackPath)}:null,cloud:true,src:media[0]?.src,...(admin?{history:history||[],...(deletedAt?{deletedAt}:{})}:{})};
}
