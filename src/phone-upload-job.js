import {cleanMemoryMetadata} from './memory-metadata.js';
import {validateMemoryFiles} from './memory-media.js';
import {validateSoundtrack} from './memory-soundtrack.js';
import {audioExtension,audioContentType} from './audio-formats.js';
import {keepableOriginal,originalUpload} from './memory-originals.js';

export function createPhoneUploadJob(id=crypto.randomUUID()){return {id,uploaded:new Map()};}
const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'};
export function matchesSavedUpload(record,payload,originalIds=[]){
 const expected=[...originalIds,...payload.addMediaPaths.map(p=>p.split('/').at(-1))].sort();
 return record?.id===payload.id&&['title','date','description','published','petId'].every(k=>(record[k]??'')===(payload[k]??''))
  &&Array.isArray(record.position)&&record.position.length===3&&record.position.every((v,i)=>Number.isFinite(v)&&Math.abs(v-payload.position[i])<.03)
  &&JSON.stringify((record.media||[]).map(a=>a.id).sort())===JSON.stringify(expected)
  &&(payload.soundtrackPath===undefined||record.soundtrack?.src?.includes(encodeURIComponent(payload.soundtrackPath.split('/').at(-1))));
}
const soundtrackKey=file=>`soundtrack:${file.name}:${file.size}:${file.lastModified}`;
export async function uploadPhoneMemory({job,rows,metadata,position,existing,soundtrack,published=false,keepOriginals=false,signal,onProgress=()=>{},onUploaded=()=>{},upload,save,findSaved}){
 const meta=cleanMemoryMetadata(metadata);
 // A Live Photo's motion clip travels with its photo instead of being a slide.
 const slides=rows.filter(r=>!r.liveFor),motion=rows.filter(r=>r.liveFor&&slides.some(s=>s.id===r.liveFor&&s.file.type.startsWith('image/')));
 validateMemoryFiles(slides.map(r=>r.file),{existing:existing?.media?.length||0});
 if(rows.some(r=>r.file.type.startsWith('image/')&&r.file.size>1_000_000))throw Error('Prepare all photos to 1 MB or less before uploading.');
 if(soundtrack)validateSoundtrack(soundtrack);
 if(!Array.isArray(position)||position.length!==3||!position.every(Number.isFinite))throw Error('Choose a place in the house.');
 if(existing&&job.id!==existing.id)throw Error('The selected memory changed. Please retry.');
 const media=r=>({key:r.id,row:r.id,file:r.file,extension:extensions[r.file.type],contentType:r.file.type});
 const assets=[...slides.map(r=>({...media(r),role:'slide'})),...motion.map(r=>({...media(r),role:'live',photo:r.liveFor}))];
 if(soundtrack)assets.push({key:soundtrackKey(soundtrack),role:'soundtrack',file:soundtrack,extension:audioExtension(soundtrack.name),contentType:audioContentType(soundtrack.name)});
 // Originals go last: the memory's own files are safe before the largest uploads begin.
 if(keepOriginals)for(const r of slides)if(keepableOriginal(r.original,r.file))assets.push({key:r.id+':original',row:r.id,role:'original',file:r.original,...originalUpload(r.original,job.id)});
 const done=new Map();
 for(let i=0;i<assets.length;i++){
  signal?.throwIfAborted();const a=assets[i];if(!a.extension&&a.role!=='original')throw Error('Prepare this file before uploading.');
  let path=job.uploaded.get(a.key);
  if(!path){
   path=a.role==='original'?a.path:`${a.role==='soundtrack'?'soundtracks':'media'}/${job.id}/${crypto.randomUUID()}.${a.extension}`;
   await upload(path,a.file,{access:'private',handleUploadUrl:'/api/memory-upload',multipart:true,contentType:a.contentType,abortSignal:signal,
    onUploadProgress:({percentage})=>onProgress({index:i,percentage:(i+percentage/100)/assets.length*100,text:`${a.role==='original'?'Keeping the original':'Uploading'} ${i+1} of ${assets.length}: ${a.file.name}`})});
   job.uploaded.set(a.key,path);await onUploaded();
  }
  done.set(a,path);onProgress({index:i,percentage:(i+1)/assets.length*100,text:`Uploaded ${i+1} of ${assets.length}`});
 }
 signal?.throwIfAborted();
 const pathOf=(role,row)=>[...done].find(([a])=>a.role===role&&a.row===row)?.[1],name=path=>path.split('/').at(-1),of=role=>[...done].filter(([a])=>a.role===role);
 const addOriginals=of('original').map(([a,path])=>({asset:name(pathOf('slide',a.row)),path,name:a.file.name})),addLivePhotos=of('live').map(([a,path])=>({asset:name(pathOf('slide',a.photo)),path})),audio=of('soundtrack')[0]?.[1];
 const payload={id:job.id,...meta,position,petId:existing?.petId||null,published,addMediaPaths:of('slide').map(([,path])=>path),...(existing?{etag:existing.etag}:{}),
  ...(addOriginals.length?{addOriginals}:{}),...(addLivePhotos.length?{addLivePhotos}:{}),
  ...(audio?{soundtrackPath:audio,soundtrackTitle:soundtrack.name.replace(/\.[^.]+$/,'').slice(0,100)}:{})};
 onProgress({percentage:100,text:'Saving the memory…'});
 try{return await save(payload);}
 catch(error){
  // A phone may lose the response after the server commits. Recover that exact
  // record instead of creating a duplicate or appending its files twice.
  const recovered=await findSaved?.(job.id).catch(()=>null);
  if(recovered&&matchesSavedUpload(recovered,payload,(existing?.media||[]).map(a=>a.id)))return recovered;
  throw error;
 }
}
