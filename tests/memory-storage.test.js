import test from 'node:test';
import assert from 'node:assert/strict';
import {memoryStorage,memoryStorageLabel,formatFileSize} from '../src/memory-storage.js';
import {resolveStoredSizes} from '../server/memory-storage.js';
import {publicRecord} from '../server/memory-record.js';
import {createMemoryHandler} from '../api/memories.js';
import {createSession} from '../server/memory-auth.js';

test('library sizes include every photo, video and soundtrack, using actual stored bytes',()=>{
 const cloud={media:[{size:2000000},{size:12000000}],soundtrack:{size:4000000}};
 assert.deepEqual(memoryStorage(cloud),{bytes:18000000,known:3,files:3,complete:true});
 assert.equal(memoryStorageLabel(cloud),'18 MB stored');
 assert.equal(memoryStorageLabel({media:[{file:{size:1500}},{file:{size:2000}}],soundtrackFile:{size:1000}}),'4.5 KB stored');
 assert.equal(formatFileSize(1500000000),'1.5 GB');
 assert.equal(memoryStorageLabel({media:[{size:null}]}),'Size unavailable');
 assert.match(memoryStorageLabel({media:[{size:2000000},{size:null}]}),/^At least 2 MB/);
});

test('legacy sizes come from paginated metadata listings, including audio, without fetching files',async()=>{
 const paths=['media/one/a.jpg','media/one/b.mp4','soundtracks/one/c.mp3'],calls=[];
 const records=[{id:'one',mediaPaths:paths.slice(0,2),soundtrackPath:paths[2],assetSizes:{[paths[0]]:12}}];
 const storage={list:async options=>{calls.push(options);if(options.prefix==='soundtracks/')return {blobs:[{pathname:paths[2],size:30}],hasMore:false};return options.cursor?{blobs:[{pathname:paths[1],size:50}],hasMore:false}:{blobs:[{pathname:'media/unused/a.jpg',size:99}],hasMore:true,cursor:'next'};}};
 const [sized]=await resolveStoredSizes(records,storage,{access:'private'});
 assert.equal(memoryStorage(publicRecord(sized)).bytes,92);assert.equal(calls.length,3);
 assert.ok(calls.every(c=>c.access==='private'));assert.deepEqual(records[0].assetSizes,{[paths[0]]:12},'GET does not mutate or rewrite records');
 assert.ok(!('assetSizes' in publicRecord(sized)));assert.ok(!JSON.stringify(publicRecord(sized)).includes('media/one'));
 const again=await resolveStoredSizes([sized],{list:()=>assert.fail('known sizes need no lookup')},{});assert.equal(again[0],sized);
});

test('a metadata outage or missing file preserves known sizes and does not invent zero sizes',async()=>{
 const r={id:'one',mediaPaths:['media/one/a.jpg','media/one/b.jpg'],assetSizes:{'media/one/a.jpg':20}};
 const [sized]=await resolveStoredSizes([r],{list:async()=>{throw Error('Storage unavailable');}},{});
 assert.deepEqual(memoryStorage(publicRecord(sized)),{bytes:20,known:1,files:2,complete:false});
});

test('only an authenticated editor resolves old file sizes; public catalog avoids the extra work',async()=>{
 const id='381b4dbd-5e89-4cd7-9a61-5d0c339b0cf2',path=`media/${id}/image.jpg`,env={MEMORY_ADMIN_PASSWORD:'abc123',BLOB_READ_WRITE_TOKEN:'test'},calls=[];
 const record={id,title:'Legacy memory',mediaPath:path,published:true,updatedAt:'2024-01-01'};
 const storage={get:async p=>{assert.equal(p,`records/${id}.json`);return {stream:new Response(JSON.stringify(record)).body,blob:{etag:'unchanged'}};},list:async({prefix})=>{calls.push(prefix);return {blobs:prefix==='records/'?[{pathname:`records/${id}.json`}]:[{pathname:path,size:2500000}],hasMore:false};}};
 const handler=createMemoryHandler({storage,env});
 const request=async(url,cookie)=>{const res={setHeader(){},status(n){this.code=n;return this;},json(data){this.data=data;return this;}};await handler({url,method:'GET',headers:{cookie}},res);return res;};
 const denied=await request('/api/memories?admin=1');assert.equal(denied.code,401);assert.deepEqual(calls,[]);
 const publicList=await request('/api/memories');assert.equal(publicList.data[0].media[0].size,null);assert.deepEqual(calls,['records/']);
 const admin=await request('/api/memories?admin=1','at_home_editor='+createSession(env));assert.equal(admin.code,200);assert.equal(admin.data[0].media[0].size,2500000);assert.equal(admin.data[0].etag,'unchanged');assert.deepEqual(calls,['records/','records/','media/']);assert.ok(!JSON.stringify(admin.data).includes(path));
});
