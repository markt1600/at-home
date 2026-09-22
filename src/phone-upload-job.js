import {cleanMemoryMetadata} from './memory-metadata.js';
import {validateMemoryFiles} from './memory-media.js';
import {validateSoundtrack} from './memory-soundtrack.js';
import {audioExtension,audioContentType} from './audio-formats.js';

export function createPhoneUploadJob(id=crypto.randomUUID()){return {id,uploaded:new Map()};}
const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'};
export function matchesSavedUpload(record,payload,originalIds=[]){
 const expected=[...originalIds,...payload.addMediaPaths.map(p=>p.split('/').at(-1))].sort();
 return record?.id===payload.id&&['title','date','description','published','petId'].every(k=>(record[k]??'')===(payload[k]??''))
  &&Array.isArray(record.position)&&record.position.length===3&&record.position.every((v,i)=>Number.isFinite(v)&&Math.abs(v-payload.position[i])<.03)
  &&JSON.stringify((record.media||[]).map(a=>a.id).sort())===JSON.stringify(expected)
  &&(payload.soundtrackPath===undefined||record.soundtrack?.src?.includes(encodeURIComponent(payload.soundtrackPath.split('/').at(-1))));
}
export async function uploadPhoneMemory({job,rows,metadata,position,existing,soundtrack,published=false,signal,onProgress=()=>{},upload,save,findSaved}){
 const meta=cleanMemoryMetadata(metadata);
 validateMemoryFiles(rows.map(r=>r.file),{existing:existing?.media?.length||0});
 if(rows.some(r=>r.file.type.startsWith('image/')&&r.file.size>1_000_000))throw Error('Prepare all photos to 1 MB or less before uploading.');
 if(soundtrack)validateSoundtrack(soundtrack);
 if(!Array.isArray(position)||position.length!==3||!position.every(Number.isFinite))throw Error('Choose a place in the house.');
 if(existing&&job.id!==existing.id)throw Error('The selected memory changed. Please retry.');
 const assets=rows.map(r=>({key:r.id,file:r.file,prefix:'media',extension:extensions[r.file.type],contentType:r.file.type}));
 if(soundtrack)assets.push({key:soundtrack,file:soundtrack,prefix:'soundtracks',extension:audioExtension(soundtrack.name),contentType:audioContentType(soundtrack.name)});
 const paths=[];
 for(let i=0;i<assets.length;i++){
  signal?.throwIfAborted();const a=assets[i];if(!a.extension)throw Error('Prepare this file before uploading.');
  let path=job.uploaded.get(a.key);
  if(!path){
   path=`${a.prefix}/${job.id}/${crypto.randomUUID()}.${a.extension}`;
   await upload(path,a.file,{access:'private',handleUploadUrl:'/api/memory-upload',multipart:true,contentType:a.contentType,abortSignal:signal,
    onUploadProgress:({percentage})=>onProgress({index:i,percentage:(i+percentage/100)/assets.length*100,text:`Uploading ${i+1} of ${assets.length}: ${a.file.name}`})});
   job.uploaded.set(a.key,path);
  }
  paths.push(path);onProgress({index:i,percentage:(i+1)/assets.length*100,text:`Uploaded ${i+1} of ${assets.length}`});
 }
 signal?.throwIfAborted();
 const payload={id:job.id,...meta,position,petId:existing?.petId||null,published,addMediaPaths:paths.slice(0,rows.length),...(existing?{etag:existing.etag}:{}),
  ...(soundtrack?{soundtrackPath:paths.at(-1),soundtrackTitle:soundtrack.name.replace(/\.[^.]+$/,'').slice(0,100)}:{})};
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
