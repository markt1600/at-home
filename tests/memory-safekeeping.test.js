import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createMemoryHandler} from '../api/memories.js';
import {createBackupHandler} from '../api/memory-backup.js';
import {createSession} from '../server/memory-auth.js';
import {validateRecord,publicRecord,validOriginalPath,recordStoredPaths,recordAssetPaths,MAX_HISTORY} from '../server/memory-record.js';
import {loadCatalog,CATALOG_INDEX} from '../server/memory-catalog.js';
import {runBackup} from '../server/memory-backup.js';
import {exportPlan,exportLibrary,crc32} from '../src/memory-export.js';
import {keepableOriginal,originalUpload} from '../src/memory-originals.js';
import {planPoint} from '../src/house-layout.js';

const env={MEMORY_ADMIN_PASSWORD:'test-only-password',BLOB_READ_WRITE_TOKEN:'primary',VERCEL:'1'};
const id='381b4dbd-5e89-4cd7-9a61-5d0c339b0cf2',[x,z]=planPoint(507,620);
const photo=`media/${id}/c0779408-a4dc-4c40-92a7-6c9bc04af079.jpg`,second=`media/${id}/1b0b6b0e-0c53-4a0b-8d7e-0d4b0a4f5a11.jpg`,clip=`media/${id}/9d2f7c53-6a55-4f0e-9a3e-3a1c2b7d8e90.mp4`;
const original=`originals/${id}/5e0f2a7c-93b1-4c0a-8f16-7f2c1f0f6b3d.heic`;
const draft={id,title:'Penny’s first steps',description:'Across the living room',date:'2024-03-09',position:[x,0,z],addMediaPaths:[photo],published:false};

// A small in-memory Blob store with ETags, listings and conditional writes.
function fakeStore(){
 const blobs=new Map();let version=0;const calls={get:[],list:0,del:[]};
 return {blobs,calls,
  get:async path=>{calls.get.push(path);const b=blobs.get(path);return b?{stream:new Response(b.body).body,blob:{etag:b.etag,contentType:b.contentType},headers:new Headers({'content-length':String(Buffer.byteLength(b.body))})}:null;},
  list:async({prefix=''}={})=>{calls.list++;return {blobs:[...blobs].filter(([p])=>p.startsWith(prefix)).map(([pathname,b])=>({pathname,etag:b.etag,size:Buffer.byteLength(b.body),uploadedAt:b.uploadedAt})),hasMore:false};},
  head:async path=>{const b=blobs.get(path);return b?{size:Buffer.byteLength(b.body),contentType:b.contentType}:null;},
  put:async(path,body,options={})=>{const current=blobs.get(path);if(options.ifMatch&&current?.etag!==options.ifMatch)throw Error('precondition failed');if(current&&!options.allowOverwrite)throw Error('already exists');const text=typeof body==='string'?body:await new Response(body).text(),etag='v'+(++version);blobs.set(path,{body:text,etag,contentType:options.contentType,uploadedAt:new Date(version*1000)});return {etag};},
  del:async(path,options={})=>{calls.del.push(path);const current=blobs.get(path);if(current&&options.ifMatch&&current.etag!==options.ifMatch)throw Error('precondition failed');blobs.delete(path);}
 };
}
async function serve(t,handler){
 const server=createServer(async(req,res)=>{const chunks=[];for await(const c of req)chunks.push(c);if(chunks.length)req.body=Buffer.concat(chunks).toString();res.status=code=>{res.statusCode=code;return res;};res.json=data=>res.end(JSON.stringify(data));await handler(req,res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
 const origin=`http://127.0.0.1:${server.address().port}`;
 return (path,body,cookie,headers={})=>fetch(origin+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
}

test('originals and Live Photo motion attach only to this memory’s own slides',()=>{
 assert.ok(validOriginalPath(original));assert.ok(!validOriginalPath(`originals/${id}/notes.txt`));assert.ok(!validOriginalPath(`originals/${id}/../x.heic`));
 const record=validateRecord({...draft,addOriginals:[{asset:photo.split('/').at(-1),path:original,name:'IMG_0412.HEIC'}],addLivePhotos:[{asset:photo.split('/').at(-1),path:clip}]});
 assert.deepEqual(recordStoredPaths(record),[photo,clip,original]);assert.deepEqual(recordAssetPaths(record),[photo,clip],'originals are never playable assets');
 assert.equal(record.type,'image','a Live Photo is still a photo memory');
 assert.throws(()=>validateRecord({...draft,addOriginals:[{asset:'someone-else.jpg',path:original,name:'x'}]}),/belong/);
 assert.throws(()=>validateRecord({...draft,addOriginals:[{asset:photo.split('/').at(-1),path:original.replace(id,'54a700ea-d050-4819-afc5-a72774dbe851'),name:'x'}]}),/belong/);
 assert.throws(()=>validateRecord({...draft,addLivePhotos:[{asset:photo.split('/').at(-1),path:second}]}),/Live Photo/);
 const visitor=publicRecord(record),editor=publicRecord(record,{admin:true});
 assert.ok(!JSON.stringify(visitor).includes('original'),'visitors never learn an original exists');assert.ok(visitor.media[0].live.includes('action=media'));
 assert.equal(editor.media[0].original.name,'IMG_0412.HEIC');assert.ok(editor.media[0].original.src.includes('action=original'));
 // Recompressing a photo keeps its original and motion under the new file name.
 const smaller=`media/${id}/77777777-7777-4777-8777-777777777777.jpg`,replaced=validateRecord({...draft,addMediaPaths:[],replacePhotos:[{id:photo.split('/').at(-1),path:smaller}]},record);
 assert.deepEqual(recordStoredPaths(replaced),[smaller,clip,original]);
});

test('each change to a memory’s story keeps the earlier version, up to a limit',()=>{
 let record=validateRecord(draft);assert.ok(!record.history);
 const same=validateRecord({...draft,addMediaPaths:[second]},record);assert.ok(!same.history,'adding photos is not a story change');
 record=validateRecord({...draft,title:'First steps',addMediaPaths:[]},record);
 assert.equal(record.history.length,1);assert.equal(record.history[0].title,'Penny’s first steps');assert.equal(record.history[0].date,'2024-03-09');
 for(let i=0;i<MAX_HISTORY+5;i++)record=validateRecord({...draft,title:'Edit '+i,addMediaPaths:[]},record);
 assert.equal(record.history.length,MAX_HISTORY);assert.equal(record.history[0].title,'Edit '+(MAX_HISTORY+3));
 assert.ok(!('history' in publicRecord(record)));assert.equal(publicRecord(record,{admin:true}).history.length,MAX_HISTORY);
});

test('originals download for the editor only, and expired deletions are removed for good',async t=>{
 const storage=fakeStore();let clock=Date.parse('2026-01-01T00:00:00Z');
 const request=await serve(t,createMemoryHandler({storage,env,now:()=>clock})),cookie=()=>'at_home_editor='+createSession(env,clock);
 storage.blobs.set(photo,{body:'small',etag:'p',contentType:'image/jpeg'});storage.blobs.set(original,{body:'the-untouched-original',etag:'o',contentType:'image/heic'});
 const asset=photo.split('/').at(-1);
 const saved=await (await request('/api/memories',{...draft,published:true,addOriginals:[{asset,path:original,name:'IMG "0412".HEIC'}]},cookie())).json();
 assert.equal(saved.media[0].original.size,22,'the original’s size comes from storage');
 const visitor=(await (await request('/api/memories')).json())[0];assert.ok(!JSON.stringify(visitor).includes('original'));
 assert.equal((await request(`/api/memories?action=original&id=${id}&asset=${asset}`)).status,404,'visitors cannot download originals, even of published memories');
 assert.equal((await request(`/api/memories?action=media&id=${id}&asset=${original.split('/').at(-1)}`)).status,404,'nor reach them through the media endpoint');
 const download=await request(`/api/memories?action=original&id=${id}&asset=${asset}`,null,cookie());
 assert.equal(download.status,200);assert.equal(await download.text(),'the-untouched-original');assert.match(download.headers.get('content-disposition'),/^attachment; filename="IMG  0412 \.HEIC"/);
 assert.equal((await request('/api/memories?action=delete',{id,etag:saved.etag},cookie())).status,200);
 clock+=29*86400000;assert.equal((await (await request('/api/memories?admin=1',null,cookie())).json()).length,1,'still restorable on day 29');assert.ok(storage.blobs.has(original));
 clock+=2*86400000;assert.deepEqual(await (await request('/api/memories?admin=1',null,cookie())).json(),[]);
 assert.ok(!storage.blobs.has(photo)&&!storage.blobs.has(original)&&!storage.blobs.has(`records/${id}.json`),'after 30 days every file, the original included, is gone');
});

test('the catalog index answers a load without reading each record again',async()=>{
 const storage=fakeStore(),options={},reads=[];
 const read=async id=>{reads.push(id);const r=await storage.get(`records/${id}.json`);return r?{record:await new Response(r.stream).json(),etag:r.blob.etag}:null;};
 const ids=Array.from({length:20},(_,i)=>`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`);
 for(const id of ids)await storage.put(`records/${id}.json`,JSON.stringify({id,title:'Memory '+id.slice(-2)}),{});
 assert.equal((await loadCatalog({storage,options,read})).length,20);assert.equal(reads.length,20,'the first load builds the index');
 reads.length=0;const again=await loadCatalog({storage,options,read});assert.equal(again.length,20);assert.equal(reads.length,0,'later loads read no record files');
 assert.equal(again[3].etag,storage.blobs.get(`records/${ids[3]}.json`).etag,'the editor still gets each record’s ETag for conflict checks');
 // An edit, a new memory and a deletion are each picked up on the next load, reading only what changed.
 await storage.put(`records/${ids[0]}.json`,JSON.stringify({id:ids[0],title:'Edited'}),{allowOverwrite:true});
 const added='11111111-1111-4111-8111-111111111111';await storage.put(`records/${added}.json`,JSON.stringify({id:added,title:'New'}),{});await storage.del(`records/${ids[1]}.json`);
 const fresh=await loadCatalog({storage,options,read});assert.deepEqual(reads.sort(),[ids[0],added].sort());
 assert.equal(fresh.length,20);assert.equal(fresh.find(e=>e.record.id===ids[0]).record.title,'Edited');assert.ok(!fresh.some(e=>e.record.id===ids[1]));
 // A damaged index is rebuilt rather than trusted.
 storage.blobs.get(CATALOG_INDEX).body='not json';reads.length=0;assert.equal((await loadCatalog({storage,options,read})).length,20);assert.equal(reads.length,20);
 assert.ok(!(await loadCatalog({storage,options,read})).some(e=>e.record.id==='_index'),'the index is never listed as a memory');
});

test('the second copy adds and refreshes files but never deletes from the backup',async t=>{
 const source=fakeStore(),target=fakeStore();
 await source.put(`records/${id}.json`,'{"v":1}',{});await source.put(photo,'photo-bytes',{});await source.put(original,'original-bytes',{});await source.put(`thumbs/${id}/a.jpg`,'thumb',{});await source.put(CATALOG_INDEX,'{}',{});
 const first=await runBackup({source,target,sourceOptions:{},targetOptions:{}});
 assert.equal(first.copied,3);assert.equal(first.remaining,0);assert.ok(target.blobs.has(original));assert.ok(!target.blobs.has(`thumbs/${id}/a.jpg`)&&!target.blobs.has(CATALOG_INDEX),'rebuildable files are skipped');
 assert.equal((await runBackup({source,target,sourceOptions:{},targetOptions:{}})).copied,0,'nothing is copied twice');
 await source.put(`records/${id}.json`,'{"v":2}',{allowOverwrite:true});await source.del(photo);
 const next=await runBackup({source,target,sourceOptions:{},targetOptions:{}});assert.equal(next.copied,1);
 assert.equal(target.blobs.get(`records/${id}.json`).body,'{"v":2}');assert.equal(target.blobs.get(photo).body,'photo-bytes','a file deleted from the main store survives in the copy');
 let clock=0;const slow=await runBackup({source:{...source,list:async()=>({blobs:[{pathname:'a.jpg',size:1},{pathname:'b.jpg',size:2}],hasMore:false}),get:async()=>{clock+=100;return {stream:new Response('x').body,blob:{}};}},target:fakeStore(),sourceOptions:{},targetOptions:{},now:()=>clock,budgetMs:50});
 assert.equal(slow.copied,1);assert.equal(slow.remaining,1,'a run stops at its time budget and reports what is left');
 // The endpoint: off until a second store is configured, and closed to strangers.
 const request=await serve(t,createBackupHandler({storage:source,env}));
 assert.equal((await request('/api/memory-backup')).status,401);
 const cookie='at_home_editor='+createSession(env);
 assert.deepEqual(await (await request('/api/memory-backup',null,cookie)).json(),{configured:false});
 const cron=await serve(t,createBackupHandler({storage:source,env:{...env,BACKUP_BLOB_READ_WRITE_TOKEN:'secondary',CRON_SECRET:'a-long-random-cron-secret'}}));
 assert.equal((await cron('/api/memory-backup',null,null,{Authorization:'Bearer wrong-secret-entirely'})).status,401);
 const ran=await (await cron('/api/memory-backup',null,null,{Authorization:'Bearer a-long-random-cron-secret'})).json();assert.equal(ran.configured,true);assert.equal(ran.status.remaining,0);
});

test('the export archive is a valid zip laid out by memory, with originals and a note of anything missing',async()=>{
 assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
 const memories=[{id,title:'Penny: "first" steps/1',date:'2024-03-09',media:[{id:'a.jpg',type:'image',src:'/m/a',live:'/m/live',original:{name:'IMG_0412.HEIC',src:'/m/orig'}},{id:'b.mp4',type:'video',src:'/m/b'}],soundtrack:{title:'Our song',src:'/api/memories?action=media&id=1&asset=s.mp3'}},{id:'2',title:'',deletedAt:'2026-01-01',media:[{id:'c.png',type:'image',src:'/m/gone'}]}];
 const plan=exportPlan(memories).map(f=>f.path);
 assert.deepEqual(plan,['2024-03-09 Penny first steps 1/01.jpg','2024-03-09 Penny first steps 1/01 live.mp4','2024-03-09 Penny first steps 1/originals/IMG_0412.HEIC','2024-03-09 Penny first steps 1/02.mp4','2024-03-09 Penny first steps 1/soundtrack Our song.mp3','2024-03-09 Penny first steps 1/memory.json','Recently deleted/undated Memory/01.png','Recently deleted/undated Memory/memory.json']);
 const parts=[],result=await exportLibrary(memories,{write:async p=>{parts.push(p);},read:async src=>{if(src==='/m/gone')throw Error('offline');return new Blob([src.repeat(50)]);}});
 assert.deepEqual(result.missing,['Recently deleted/undated Memory/01.png']);
 const bytes=new Uint8Array(await new Blob(parts).arrayBuffer()),view=new DataView(bytes.buffer);assert.equal(result.bytes,bytes.length);
 // Read the archive back through its central directory, checking every stored file.
 const end=bytes.length-22;assert.equal(view.getUint32(end,true),0x06054b50);
 const count=view.getUint16(end+10,true);let at=view.getUint32(end+16,true);const names=[];
 for(let i=0;i<count;i++){
  assert.equal(view.getUint32(at,true),0x02014b50);const crc=view.getUint32(at+16,true),size=view.getUint32(at+20,true),nameLength=view.getUint16(at+28,true),extra=view.getUint16(at+30,true),local=view.getUint32(at+42,true);
  names.push(new TextDecoder().decode(bytes.subarray(at+46,at+46+nameLength)));
  const data=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);assert.equal(crc32(bytes.subarray(data,data+size)),crc,'stored bytes match their checksum');
  at+=46+nameLength+extra;
 }
 assert.ok(names.includes('MISSING FILES.txt')&&names.includes('library.json'));assert.equal(names.length,9);
});

test('an original is kept only when it differs from the copy the house plays',()=>{
 const heic=new File(['raw-heic-bytes'],'IMG_1.HEIC'),jpeg=new File(['small'],'IMG_1.jpg',{type:'image/jpeg'});
 assert.ok(keepableOriginal(heic,jpeg));assert.ok(!keepableOriginal(jpeg,jpeg),'an untouched small photo is already its own original');
 assert.ok(!keepableOriginal(new File(['x'],'notes.txt'),jpeg));assert.ok(!keepableOriginal(new File([],'IMG_2.HEIC'),jpeg));
 const target=originalUpload(heic,id);assert.ok(validOriginalPath(target.path));assert.equal(target.contentType,'image/heic');
});
