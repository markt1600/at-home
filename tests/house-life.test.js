import test from 'node:test';
import assert from 'node:assert/strict';
import {createHouseModel} from '../scripts/house-model.mjs';
import {PetRoaming} from '../src/pet-roaming.js';
import {PETS,newLife,restoreLife,dayNumber} from '../src/life.js';
import {PetDays,TRICKS,LESSONS,LESSON_REST_MS,favouriteSpot,FAVOURITE_PLACES,cleanPetDays,practiseTrick,foundToday,walkedToday,markWalked,trickLearnt} from '../src/pet-days.js';
import {HOUSE_ROOMS,pointInPolygon,planPoint,floorHeight} from '../src/house-layout.js';
import {dayShower,rainAmount,rainColumns,weatherLabel} from '../src/weather.js';
import {lightingState} from '../src/daylight.js';
import {softLightingEnabled,softLightingChoice,saveSoftLightingChoice} from '../src/post-effects.js';
import {cleanOccasions,todaysOccasions,MAX_OCCASIONS} from '../src/occasions.js';
import {cleanHouseSettings} from '../server/house-settings.js';
import {BUNCH_PLACES,openFloorNear,BALLOON_PALETTES} from '../src/celebrations.js';
import {photoMemoryTitle,photoMemoryPosition,keepPhotoAsMemory} from '../src/photo-memory.js';
import {hasMemoryClearance} from '../src/memory-access.js';
import {essentialPetFilms} from '../src/pet-media.js';
import {AdaptiveResolution} from '../src/render-quality.js';

const roomAt=(x,z)=>HOUSE_ROOMS.find(r=>pointInPolygon(x,z,r.polygon))?.id;
function household(){
 const world=createHouseModel(),roaming=new PetRoaming(world.colliders,(()=>{let n=7;return()=>((n=(n*1664525+1013904223)>>>0)/2**32);})());
 for(const spec of PETS.filter(p=>!p.stationary))roaming.register(spec.id,spec.plan);
 return {world,roaming};
}

test('each pet has one reachable favourite spot a day and goes to rest there',()=>{
 for(const id of Object.keys(FAVOURITE_PLACES)){
  const seen=new Set();for(let day=1;day<=30;day++){const spot=favouriteSpot(id,day);seen.add(spot.id);assert.ok(FAVOURITE_PLACES[id].includes(spot.id));if(day>1)assert.notEqual(spot.id,favouriteSpot(id,day-1).id,'a different place from yesterday');assert.deepEqual(favouriteSpot(id,day),spot,'fixed for the day');}
  assert.equal(seen.size,FAVOURITE_PLACES[id].length,'every place is used');
 }
 const {roaming}=household(),found=[],state=newLife(),days=new PetDays(roaming,{random:()=>0,onFound:(id,spot)=>found.push([id,spot.id])});
 const spot=favouriteSpot('sunny',1),node=days.node(spot.plan),far={x:99,y:1.67,z:99};
 assert.ok(Math.hypot(node.x-planPoint(...spot.plan)[0],node.z-planPoint(...spot.plan)[1])<.6,'the place is on open floor');
 let arrived=false;
 for(let i=0;i<2400&&!arrived;i++){roaming.update(.1,{player:far});days.update(.1,{player:far,state});const p=roaming.pets.get('sunny');arrived=Math.hypot(p.x-node.x,p.z-node.z)<.3&&!p.command;}
 assert.ok(arrived,'Leo walks to today’s spot by himself and is then left to rest');assert.equal(roaming.pets.get('sunny').activity,'sleep');
 assert.deepEqual(found,[],'nothing is found while the player is elsewhere');
 const p=roaming.pets.get('sunny');days.update(.1,{player:{x:p.x+1,y:p.y+1.67,z:p.z},state});
 assert.deepEqual(found,[['sunny',spot.id]]);assert.ok(foundToday(state,'sunny'));
 days.update(.1,{player:{x:p.x+1,y:p.y+1.67,z:p.z},state});assert.equal(found.length,1,'only once a day');
 state.hours+=24;assert.ok(!foundToday(state,'sunny'),'a new day, a new place to find');
});

test('a walk has the pet follow the player and completes after time together on a balcony',()=>{
 const {roaming}=household(),ended=[],state=newLife(),days=new PetDays(roaming,{random:()=>.99,onWalk:(id,done)=>ended.push([id,done])});
 assert.equal(days.startWalk('pebble'),false,'the tortoise stays in');assert.ok(days.startWalk('sunny'));
 // Stand on the living balcony and wait for Leo to come out.
 const balcony=[...roaming.nodes.values()].filter(n=>roomAt(n.x,n.z)==='balcony'),spot=balcony[Math.floor(balcony.length/2)],player={x:spot.x,y:spot.y+1.67,z:spot.z};
 assert.ok(balcony.length>10,'pets can walk on the balcony');
 let steps=0;for(;steps<3000&&!ended.length;steps++){roaming.update(.1,{player});days.update(.1,{player,state});}
 assert.deepEqual(ended,[['sunny',true]],'the walk completes');assert.ok(steps*.1>15,'only after staying out together');
 const leo=roaming.pets.get('sunny');assert.equal(roomAt(leo.x,leo.z),'balcony');assert.ok(Math.hypot(leo.x-player.x,leo.z-player.z)>=.9,'Leo heels beside the player, not on top of them');
 assert.equal(leo.command,null,'Leo is free to roam again');assert.equal(days.walk,null);
 markWalked(state,'sunny');assert.ok(walkedToday(state,'sunny'));assert.equal(state.pets.sunny.affection,100);
 // A walk that never reaches a balcony ends by itself.
 days.startWalk('miso');const indoors={x:roaming.pets.get('miso').x+2,y:1.67,z:roaming.pets.get('miso').z};
 for(let i=0;i<2500&&ended.length<2;i++){roaming.update(.1,{player:indoors});days.update(.1,{player:indoors,state});}
 assert.deepEqual(ended[1],['miso',false]);assert.equal(roaming.pets.get('miso').command,null);
});

test('a trick takes three rested lessons, then can be asked for at any time, and survives saving',()=>{
 const state=newLife();let now=1_000_000;
 const first=practiseTrick(state,'sunny','sit',now);assert.equal(first.lesson,1);assert.ok(first.performed&&!first.learnt);
 const tired=practiseTrick(state,'sunny','spin',now+5000);assert.ok(tired.resting&&!tired.performed,'one lesson at a time, whichever the trick');assert.equal(state.petDays.tricks.sunny.spin,0);
 assert.equal(practiseTrick(state,'miso','five',now+5000).lesson,1,'another pet can learn meanwhile');
 now+=LESSON_REST_MS;assert.equal(practiseTrick(state,'sunny','sit',now).lesson,2);
 now+=LESSON_REST_MS;const done=practiseTrick(state,'sunny','sit',now);assert.ok(done.learnt);assert.match(done.journal,/Leo learnt a new trick: Sit/);assert.ok(trickLearnt(state,'sunny','sit'));
 const asked=practiseTrick(state,'sunny','sit',now+1);assert.ok(asked.learnt&&asked.performed&&!asked.journal,'a learnt trick needs no rest');
 assert.equal(practiseTrick(state,'sunny','fly',now),null);assert.equal(practiseTrick(state,'mops','sit',now),null);
 const restored=restoreLife(JSON.stringify(state));assert.equal(restored.petDays.tricks.sunny.sit,LESSONS);assert.equal(restored.petDays.tricks.miso.five,1);
 assert.deepEqual(cleanPetDays({tricks:{sunny:{sit:99,spin:-4,hack:3}},found:{day:'x',ids:['sunny']},walks:{day:3,ids:['sunny','nobody','sunny']}}),{tricks:{sunny:{sit:3,spin:0,paw:0},miso:{come:0,five:0},pebble:{leaf:0}},lastLesson:{sunny:0,miso:0,pebble:0},found:{day:0,ids:[]},walks:{day:3,ids:['sunny']}});
 assert.ok(restoreLife(JSON.stringify({...newLife(),petDays:undefined})).petDays.tricks.pebble,'older saves gain the new fields');
 // Performing is a short on-the-spot act that hands the pet back afterwards.
 const {roaming}=household(),days=new PetDays(roaming);assert.ok(days.perform('sunny',2));const leo=roaming.pets.get('sunny');assert.equal(leo.activity,'play');
 for(let i=0;i<30;i++)days.update(.1,{player:{x:99,y:1.67,z:99},state});assert.equal(leo.activity,'idle');assert.ok(!('socialTime' in leo));
});

test('rain falls on some days, eases in and out, and never under the roof',()=>{
 assert.equal(dayShower(1),null,'the first day is always clear');
 let wet=0;for(let day=1;day<=400;day++){const s=dayShower(day);if(!s)continue;wet++;assert.ok(s.start>=5&&s.end<=24.01&&s.end-s.start>=1.5&&s.strength>.5&&s.strength<=1);}
 assert.ok(wet>80&&wet<160,`about three days in ten are showery (${wet} of 400)`);
 const day=Array.from({length:60},(_,i)=>i+2).find(d=>dayShower(d)),s=dayShower(day),base=(day-1)*24;
 assert.equal(rainAmount(base+s.start-.1),0);assert.ok(rainAmount(base+s.start+.25)>0&&rainAmount(base+s.start+.25)<s.strength,'eases in');
 assert.ok(Math.abs(rainAmount(base+(s.start+s.end)/2)-s.strength)<1e-9);assert.equal(rainAmount(base+s.end+.1),0);
 for(let h=0;h<24*40;h+=.37){const a=rainAmount(h);assert.ok(a>=0&&a<=1);assert.equal(a,rainAmount(h),'the same hour always has the same weather');}
 const columns=rainColumns(800);assert.equal(columns.length,800);
 for(const [x,z] of columns)assert.ok(!HOUSE_ROOMS.some(r=>pointInPolygon(x,z,r.polygon)),'no rain indoors or on the covered balconies');
 assert.equal(weatherLabel(0),'');assert.equal(weatherLabel(.3),'Light rain');assert.equal(weatherLabel(.9),'Rain');
});

test('light follows the hour: a low warm sun, a cool moon, brighter lamps at night and a softer day in rain',()=>{
 const noon=lightingState(12),dusk=lightingState(17.6),night=lightingState(23),dawn=lightingState(6.4),rainy=lightingState(12,1);
 assert.ok(noon.sun>2&&noon.moon===0);assert.ok(dusk.sun>.8&&dusk.sun<noon.sun,'the evening sun is lower but still lights the rooms');
 assert.ok(dusk.sunColor.b<noon.sunColor.b-.2&&dusk.sunColor.r>.95,'and warmer');assert.ok(dawn.sunColor.b<noon.sunColor.b);
 assert.equal(night.sun,0);assert.ok(night.moon>.2);assert.ok(night.lamps>noon.lamps*2,'lamps carry the night');assert.ok(night.glow>noon.glow);assert.ok(night.fill<noon.fill/4);
 assert.ok(night.fillColor.b>night.fillColor.r,'night fill is cool');assert.ok(night.exposure<noon.exposure);
 assert.ok(rainy.sun<noon.sun*.3&&rainy.fill<noon.fill&&rainy.fogDensity>noon.fogDensity&&rainy.lamps>noon.lamps,'rain dims the sun, thickens the air and brings the lamps up');
 for(let h=0;h<24;h+=.05){const a=lightingState(h),b=lightingState(h+.05);assert.ok(Math.abs(a.sun-b.sun)<.35&&Math.abs(a.fill-b.fill)<.12&&Math.abs(a.lamps-b.lamps)<.1,'no jumps in brightness at '+h.toFixed(2));assert.ok(!(a.sun>0&&a.moon>0),'never sun and moon at once');}
});

test('soft lighting is automatic on computers, off on phones, and steps aside when frames drop',()=>{
 assert.ok(softLightingEnabled('auto',{touch:false}));assert.ok(!softLightingEnabled('auto',{touch:true}));assert.ok(softLightingEnabled('on',{touch:true}));assert.ok(!softLightingEnabled('off'));assert.ok(!softLightingEnabled('auto',{struggling:true}));
 const store={v:null,getItem(){return this.v;},setItem(k,v){this.v=v;}};assert.equal(softLightingChoice(store),'auto');saveSoftLightingChoice('on',store);assert.equal(softLightingChoice(store),'on');saveSoftLightingChoice('ultra',store);assert.equal(softLightingChoice(store),'auto');
 assert.equal(softLightingChoice({getItem(){throw Error('blocked');}}),'auto');
 const quality=new AdaptiveResolution(1.6);const slow=seconds=>{for(let t=0;t<seconds;t+=1/30)quality.update(1/30);};
 slow(4);assert.ok(!quality.struggling,'resolution is lowered first');slow(60);assert.ok(quality.struggling>=2,'only a renderer already at its lowest resolution counts as struggling');
});

test('special days are validated, come round every year and place their balloons on open floor',()=>{
 const penny={name:'Penny’s birthday',month:3,day:9,decoration:'balloons'},leap={name:'Leap day',month:2,day:29,decoration:'gold'};
 assert.deepEqual(cleanOccasions([{...penny,extra:'<script>'}]),[penny]);assert.deepEqual(cleanHouseSettings({occasions:[leap]}),{occasions:[leap]});
 for(const bad of [{...penny,name:' '},{...penny,month:13},{...penny,month:2,day:30},{...penny,day:1.5},{...penny,decoration:'fireworks'}])assert.throws(()=>cleanOccasions([bad]));
 assert.throws(()=>cleanOccasions(Array(MAX_OCCASIONS+1).fill(penny)));assert.throws(()=>cleanOccasions('all of them'));
 assert.equal(cleanOccasions([{...penny,name:'<b>Penny</b>'}])[0].name,'b Penny /b','markup cannot ride in on a name');
 assert.deepEqual(todaysOccasions([penny,leap],new Date(2027,2,9)),[penny]);assert.deepEqual(todaysOccasions([penny,leap],new Date(2027,2,10)),[]);
 assert.deepEqual(todaysOccasions([leap],new Date(2028,1,29)),[leap]);assert.deepEqual(todaysOccasions([leap],new Date(2028,1,28)),[],'in a leap year it waits for the 29th');assert.deepEqual(todaysOccasions([leap],new Date(2027,1,28)),[leap],'otherwise it is kept on the 28th');
 for(const place of BUNCH_PLACES){const spot=openFloorNear(place.room,place.plan);assert.ok(spot,place.room);assert.equal(roomAt(spot[0],spot[2]),place.room);assert.ok(hasMemoryClearance(spot[0],spot[2]),'clear of furniture');assert.equal(spot[1],floorHeight(spot[0],spot[2]));}
 assert.deepEqual(Object.keys(BALLOON_PALETTES).sort(),['balloons','gold','rose']);
});

test('a photo taken in the house is kept as a memory where it was taken',async()=>{
 assert.equal(photoMemoryTitle([{name:'Leo'}],'Living room'),'With Leo in the living room');assert.equal(photoMemoryTitle([{name:'Leo'},{name:'Cyrus'}],'Living balcony'),'With Leo and Cyrus on the living balcony');
 assert.equal(photoMemoryTitle([],'Kitchen'),'A moment in the kitchen');assert.equal(photoMemoryTitle([],''),'A moment at home');assert.equal(photoMemoryTitle([{name:'Leo'}],'Penny’s Room'),'With Leo in Penny’s Room');
 const [x,z]=planPoint(507,620),inRoom=photoMemoryPosition(x,z);assert.ok(Math.hypot(inRoom[0]-x,inRoom[2]-z)<.5);
 const onSofa=photoMemoryPosition(...planPoint(540,560)),outside=photoMemoryPosition(60,60);assert.ok(hasMemoryClearance(onSofa[0],onSofa[2]));assert.ok(roomAt(outside[0],outside[2]),'a view from anywhere still lands on a floor in the house');
 const blob=new Blob(['png-bytes'],{type:'image/png'}),compress=async file=>new File(['jpeg'],'photo.jpg',{type:'image/jpeg'}),today=new Date(2026,10,17,23,30);
 // Not signed in: kept on this device.
 const local=[];const device=await keepPhotoAsMemory(blob,{title:' With Leo ',position:inRoom,today,compress,fetch:async()=>new Response(JSON.stringify({authenticated:false})),addLocal:async(files,placement,title)=>{local.push({files,placement,title});return {id:'local-1'};},saveLocalMetadata:async(id,meta)=>local.push({id,meta})});
 assert.equal(device.where,'device');assert.equal(local[0].title,'With Leo');assert.equal(local[0].files[0].type,'image/jpeg');assert.equal(local[1].meta.date,'2026-11-17','dated by the local calendar day');
 // Signed in: uploaded privately, then recorded as a draft.
 const calls=[];const cloud=await keepPhotoAsMemory(blob,{title:'With Leo',position:inRoom,today,compress,uploadBlob:async(path,file,options)=>calls.push({path,type:file.type,access:options.access}),
  fetch:async(url,options)=>{if(!options?.method)return new Response(JSON.stringify({authenticated:true,storage:true}));const body=JSON.parse(options.body);calls.push(body);return new Response(JSON.stringify({id:body.id}));},addLocal:()=>assert.fail('not saved twice'),saveLocalMetadata:()=>assert.fail()});
 assert.equal(cloud.where,'cloud');assert.match(calls[0].path,/^media\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.jpg$/);assert.equal(calls[0].access,'private');
 assert.equal(calls[1].published,false,'a kept photo starts as a private draft');assert.deepEqual(calls[1].addMediaPaths,[calls[0].path]);assert.equal(calls[1].date,'2026-11-17');assert.deepEqual(calls[1].position,inRoom);
 await assert.rejects(keepPhotoAsMemory(blob,{title:'  ',position:inRoom,compress,fetch:()=>assert.fail('nothing is sent without a title')}),/title/);
 await assert.rejects(keepPhotoAsMemory(blob,{title:'x',position:inRoom,compress,uploadBlob:async()=>{},fetch:async(url,options)=>options?.method?new Response(JSON.stringify({error:'Choose a location inside the house'}),{status:400}):new Response(JSON.stringify({authenticated:true,storage:true})),addLocal:()=>assert.fail('a cloud failure is reported, not hidden')}),/inside the house/);
});

test('only two films per pet are fetched before the house opens',()=>{
 for(const id of ['sunny','miso','pebble']){const films=essentialPetFilms(id);assert.equal(films.length,2);assert.ok(films[1].endsWith('-walk'));}
});
