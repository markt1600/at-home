import {recordAssetPaths} from './memory-record.js';
import {validFileSize} from '../src/memory-storage.js';

// Legacy records lack sizes. Blob's listings contain byte counts, so the editor
// can resolve a whole library without downloading media or issuing HEAD per file.
export async function resolveStoredSizes(records,storage,options){
 const missing=new Set(records.flatMap(r=>recordAssetPaths(r).filter(path=>!validFileSize(r.assetSizes?.[path]))));
 if(!missing.size)return records;
 const found=new Map();
 for(const prefix of ['media/','soundtracks/']){
  const wanted=new Set([...missing].filter(path=>path.startsWith(prefix)));if(!wanted.size)continue;
  try{
   let cursor;
   do{
    const page=await storage.list({...options,prefix,limit:1000,cursor});
    for(const blob of page.blobs)if(wanted.has(blob.pathname)&&validFileSize(blob.size)){found.set(blob.pathname,blob.size);wanted.delete(blob.pathname);}
    cursor=page.hasMore?page.cursor:undefined;
   }while(cursor&&wanted.size);
  }catch{/* Preserve the library and report unknown sizes instead of zero. */}
 }
 return records.map(r=>({...r,assetSizes:{...r.assetSizes,...Object.fromEntries(recordAssetPaths(r).filter(path=>found.has(path)).map(path=>[path,found.get(path)]))}}));
}
