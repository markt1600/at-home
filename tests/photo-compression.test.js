import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_PHOTO_BYTES,fitPhotoToLimit,compressPhoto,preparePhotoReplacements} from '../src/photo-compression.js';
import {prepareMemoryPhotos} from '../src/photo-import.js';

const photo=(size=MAX_PHOTO_BYTES+1,name='photo.png')=>new File([new Uint8Array(size)],name,{type:'image/png'});
test('compression checks encoded bytes and reduces dimensions when quality alone is insufficient',async()=>{
 const attempts=[];
 const result=await fitPhotoToLimit({width:6000,height:4000,encode:async(w,h,q)=>{attempts.push({w,h,q});return new Blob([new Uint8Array(w>2000?MAX_PHOTO_BYTES+1:MAX_PHOTO_BYTES)],{type:'image/jpeg'});}});
 assert.equal(result.size,MAX_PHOTO_BYTES);assert.equal(attempts.length,6);
 assert.equal(attempts[0].w,2560);assert.equal(attempts[5].w,1997);assert.ok(Math.abs(attempts[5].w/attempts[5].h-1.5)<.001);
 await assert.rejects(fitPhotoToLimit({width:10,height:10,encode:async()=>null}),/could not encode/);
 await assert.rejects(fitPhotoToLimit({width:1,height:1,encode:async()=>new Blob([new Uint8Array(MAX_PHOTO_BYTES+1)],{type:'image/jpeg'})}),/could not be reduced/);
});
test('photos at the byte limit are preserved without decoding or losing quality',async()=>{
 const file=photo(MAX_PHOTO_BYTES);assert.equal(await compressPhoto(file,{decode:()=>assert.fail('should not decode')}),file);
});
test('new imports compress photos including converted HEIC while preserving videos and album order',async()=>{
 const large=photo(),small=photo(50),video=new File([new Uint8Array(MAX_PHOTO_BYTES+20)],'video.mp4',{type:'video/mp4'}),heic=new File(['heic'],'iphone.heic'),calls=[];
 const result=await prepareMemoryPhotos([large,video,small,heic],{convert:async()=>new Blob([new Uint8Array(MAX_PHOTO_BYTES+10)],{type:'image/jpeg'}),compress:async file=>{calls.push(file.name);return new File(['compressed'],file.name,{type:'image/jpeg'});}});
 assert.deepEqual(calls,['photo.png','iphone.jpg']);assert.equal(result[1],video);assert.equal(result[2],small);assert.ok(result.filter(f=>f.type.startsWith('image/')).every(f=>f.size<=MAX_PHOTO_BYTES));
 await assert.rejects(prepareMemoryPhotos([large],{compress:async f=>f}),/Could not compress/);
});
test('existing-photo preparation skips small photos and videos, and never mutates the memory',async()=>{
 const media=[{id:'a',type:'image',size:2000000},{id:'v',type:'video',size:5000000},{id:'b',type:'image',size:5000},{id:'c',type:'image'}],before=structuredClone(media),reads=[];
 const replacements=await preparePhotoReplacements(media,{read:async a=>{reads.push(a.id);return photo(a.id==='a'?2000000:3000000);},compress:async()=>photo(900000)});
 assert.deepEqual(reads,['a','c']);assert.deepEqual(replacements.map(r=>r.id),['a','c']);assert.deepEqual(replacements.map(r=>r.previousSize),[2000000,3000000]);assert.deepEqual(media,before);
 await assert.rejects(preparePhotoReplacements(media,{read:async()=>{throw Error('download failed');}}),/download failed/);assert.deepEqual(media,before);
});
