import {UUID} from './memory-record.js';
export const CATALOG_INDEX='records/_index.json';

// Every memory is its own small record file, which stays the source of truth.
// Reading hundreds of them one by one made each game load slow, so a single
// index file holds a copy of them all. It is checked against the store's
// listing (which carries each record's ETag) on every load: unchanged records
// come from the index, changed or new ones are read once, and the index is
// rewritten. Nothing depends on a save remembering to update it.
export async function loadCatalog({storage,options,read}){
 const listed=new Map();let cursor;
 do{
  const page=await storage.list({...options,prefix:'records/',limit:1000,cursor});
  for(const blob of page.blobs){const id=blob.pathname.slice(8,-5);if(blob.pathname.endsWith('.json')&&UUID.test(id))listed.set(id,blob.etag);}
  cursor=page.hasMore?page.cursor:undefined;
 }while(cursor);
 let index={},indexEtag;
 try{
  const found=await storage.get(CATALOG_INDEX,{...options,useCache:false});
  if(found?.stream){const data=await new Response(found.stream).json();if(data&&typeof data.entries==='object'&&data.entries){index=data.entries;indexEtag=found.blob?.etag;}}
 }catch{/* A missing or damaged index is rebuilt below. */}
 const same=(a,b)=>!!a&&!!b&&String(a).replace(/^W\/|"/g,'')===String(b).replace(/^W\/|"/g,'');
 const entries=new Map(),stale=[];
 for(const [id,etag] of listed){const known=index[id];if(same(etag,known?.etag)&&known.record?.id===id)entries.set(id,known);else stale.push(id);}
 for(let i=0;i<stale.length;i+=8){
  const group=await Promise.all(stale.slice(i,i+8).map(id=>read(id)));
  group.forEach((entry,n)=>{if(entry)entries.set(stale[i+n],{etag:entry.etag,record:entry.record});});
 }
 const changed=stale.length||Object.keys(index).some(id=>!listed.has(id));
 if(changed)try{
  await storage.put(CATALOG_INDEX,JSON.stringify({entries:Object.fromEntries(entries)}),{...options,contentType:'application/json',addRandomSuffix:false,allowOverwrite:true,cacheControlMaxAge:0,...(indexEtag?{ifMatch:indexEtag}:{})});
 }catch{/* Another request wrote it first; theirs is as good as ours. */}
 return [...listed.keys()].filter(id=>entries.has(id)).map(id=>entries.get(id));
}
