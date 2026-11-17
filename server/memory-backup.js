// A second copy of the whole private store in a separate Blob store. Files are
// only ever added or refreshed there, never removed, so a memory deleted (or a
// store emptied) by mistake still exists in the copy.
export const BACKUP_STATUS='backup-status.json';
const mutable=path=>path.endsWith('.json');
async function listAll(storage,options){
 const blobs=[];let cursor;
 do{const page=await storage.list({...options,limit:1000,cursor});blobs.push(...page.blobs);cursor=page.hasMore?page.cursor:undefined;}while(cursor);
 return blobs;
}
export async function runBackup({source,target,sourceOptions,targetOptions,now=Date.now,budgetMs=240000}){
 const started=now(),have=new Map((await listAll(target,targetOptions)).map(b=>[b.pathname,b]));
 // Thumbnails and the catalog index are rebuilt on demand, so they are not copied.
 const wanted=(await listAll(source,sourceOptions)).filter(b=>!b.pathname.startsWith('thumbs/')&&b.pathname!=='records/_index.json');
 const pending=wanted.filter(b=>{const copy=have.get(b.pathname);return !copy||copy.size!==b.size||mutable(b.pathname)&&new Date(b.uploadedAt)>new Date(copy.uploadedAt);});
 // Small files first, so the stories and photos are safe before a long video starts.
 pending.sort((a,b)=>a.size-b.size);
 let copied=0,bytes=0,failed=0;
 for(const blob of pending){
  if(now()-started>budgetMs)break;
  try{
   const found=await source.get(blob.pathname,{...sourceOptions,useCache:false});if(!found?.stream)throw Error('missing');
   await target.put(blob.pathname,found.stream,{...targetOptions,contentType:found.blob?.contentType||'application/octet-stream',addRandomSuffix:false,allowOverwrite:true,multipart:blob.size>8*1024*1024});
   copied++;bytes+=blob.size;
  }catch{failed++;}
 }
 const status={finishedAt:new Date(now()).toISOString(),files:wanted.length,totalBytes:wanted.reduce((n,b)=>n+b.size,0),copied,copiedBytes:bytes,remaining:pending.length-copied,failed};
 await target.put(BACKUP_STATUS,JSON.stringify(status),{...targetOptions,contentType:'application/json',addRandomSuffix:false,allowOverwrite:true,cacheControlMaxAge:0}).catch(()=>{});
 return status;
}
export async function backupStatus({target,targetOptions}){
 try{const found=await target.get(BACKUP_STATUS,{...targetOptions,useCache:false});return found?.stream?await new Response(found.stream).json():null;}catch{return null;}
}
