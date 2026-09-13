import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareMemoryPhotos,isHeicFile} from '../src/photo-import.js';
test('HEIC and HEIF imports become JPEGs in order alongside existing photos, including empty iPhone MIME types',async()=>{
 const a=new File(['heic'],'IMG_1234.HEIC'),b=new File(['jpg'],'other.jpg',{type:'image/jpeg'}),c=new File(['heif'],'third.heif',{type:'image/heif'}),messages=[];
 const ready=await prepareMemoryPhotos([a,b,c],{photosOnly:true,existing:2,onProgress:m=>messages.push(m),convert:async()=>new Blob(['jpeg'],{type:'image/jpeg'})});
 assert.ok(isHeicFile(a));assert.equal(ready[0].name,'IMG_1234.jpg');assert.equal(ready[0].type,'image/jpeg');assert.equal(ready[1],b);assert.equal(ready[2].name,'third.jpg');assert.equal(messages.length,2);
});
test('conversion failures and album limits leave the original files untouched',async()=>{
 const a=new File(['heic'],'photo.heic',{type:'image/heic'});let calls=0;
 await assert.rejects(prepareMemoryPhotos([a,a],{existing:29,convert:()=>calls++}),/30/);assert.equal(calls,0);
 await assert.rejects(prepareMemoryPhotos([a],{convert:async()=>{throw Error('Invalid HEIC');}}),/existing memory has not changed/);assert.equal(a.type,'image/heic');
});
