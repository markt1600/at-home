import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createMemoryHandler} from '../api/memories.js';
import {createSession,authenticated,configured,passwordMatches} from '../server/memory-auth.js';
import {validateRecord,validMediaPath} from '../server/memory-record.js';
import {cleanMemoryMetadata} from '../src/memory-metadata.js';
import {planPoint} from '../src/house-layout.js';

const env={MEMORY_ADMIN_PASSWORD:'test-only-password-with-32-letters',BLOB_READ_WRITE_TOKEN:'test-storage',VERCEL:'1'};
const id='381b4dbd-5e89-4cd7-9a61-5d0c339b0cf2';
const [x,z]=planPoint(507,620);
const draft={id,title:'A quiet afternoon',description:'A test moment',date:'',position:[x,0,z],mediaPath:`media/${id}/video.mp4`,published:false};

test('the editor accepts the owner-selected six-character password without accepting missing credentials',()=>{
 const short={MEMORY_ADMIN_PASSWORD:'abc123'};assert.ok(configured(short));assert.ok(passwordMatches('abc123',short));assert.ok(!passwordMatches('wrong!',short));assert.ok(!configured({}));
});

test('editor sessions reject tampering, expiration and changed passwords',()=>{
 const now=1700000000000,token=createSession(env,now),req={headers:{cookie:'at_home_editor='+token}};
 assert.ok(authenticated(req,env,now));assert.ok(!authenticated(req,env,now+8*3600000));
 assert.ok(!authenticated(req,{...env,MEMORY_ADMIN_PASSWORD:'a different password entirely'},now));
 assert.ok(!authenticated({headers:{cookie:'at_home_editor='+token.slice(0,-4)+'aaaa'}},env,now));
 assert.ok(!authenticated(req,{},now));
});

test('private memory API protects drafts, detects conflicts, serves ranges and safely deletes stored files',async t=>{
 const records=new Map();let version=0,failNextDelete=false;const mediaCalls=[],deletions=[];
 const storage={
  get:async(path,options)=>{if(path.startsWith('records/')){const v=records.get(path);return v?{stream:new Response(v.body).body,blob:{etag:v.etag}}:null;}
   mediaCalls.push({path,options});const range=options.headers?.Range;return {stream:new Response(range?'vid':'video-data').body,blob:{contentType:'video/mp4'},headers:new Headers(range?{'content-range':'bytes 0-2/10','content-length':'3'}:{'content-length':'10'})};},
  list:async()=>({blobs:[...records.keys()].map(pathname=>({pathname})),hasMore:false}),
  head:async()=>({size:10,contentType:'video/mp4'}),
  put:async(path,body,options)=>{const current=records.get(path);if(current&&current.etag!==options.ifMatch)throw Error('precondition failed');const etag='version-'+(++version);records.set(path,{body,etag});return {etag};},
  del:async(path,options)=>{deletions.push({path,options});if(failNextDelete){failNextDelete=false;throw Error('Blob storage interrupted');}const current=records.get(path);if(current){assert.equal(options.ifMatch,current.etag,'record cleanup must be conditional');records.delete(path);}}
 };
 const handler=createMemoryHandler({storage,env}),server=createServer(async(req,res)=>{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);if(chunks.length)req.body=Buffer.concat(chunks).toString();
  res.status=code=>{res.statusCode=code;return res;};res.json=data=>res.end(JSON.stringify(data));await handler(req,res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const request=(query='',body,cookie,extra={})=>fetch(origin+'/api/memories'+query,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal((await request('',draft)).status,401);
 assert.equal((await request('?action=login',{password:env.MEMORY_ADMIN_PASSWORD},null,{Origin:'https://foreign.example'})).status,403);
 assert.equal((await request('?action=login',{password:'wrong'})).status,401);
 const login=await request('?action=login',{password:env.MEMORY_ADMIN_PASSWORD});assert.equal(login.status,200);
 const setCookie=login.headers.get('set-cookie');assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/Secure/);assert.match(setCookie,/SameSite=Strict/);const cookie=setCookie.split(';')[0];
 const save=await request('',{...draft,assetSizes:{[draft.mediaPath]:9999999}},cookie);assert.equal(save.status,200);const saved=await save.json();assert.equal(saved.published,false);assert.ok(!saved.mediaPath);assert.equal(saved.media[0].size,10,'size comes from storage, never the client');assert.ok(!saved.assetSizes);
 assert.deepEqual(await (await request()).json(),[]);
 assert.equal((await request('?admin=1')).status,401);
 assert.equal((await request('?action=media&id='+id)).status,404);assert.equal(mediaCalls.length,0,'unauthenticated drafts never fetch their media');
 const listing=await (await request('?admin=1',null,cookie)).json();assert.equal(listing.length,1);assert.equal(listing[0].etag,saved.etag);
 assert.equal((await request('?action=media&id='+id,null,cookie)).status,200);
 assert.equal((await request('',{...draft,published:true,etag:'old'},cookie)).status,409);
 const photo=`media/${id}/c0779408-a4dc-4c40-92a7-6c9bc04af079.jpg`;
 const appended=await request('',{...draft,etag:saved.etag,addMediaPaths:[photo]},cookie);assert.equal(appended.status,200);const album=await appended.json();assert.equal(album.media.length,2);assert.deepEqual(album.media.map(a=>a.size),[10,10]);
 const callsBefore=mediaCalls.length;assert.equal((await request(album.media[1].src.replace('/api/memories',''))).status,404);assert.equal(mediaCalls.length,callsBefore,'appended draft photos remain private');
 assert.equal((await request('?action=media&id='+id+'&asset=unlisted.jpg',null,cookie)).status,404);assert.equal(mediaCalls.length,callsBefore,'unlisted files under the same memory cannot be read');
 const publish=await request('',{...draft,published:true,etag:album.etag},cookie);assert.equal(publish.status,200);const published=await publish.json();
 assert.equal((await request(published.media[1].src.replace('/api/memories',''))).status,200);assert.equal(mediaCalls.at(-1).path,photo);
 const shared=await (await request()).json();assert.equal(shared.length,1);assert.ok(!shared[0].mediaPath);assert.ok(!shared[0].etag);
 const range=await request('?action=media&id='+id,null,null,{Range:'bytes=0-2'});assert.equal(range.status,206);assert.equal(range.headers.get('content-range'),'bytes 0-2/10');assert.equal(await range.text(),'vid');assert.equal(mediaCalls.at(-1).options.headers.Range,'bytes=0-2');
 const hide=await request('',{...draft,published:false,etag:published.etag},cookie);assert.equal(hide.status,200);assert.equal((await request('?action=media&id='+id)).status,404);
 assert.equal((await request('',{...draft,position:[999,0,999],etag:(await hide.json()).etag},cookie)).status,400);
 const current=(await (await request('?admin=1',null,cookie)).json())[0];
 assert.equal((await request('?action=delete',{id,etag:current.etag})).status,401);
 assert.equal((await request('?action=delete',{id,etag:current.etag},cookie,{Origin:'https://foreign.example'})).status,403);
 assert.equal((await request('?action=delete',{id:'../../records/other'},cookie)).status,400);
 assert.equal((await request('?action=delete',{id,etag:saved.etag},cookie)).status,409);
 assert.equal(deletions.length,0,'rejected requests must not remove any files');
 // Publish before interruption to prove deletion revokes all public access first.
 const visible=await (await request('',{...draft,published:true,etag:current.etag},cookie)).json();
 failNextDelete=true;
 assert.equal((await request('?action=delete',{id,etag:visible.etag},cookie)).status,502);
 assert.deepEqual(await (await request()).json(),[]);
 assert.equal((await request('?action=media&id='+id,null,cookie)).status,404);
 const pending=(await (await request('?admin=1',null,cookie)).json())[0];assert.ok(pending.deleting);assert.equal(pending.published,false);
 assert.equal((await request('',{...draft,published:true,etag:pending.etag},cookie)).status,409,'deleting records cannot be republished');
 assert.equal((await request('?action=delete',{id,etag:pending.etag,mediaPath:'media/do-not-delete'},cookie)).status,200);
 assert.deepEqual(deletions.map(d=>d.path),[draft.mediaPath,draft.mediaPath,photo,`records/${id}.json`],'every server-owned album file and its record are deleted');
 assert.deepEqual(await (await request('?admin=1',null,cookie)).json(),[]);
 assert.equal((await request('?action=media&id='+id)).status,404);
 assert.equal((await request('',{...draft,etag:pending.etag},cookie)).status,409,'a stale editor cannot recreate a deleted record');
 assert.equal((await request('?action=delete',{id,etag:pending.etag},cookie)).status,200,'retry after successful deletion is harmless');
 assert.equal(deletions.length,4);
});

test('memory records reject foreign paths and impossible locations, and normalize dates safely',()=>{
 assert.ok(validMediaPath(draft.mediaPath));assert.ok(!validMediaPath('records/'+id+'.json'));assert.ok(!validMediaPath('media/../../secrets'));
 assert.throws(()=>validateRecord({...draft,mediaPath:'media/54a700ea-d050-4819-afc5-a72774dbe851/video.mp4'}));
 assert.throws(()=>validateRecord({...draft,position:[9999,0,9999]}));
 assert.equal(validateRecord({...draft,position:[x,900,z]}).position[1],0);
 assert.throws(()=>cleanMemoryMetadata({title:'Test',date:'2024-99-88'}),/valid date/);
 assert.throws(()=>cleanMemoryMetadata({title:'Test',date:'2024-02-30'}),/valid date/);
 assert.equal(cleanMemoryMetadata({title:'Test',date:'2024-02-29'}).date,'2024-02-29');
});
