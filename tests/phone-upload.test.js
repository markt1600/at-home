import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePhoneFile,preparePhoneMedia} from '../src/phone-media.js';
import {videoDimensions} from '../src/phone-video.js';
import {createPhoneUploadJob,uploadPhoneMemory,matchesSavedUpload} from '../src/phone-upload-job.js';
const photo=new File(['jpeg'],'a.jpg',{type:'image/jpeg'}),video=new File(['mp4'],'b.mp4',{type:'video/mp4'});
const rows=[{id:'a',file:photo},{id:'b',file:video}];
const args=()=>({job:createPhoneUploadJob(),rows,metadata:{title:'Phone memory',date:'2024-02-29',description:'From Photos'},position:[0,0,0]});
test('iPhone Files MIME omissions and aliases normalize before conversion',async()=>{
 for(const [name,type] of [['IMG_1.JPG','image/jpeg'],['IMG_2.HEIC','image/heic'],['IMG_3.MOV','video/quicktime'],['clip.m4v','video/mp4']])assert.equal(normalizePhoneFile(new File(['data'],name)).type,type);
 assert.throws(()=>normalizePhoneFile(new File(['raw'],'photo.dng')),/Choose a photo/);
 assert.throws(()=>normalizePhoneFile(new File([],'empty.heic')),/empty/);
 const calls=[];await preparePhoneMedia(photo,{photo:async(files,options)=>{calls.push(options);return files;}});assert.equal(calls[0].normalize,true);
 await preparePhoneMedia(video,{video:async f=>{assert.equal(f,video);return {file:f};}});
 const controller=new AbortController();controller.abort();await assert.rejects(preparePhoneMedia(photo,{signal:controller.signal}),{name:'AbortError'});
});
test('video resizing keeps portrait/landscape orientation and never upscales',()=>{
 assert.deepEqual(videoDimensions(3840,2160),{width:1280,height:720});assert.deepEqual(videoDimensions(2160,3840),{width:720,height:1280});
 assert.deepEqual(videoDimensions(640,480),{width:640,height:480});assert.deepEqual(videoDimensions(4000,4000),{width:720,height:720});
 assert.throws(()=>videoDimensions(0,400),/invalid/);
});
test('an interrupted upload retries only unfinished files and creates a private record after all succeed',async()=>{
 const state=args(),uploaded=[],saved=[];let fail=true;
 const options={...state,upload:async(path,file,opts)=>{uploaded.push(file.name);assert.equal(opts.access,'private');assert.equal(opts.multipart,true);if(file===video&&fail){fail=false;throw Error('offline');}},save:async p=>{saved.push(p);return p;}};
 await assert.rejects(uploadPhoneMemory(options),/offline/);assert.equal(saved.length,0);assert.equal(state.job.uploaded.size,1);
 const result=await uploadPhoneMemory(options);assert.deepEqual(uploaded,['a.jpg','b.mp4','b.mp4']);assert.equal(result.published,false);assert.equal(result.addMediaPaths.length,2);assert.equal(result.id,state.job.id);
});
test('append uploads preserve the selected memory and reject oversize albums before any network writes',async()=>{
 const state=args(),old={id:state.job.id,etag:'prior',media:[{id:'old.jpg'}],petId:'miso'};
 const result=await uploadPhoneMemory({...state,existing:old,published:true,upload:async()=>{},save:async p=>p});assert.equal(result.etag,'prior');assert.equal(result.petId,'miso');assert.equal(result.published,true);assert.equal(result.addMediaPaths.length,2);
 await assert.rejects(uploadPhoneMemory({...state,existing:{...old,media:Array(29).fill({id:'x'})},upload:()=>assert.fail('no upload'),save:()=>assert.fail('no save')}),/30/);
 await assert.rejects(uploadPhoneMemory({...state,rows:[{id:'large',file:new File([new Uint8Array(1_000_001)],'large.jpg',{type:'image/jpeg'})}],upload:()=>assert.fail('no upload')}),/1 MB/);
});
test('a lost save response recovers only the exact committed memory',async()=>{
 const state=args();let record;
 const result=await uploadPhoneMemory({...state,upload:async()=>{},save:async p=>{record={...p,media:p.addMediaPaths.map(path=>({id:path.split('/').at(-1)}))};throw Error('lost response');},findSaved:async()=>record});assert.equal(result.id,state.job.id);
 assert.equal(matchesSavedUpload({...record,title:'Other'},record),false);
 assert.equal(matchesSavedUpload({...record,media:[]},record),false);
 assert.equal(matchesSavedUpload({...record,position:[4,0,4]},record),false);
});
test('cancellation never commits a partial memory',async()=>{
 const controller=new AbortController();await assert.rejects(uploadPhoneMemory({...args(),signal:controller.signal,upload:async()=>controller.abort(),save:()=>assert.fail('no record should be committed')}),{name:'AbortError'});
});
