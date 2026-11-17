// The phone uploader's selection, kept in the browser's own storage so that a
// closed tab, a reload or a phone that put the page to sleep does not lose it.
// Prepared files and the list of finished uploads are stored too, so resuming
// neither converts nor uploads anything twice. Everything here is best effort:
// if the browser refuses the storage, the uploader simply works as before.
const open=()=>new Promise((resolve,reject)=>{
 const request=indexedDB.open('at-home-upload-queue',1);
 request.onupgradeneeded=()=>{request.result.createObjectStore('rows',{keyPath:'id'});request.result.createObjectStore('state',{keyPath:'key'});};
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});
async function run(mode,work){
 const db=await open();
 try{return await new Promise((resolve,reject)=>{const t=db.transaction(['rows','state'],mode);let value;const set=v=>{value=v;};work(t.objectStore('rows'),t.objectStore('state'),set);t.oncomplete=()=>resolve(value);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});}
 finally{db.close();}
}
const quietly=async task=>{try{await task();return true;}catch{return false;}};
export const storeQueueRow=(row,order)=>quietly(()=>run('readwrite',rows=>rows.put({id:row.id,order,original:row.original,file:row.file||null,note:row.note||'',liveFor:row.liveFor||null})));
export const removeQueueRow=id=>quietly(()=>run('readwrite',rows=>rows.delete(id)));
export const storeQueueState=state=>quietly(()=>run('readwrite',(rows,states)=>states.put({key:'job',...state})));
export const clearQueue=()=>quietly(()=>run('readwrite',(rows,states)=>{rows.clear();states.clear();}));
export async function loadQueue(){
 try{
  const result=await run('readonly',(rows,states,set)=>{const found={};rows.getAll().onsuccess=e=>{found.rows=e.target.result;set(found);};states.get('job').onsuccess=e=>{found.state=e.target.result||null;set(found);};});
  const rows=(result?.rows||[]).filter(r=>r.original instanceof Blob&&r.original.size).sort((a,b)=>a.order-b.order);
  return {rows,state:result?.state||null};
 }catch{return {rows:[],state:null};}
}
