import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryHandler} from '../api/memories.js';
import {createSession} from '../server/memory-auth.js';
import {validateRecord} from '../server/memory-record.js';
import {planPoint} from '../src/house-layout.js';

const id='381b4dbd-5e89-4cd7-9a61-5d0c339b0cf2',other='54a700ea-d050-4819-afc5-a72774dbe851',asset='c0779408-a4dc-4c40-92a7-6c9bc04af079';
const p=`media/${id}/image.jpg`,v=`media/${id}/video.mp4`,small=`media/${id}/${asset}.png`,replacement=`media/${id}/${asset}.jpg`,audio=`soundtracks/${id}/${asset}.mp3`;
const [x,z]=planPoint(507,620);
const record={id,title:'An album',date:'2024-02-29',description:'Keep this story',petId:'miso',position:[x,0,z],mediaPaths:[p,v,small],mediaPath:p,type:'video',soundtrackPath:audio,soundtrackTitle:'A song',published:true,createdAt:'2026-09-01'};
const input={...record,replacePhotos:[{id:'image.jpg',path:replacement}]};
test('photo replacement preserves mixed album order and rejects foreign, duplicate or non-photo replacements',()=>{
 const result=validateRecord(input,record);assert.deepEqual(result.mediaPaths,[replacement,v,small]);assert.equal(result.type,'video');assert.equal(result.soundtrackPath,audio);assert.equal(result.createdAt,record.createdAt);
 for(const replacePhotos of [[{id:'video.mp4',path:replacement}],[{id:'image.jpg',path:`media/${other}/${asset}.jpg`}],[{id:'missing.jpg',path:replacement}],[input.replacePhotos[0],input.replacePhotos[0]],[{id:'image.jpg',path:small}]])assert.throws(()=>validateRecord({...input,replacePhotos},record),/Replace only photos/);
});
test('cloud replacement commits before retiring originals; failed validation or conflicts preserve originals',async()=>{
 const env={MEMORY_ADMIN_PASSWORD:'test-password',BLOB_READ_WRITE_TOKEN:'test-storage'};
 let current=structuredClone(record),etag='first',failCommit=false,size=999999,type='image/jpeg';const events=[];
 const storage={get:async()=>({stream:new Response(JSON.stringify(current)).body,blob:{etag}}),head:async()=>({size,contentType:type}),put:async(path,body,options)=>{if(failCommit)throw Error('precondition failed');assert.equal(options.ifMatch,etag);current=JSON.parse(body);etag='second';events.push('commit');return {etag};},del:async path=>{assert.deepEqual(current.mediaPaths,[replacement,v,small]);events.push(path);}};
 const handler=createMemoryHandler({storage,env});
 async function save(){const req={method:'POST',url:'/api/memories',headers:{host:'localhost',origin:'http://localhost',cookie:'at_home_editor='+createSession(env)},body:{...input,etag:'first'}},res={setHeader(){},status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;}};await handler(req,res);return res;}
 size=1000001;assert.equal((await save()).statusCode,400);assert.deepEqual(events,[]);assert.deepEqual(current,record);
 size=999999;type='video/mp4';assert.equal((await save()).statusCode,400);assert.deepEqual(events,[]);
 type='image/jpeg';failCommit=true;assert.equal((await save()).statusCode,409);assert.deepEqual(events,[]);assert.deepEqual(current,record);
 failCommit=false;const saved=await save();assert.equal(saved.statusCode,200);assert.deepEqual(events,['commit',p]);assert.equal(current.assetSizes[replacement],999999);assert.equal(current.soundtrackPath,audio);assert.equal(current.title,record.title);assert.equal(current.date,record.date);assert.equal(current.published,true);
 assert.deepEqual(saved.body.media.map(a=>a.id),[asset+'.jpg','video.mp4',asset+'.png']);
});
