import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createMemoryHandler} from '../api/memories.js';
import {publicRecord} from '../server/memory-record.js';

const env={MEMORY_ADMIN_PASSWORD:'test-only-password-with-32-letters',BLOB_READ_WRITE_TOKEN:'test-storage',VERCEL:'1'};
const id='7c1f3f0e-2d7a-4e49-9a44-4a0b0d9b1f11';
const record={id,title:'Garden',description:'',date:'',position:[0,0,0],mediaPaths:[`media/${id}/photo.png`,`media/${id}/clip.mp4`],published:true};

test('photos get a cached thumbnail; videos do not; media responses are cacheable',async t=>{
 const sharp=(await import('sharp')).default;
 const png=await sharp({create:{width:1200,height:800,channels:3,background:'#4a7'}}).png().toBuffer();
 const stored=new Map([[`media/${id}/photo.png`,png]]),puts=[];let originalReads=0;
 const storage={
  get:async(path)=>{if(path===`records/${id}.json`)return {stream:new Response(JSON.stringify(record)).body,blob:{etag:'v1'}};const body=stored.get(path);if(!body)return null;if(path.startsWith('media/'))originalReads++;return {stream:new Response(body).body,blob:{contentType:'image/png'},headers:new Headers({'content-length':String(body.length)})};},
  put:async(path,body,options)=>{puts.push({path,options});stored.set(path,Buffer.from(body));return {etag:'t1'};},
  list:async()=>({blobs:[],hasMore:false}),head:async()=>({size:1}),del:async()=>{},
 };
 const handler=createMemoryHandler({storage,env}),server=createServer(async(req,res)=>{res.status=c=>{res.statusCode=c;return res;};res.json=d=>res.end(JSON.stringify(d));await handler(req,res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const pub=publicRecord(record);assert.ok(pub.media[0].thumb.includes('action=thumb'));assert.equal(pub.media[1].thumb,null,'videos have no thumbnail');
 const first=await fetch(origin+pub.media[0].thumb);assert.equal(first.status,200);assert.equal(first.headers.get('content-type'),'image/jpeg');assert.match(first.headers.get('cache-control'),/max-age/);
 const meta=await sharp(Buffer.from(await first.arrayBuffer())).metadata();assert.equal(meta.width,320);assert.ok(meta.height<=320);
 await new Promise(r=>setTimeout(r,50));
 assert.deepEqual(puts.map(p=>p.path),[`thumbs/${id}/photo.png.jpg`],'the thumbnail is stored beside the originals');
 const second=await fetch(origin+pub.media[0].thumb);assert.equal(second.status,200);assert.equal(originalReads,1,'the second request is served from the stored thumbnail');
 assert.equal((await fetch(`${origin}/api/memories?action=thumb&id=${id}&asset=clip.mp4`)).status,404,'no thumbnail for a video');
 const media=await fetch(origin+pub.media[0].src);assert.equal(media.status,200);assert.match(media.headers.get('cache-control'),/max-age/);
});
