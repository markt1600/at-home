import test from 'node:test';
import assert from 'node:assert/strict';
import {exifDate,movieDate,captureDate,earliestCaptureDate,captureDateNote} from '../src/capture-date.js';
import {pairLivePhotos} from '../src/live-photos.js';
import {anniversaries,visitWeight,markSeen,loadSeen,timeline,yearsAgo} from '../src/memory-recall.js';
import {createMemoryVisit} from '../src/memory-visit.js';
import {chooseFramePhotos,coverCrop,MEMORY_FRAME_SPOTS} from '../src/memory-frames.js';
import {cinemaShows} from '../src/cinema.js';
import {createPhoneUploadJob,uploadPhoneMemory} from '../src/phone-upload-job.js';
import {validOriginalPath} from '../server/memory-record.js';
import {HOUSE_ROOMS,pointInPolygon,planPoint} from '../src/house-layout.js';

// A minimal EXIF block: IFD0 → Exif IFD → DateTimeOriginal.
function exif(date,little=true){
 const tiff=new DataView(new ArrayBuffer(64)),text=new TextEncoder().encode(date+'\0');
 tiff.setUint8(0,little?0x49:0x4d);tiff.setUint8(1,little?0x49:0x4d);tiff.setUint16(2,42,little);tiff.setUint32(4,8,little);
 tiff.setUint16(8,1,little);tiff.setUint16(10,0x8769,little);tiff.setUint16(12,4,little);tiff.setUint32(14,1,little);tiff.setUint32(18,26,little);
 tiff.setUint16(26,1,little);tiff.setUint16(28,0x9003,little);tiff.setUint16(30,2,little);tiff.setUint32(32,20,little);tiff.setUint32(36,44,little);
 new Uint8Array(tiff.buffer).set(text,44);
 return new Uint8Array([0xff,0xd8,0xff,0xe1,0,70,...new TextEncoder().encode('Exif'),0,0,...new Uint8Array(tiff.buffer)]);
}
function movie(seconds,extra=''){
 const moov=new Uint8Array(8+28+extra.length),view=new DataView(moov.buffer);view.setUint32(0,moov.length);moov.set(new TextEncoder().encode('moov'),4);
 view.setUint32(8,28);moov.set(new TextEncoder().encode('mvhd'),12);view.setUint32(20,seconds);moov.set(new TextEncoder().encode(extra),36);
 const ftyp=new Uint8Array(16);new DataView(ftyp.buffer).setUint32(0,16);ftyp.set(new TextEncoder().encode('ftypqt  '),4);
 return [ftyp,moov];
}

test('the capture date is read from the photo or video itself before it is re-encoded',async()=>{
 assert.equal(exifDate(exif('2023:12:25 08:14:03')),'2023-12-25');assert.equal(exifDate(exif('2021:02:28 23:59:59',false)),'2021-02-28','big-endian cameras too');
 assert.equal(exifDate(exif('0000:00:00 00:00:00')),null,'an unset camera clock is not a date');assert.equal(exifDate(new Uint8Array(200)),null);
 assert.equal(exifDate(new TextEncoder().encode('Exif\0\0II*\0'+'\xff'.repeat(40))),null,'damaged blocks are ignored, not thrown');
 const [,moov]=movie(2082844800+Date.UTC(2022,6,4,12)/1000);assert.equal(movieDate(moov),'2022-07-04');
 assert.equal(movieDate(movie(0,'com.apple.quicktime.creationdate 2024-08-17T19:05:44+0800')[1]),'2024-08-17','the iPhone’s local capture time wins over the UTC header');
 assert.equal(movieDate(movie(0)[1]),null);
 const now=Date.UTC(2026,0,10);
 assert.deepEqual(await captureDate(new File([exif('2023:12:25 08:14:03')],'IMG_1.JPG',{type:'image/jpeg'}),{now}),{date:'2023-12-25',source:'photo'});
 assert.deepEqual(await captureDate(new File(movie(2082844800+Date.UTC(2022,6,4,12)/1000),'IMG_2.MOV'),{now}),{date:'2022-07-04',source:'video'});
 const old=await captureDate(new File(['no metadata'],'scan.png',{type:'image/png',lastModified:Date.UTC(2019,4,5,12)}),{now});assert.equal(old.source,'file');assert.equal(old.date,'2019-05-05');
 assert.equal(await captureDate(new File(['fresh'],'export.jpg',{type:'image/jpeg',lastModified:now-1000}),{now}),null,'a file written moments ago says nothing about when the photo was taken');
 const album=await earliestCaptureDate([new File(['x'],'scan.png',{type:'image/png',lastModified:Date.UTC(2010,0,1)}),new File([exif('2023:12:25 08:14:03')],'b.jpg'),new File([exif('2023:12:24 22:00:00')],'a.jpg')],{now});
 assert.deepEqual(album,{date:'2023-12-24',source:'photo'},'an album starts on its earliest real capture date; file dates are only a last resort');
 assert.match(captureDateNote(old),/Check it/);assert.equal(captureDateNote(null),'');
});

test('a Live Photo’s clip pairs with the photo of the same name',()=>{
 const f=(name,size=1000)=>new File([new Uint8Array(size)],name);
 const still=f('IMG_1234.HEIC'),motion=f('img_1234.mov'),holiday=f('Holiday.mp4'),other=f('IMG_9999.JPG');
 const pairs=pairLivePhotos([still,motion,holiday,other]);assert.equal(pairs.size,1);assert.equal(pairs.get(motion),still);
 assert.equal(pairLivePhotos([f('A.JPG'),f('A.HEIC'),f('A.MOV')]).size,0,'an ambiguous name is left as separate items');
 assert.equal(pairLivePhotos([f('B.JPG'),f('B.MOV',41*1024*1024)]).size,0,'a long video that happens to share a name stays a video');
});

test('memories from this day in earlier years are found, around the turn of the year too',()=>{
 const memories=[{id:'exact',date:'2023-11-17'},{id:'older',date:'2019-11-17'},{id:'near',date:'2022-11-15'},{id:'thisyear',date:'2026-11-17'},{id:'far',date:'2021-06-01'},{id:'undated'},{id:'newyear',date:'2024-01-01'}];
 const today=new Date(2026,10,17),found=anniversaries(memories,today);
 assert.deepEqual(found.map(f=>f.memory.id),['exact','older','near']);assert.deepEqual(found.map(f=>f.years),[3,7,4]);assert.deepEqual(found.map(f=>f.exact),[true,true,false]);
 assert.deepEqual(anniversaries(memories,new Date(2025,11,30)).map(f=>f.memory.id),['newyear'],'30 December is within three days of 1 January');
 assert.deepEqual(anniversaries([{id:'last-week',date:'2025-12-29'}],new Date(2026,0,1)),[],'something from four days ago is not an anniversary');
 assert.equal(yearsAgo(1),'a year ago');assert.equal(yearsAgo(4),'4 years ago');
});

test('a visit favours anniversaries, the season and memories not opened lately, with chance among equals',()=>{
 const today=new Date(2026,10,17),now=today.getTime(),seen={recent:now-86400000,old:now-200*86400000};
 const w=(m)=>visitWeight(m,{today,seen,now});
 assert.ok(w({id:'a',date:'2020-11-17'})>w({id:'b',date:'2020-11-15'}));assert.ok(w({id:'b',date:'2020-11-15'})>w({id:'c',date:'2020-12-10'}));assert.ok(w({id:'c',date:'2020-12-10'})>w({id:'d',date:'2020-05-10'}));
 assert.ok(w({id:'never'})>w({id:'recent'}));assert.equal(w({id:'never'}),w({id:'old'}),'not opened for months counts the same as never');
 assert.equal(w({id:'x',date:'2026-11-17'}),.5,'today’s own photos are not an anniversary');
 const catalog=[...Array.from({length:30},(_,i)=>({id:'m'+i,date:'2021-05-0'+(i%9+1)})),{id:'birthday',date:'2022-11-17'}];
 for(let run=0;run<20;run++){const visit=createMemoryVisit({weight:m=>visitWeight(m,{today,seen:{},now})});assert.ok(visit.select(catalog).some(m=>m.id==='birthday'),'an anniversary is always among the eight');}
 const store={data:{},getItem(k){return this.data[k]??null;},setItem(k,v){this.data[k]=v;}};
 markSeen('a',{storage:store,now:5});markSeen('b',{storage:store,now:9});assert.deepEqual(loadSeen(store),{a:5,b:9});
 assert.deepEqual(loadSeen({getItem:()=>'not json'}),{});assert.deepEqual(markSeen('c',{storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},now:1}),{c:1},'private browsing never breaks opening a memory');
});

test('the timeline runs newest to oldest by year with undated memories last',()=>{
 const groups=timeline([{id:'a',date:'2023-05-01',title:'B'},{id:'b',title:'Undated'},{id:'c',date:'2025-01-09',title:'A'},{id:'d',date:'2023-05-01',title:'A'},{id:'e',date:'2023-12-31',title:'Z'}]);
 assert.deepEqual(groups.map(g=>g.year),[2025,2023,null]);assert.deepEqual(groups[1].items.map(m=>m.id),['e','d','a']);
});

test('picture frames take one photo per memory, crop to fit, and stand inside the house',()=>{
 const memories=[{id:'v',type:'video',src:'/v.mp4'},{id:'a',type:'image',src:'/a.jpg'},{id:'a',type:'image',src:'/a.jpg'},{id:'mixed',media:[{type:'video',src:'/c.mp4'},{type:'image',src:'/m.jpg'}]},{id:'b',type:'image',src:'/b.jpg'},{id:'c',type:'image',src:'/c.jpg'},{id:'d',type:'image',src:'/d.jpg'}];
 assert.deepEqual(chooseFramePhotos(memories).map(p=>p.src),['/a.jpg','/m.jpg','/b.jpg','/c.jpg']);assert.deepEqual(chooseFramePhotos([memories[0]]),[]);
 assert.deepEqual(coverCrop(4000,3000,1),{x:500,y:0,width:3000,height:3000});assert.deepEqual(coverCrop(3000,4000,1.5),{x:0,y:1000,width:3000,height:2000});assert.equal(coverCrop(0,10,1),null);
 for(const spot of MEMORY_FRAME_SPOTS){const [x,z]=planPoint(...spot.plan);assert.ok(HOUSE_ROOMS.some(r=>pointInPolygon(x,z,r.polygon)),spot.id+' stands in a room');assert.ok(spot.width<.3&&spot.height<.3);}
 assert.equal(new Set(MEMORY_FRAME_SPOTS.map(s=>s.id)).size,MEMORY_FRAME_SPOTS.length);
});

test('the cinema plays photo memories as slideshows alongside video memories',()=>{
 const shows=cinemaShows([{id:'film',title:'Film',media:[{id:'1',type:'video',src:'/f.mp4'}]},{id:'album',title:'Album',soundtrack:{src:'/s.mp3'},media:[{id:'1',type:'image',src:'/1.jpg',live:'/l.mp4'},{id:'2',type:'image',src:'/2.jpg'}]},{id:'mixed',media:[{id:'1',type:'image',src:'/3.jpg'},{id:'2',type:'video',src:'/g.mp4'}]}]);
 assert.deepEqual(shows.map(s=>[s.id,s.type,s.media.length]),[['film','video',1],['mixed','video',1],['album','image',2]]);
 assert.ok(shows[2].soundtrack,'a photo slideshow keeps its song');assert.ok(!shows[2].media[0].live,'Live motion is not replayed on the big screen');
});

test('a phone upload keeps originals and Live Photo motion, and resumes them after an interruption',async()=>{
 const jpg=n=>new File(['small'],n,{type:'image/jpeg'}),heic=new File(['the-original-heic'],'IMG_1.HEIC',{type:'image/heic'}),mov=new File(['original-mov'],'IMG_1.MOV',{type:'video/quicktime'});
 const rows=[{id:'photo',original:heic,file:jpg('IMG_1.jpg')},{id:'motion',original:mov,file:new File(['mp4'],'IMG_1.mp4',{type:'video/mp4'}),liveFor:'photo'},{id:'plain',original:jpg('b.jpg'),file:jpg('b.jpg')}];
 rows[2].file=rows[2].original;   // a small JPEG that needed no preparation
 const job=createPhoneUploadJob(),uploads=[];let fail=true,remembered=0;
 const options={job,rows,metadata:{title:'Live',date:'',description:''},position:[0,0,0],keepOriginals:true,onUploaded:()=>{remembered++;},save:async p=>p,
  upload:async(path,file,opts)=>{if(file===heic&&fail){fail=false;throw Error('offline');}uploads.push([path,file.name,opts.contentType]);}};
 await assert.rejects(uploadPhoneMemory(options),/offline/);assert.equal(job.uploaded.size,3);assert.equal(remembered,3,'each finished upload is remembered as it completes');
 // Resuming from stored state uploads only what was missing.
 const resumed=createPhoneUploadJob(job.id);resumed.uploaded=new Map([...job.uploaded]);uploads.length=0;
 const payload=await uploadPhoneMemory({...options,job:resumed});
 assert.equal(uploads.length,1);assert.equal(uploads[0][1],'IMG_1.HEIC');assert.equal(uploads[0][2],'image/heic');assert.ok(validOriginalPath(uploads[0][0]));
 assert.equal(payload.addMediaPaths.length,2,'the motion clip is not a slide');
 assert.deepEqual(payload.addLivePhotos,[{asset:payload.addMediaPaths[0].split('/').at(-1),path:resumed.uploaded.get('motion')}]);
 assert.deepEqual(payload.addOriginals,[{asset:payload.addMediaPaths[0].split('/').at(-1),path:uploads[0][0],name:'IMG_1.HEIC'}],'only the photo that was actually reduced keeps a separate original');
 const without=await uploadPhoneMemory({...options,job:createPhoneUploadJob(),keepOriginals:false,upload:async()=>{}});assert.ok(!without.addOriginals);
});
