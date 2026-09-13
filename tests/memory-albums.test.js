import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRecord,publicRecord,recordMediaPaths} from '../server/memory-record.js';
import {memoryMedia,memoryAppearance,validateMemoryFiles} from '../src/memory-media.js';
import {cleanMemoryFilter,filterMemories} from '../src/memory-filter.js';
import {accessibleMemorySpot,hasMemoryClearance} from '../src/memory-access.js';
import {planPoint} from '../src/house-layout.js';
import {newLife,restoreLife,PETS} from '../src/life.js';
const id='381b4dbd-5e89-4cd7-9a61-5d0c339b0cf2',other='c0779408-a4dc-4c40-92a7-6c9bc04af079';
const [x,z]=planPoint(507,620),base={id,title:'Birthday',date:'2026-09-13',position:[x,0,z],published:true,mediaPath:`media/${id}/image.jpg`};
test('legacy memories can append photos without losing originals or leaking storage paths',()=>{
 const old=validateRecord(base),path=`media/${id}/${other}.png`,album=validateRecord({...base,addMediaPaths:[path,path]},old);
 assert.deepEqual(recordMediaPaths(album),[base.mediaPath,path]);assert.equal(album.createdAt,old.createdAt);
 const visible=publicRecord(album);assert.equal(visible.media.length,2);assert.ok(!visible.mediaPath&&!visible.mediaPaths);assert.match(visible.media[1].src,/asset=.*\.png/);
 assert.equal(memoryMedia({src:'old.jpg',type:'image'}).length,1);assert.notEqual(memoryAppearance(visible).color,memoryAppearance({src:'a.mp4',type:'video'}).color);
 assert.throws(()=>validateRecord({...base,addMediaPaths:[`media/${other}/image.jpg`]},old));
 assert.throws(()=>validateRecord({...base,addMediaPaths:Array.from({length:31},(_,i)=>`media/${id}/00000000-0000-4000-8000-${String(i).padStart(12,'0')}.jpg`)},old));
 assert.equal(validateRecord({...base,addMediaPaths:[`media/${id}/video.mp4`]},old).type,'video');
 assert.throws(()=>validateMemoryFiles([{name:'movie.mp4',type:'video/mp4',size:100}],{photosOnly:true,existing:1}));
});
test('memory placement moves pins off real furniture and keeps wall clearance in the same room',()=>{
 for(const p of [[440,815],[550,525],[579,331],[996,502],[632,583]]){
  const spot=accessibleMemorySpot(...p);assert.ok(spot,p.join());assert.ok(hasMemoryClearance(spot.position[0],spot.position[2]),p.join());
 }
 assert.equal(accessibleMemorySpot(1,1),null);assert.equal(accessibleMemorySpot(940,490),null,'inaccessible fitted storage');
});
test('date filters include both endpoints and preserve the owner-selected range in a saved game',()=>{
 const memories=[{date:'2025-12-31'},{date:'2026-01-01'},{date:'2026-12-31'},{date:'2027-01-01'},{date:''}];
 const f=cleanMemoryFilter({from:'2026-01-01',to:'2026-12-31'});assert.deepEqual(filterMemories(memories,f),memories.slice(1,3));assert.equal(filterMemories(memories,{...f,includeUndated:true}).length,3);assert.equal(filterMemories(memories,{}).length,5);
 assert.throws(()=>cleanMemoryFilter({from:'2026-02-30'}));assert.throws(()=>cleanMemoryFilter({from:'2027-01-01',to:'2026-01-01'}));
 const s=newLife('Mark');s.memoryFilter=f;s.pets.sunny.food=31;s.pets.sunny.affection=99;const restored=restoreLife(JSON.stringify(s));assert.deepEqual(restored.memoryFilter,f);assert.equal(restored.pets.sunny.food,31);assert.equal(restored.pets.sunny.affection,99);assert.equal(PETS.find(p=>p.id==='sunny').name,'Leo');
 delete s.memoryFilter;assert.equal(restoreLife(JSON.stringify(s)).memoryFilter.from,'','old saves still continue');
});
