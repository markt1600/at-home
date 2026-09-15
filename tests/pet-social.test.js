import test from 'node:test';
import assert from 'node:assert/strict';
import {createHouseModel} from '../scripts/house-model.mjs';
import {PetRoaming} from '../src/pet-roaming.js';
import {PetSocial} from '../src/pet-social.js';
import {PetBone} from '../src/pet-bone.js';
import {PETS,newLife} from '../src/life.js';
import {inWalkableArea} from '../src/navigation.js';
import {floorHeight} from '../src/house-layout.js';

const w=createHouseModel();
function setup(){
 let seed=17;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32),r=new PetRoaming([...w.colliders],random);PETS.forEach(p=>r.register(p.id,p.plan));
 for(const [id,x] of [['sunny',-11.8],['miso',-9]]){const p=r.pets.get(id),n=r.nearest(x,-2.6);Object.assign(p,{x:n.x,y:n.y,z:n.z,wait:10});}
 const s=new PetSocial(r,{random}),player={x:-6.5,y:2.12,z:-2.93};r.player=player;return {r,s,player};
}
function tick({r,s,player},dt=.1){
 const before=s.pair.map(p=>({x:p.x,z:p.z}));r.update(dt,{player});s.update(dt,{player});
 for(const [i,p] of s.pair.entries()){assert.ok(Math.hypot(p.x-before[i].x,p.z-before[i].z)<=p.speed*1.05*dt+.0001,'pets walk to the play spot without teleporting');assert.ok(inWalkableArea(p.x,p.z,true,r.obstacles));assert.equal(p.y,floorHeight(p.x,p.z));}
}
function until(m,predicate,max=500){for(let i=0;i<max&&!predicate();i++)tick(m);assert.ok(predicate(),`state: ${m.s.phase}`);}

test('pets meet along real paths, wait for both films, face each other and return to independent roaming',()=>{
 const m=setup(),{s,r,player}=m;let ready=false;s.ready=()=>ready;assert.ok(s.start(player));
 until(m,()=>s.phase==='ready');assert.ok(s.clear(s.spot.center,player,s.spot.yaw));assert.ok(s.pair.every(p=>p.activity==='play'&&p.socialTime===-1));
 const at=s.pair.map(p=>({x:p.x,z:p.z}));for(let i=0;i<20;i++)tick(m);assert.equal(s.phase,'ready');assert.deepEqual(s.pair.map(p=>({x:p.x,z:p.z})),at);
 ready=true;tick(m);assert.equal(s.phase,'play');assert.ok(s.pair.every(p=>p.socialTime===0));
 const [a,b]=s.pair;assert.ok(Math.abs(Math.cos(a.heading-b.heading)+1)<1e-8);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=.95);
 const paused=JSON.stringify(s.pair),time=s.time;s.update(0,{player});s.update(.1,{player,enabled:false});assert.equal(s.time,time);assert.equal(JSON.stringify(s.pair),paused);
 until(m,()=>!s.active);assert.ok(s.pair.every(p=>!p.social&&!p.command&&p.activity==='idle'));assert.ok(s.cooldown>=75);
 const travel=s.pair.map(p=>p.distance);for(let i=0;i<120;i++)tick(m);assert.ok(s.pair.every((p,i)=>p.distance>travel[i]+.3),'both pets resume their own routes');
 assert.equal(r.pets.get('pebble').social,undefined);
});

test('care, fetch and a new game release both pets, including an unfinished approach',()=>{
 for(const action of ['care','fetch','greet']){
  const m=setup(),{s,r,player}=m,bone=new PetBone(r);bone.bind(newLife());s.canStart=()=>bone.phase==='rest';assert.ok(s.start(player));
  if(action==='care'){until(m,()=>s.phase==='play');r.interact('miso');assert.equal(r.pets.get('miso').wait,15);}
  if(action==='fetch'){bone.place(player);assert.ok(bone.beginPickup(player));assert.equal(bone.phase,'pickup');}
  if(action==='greet')r.greet(player,0);
  assert.equal(s.active,false);assert.ok(s.pair.every(p=>!p.social&&!p.command));
 }
});

test('blocked space, an unavailable film and route stalls cancel safely; sleep and nighttime prevent automatic play',()=>{
 for(const reason of ['space','film','route']){
  const m=setup(),{s,r,player}=m;if(reason==='film')s.ready=()=>false;assert.ok(s.start(player));
  if(reason==='space'){r.obstacles.push({x:s.spot.center.x,z:s.spot.center.z,w:.3,d:.3,movable:true});for(let i=0;i<6;i++)s.update(.1,{player});}
  if(reason==='film')until(m,()=>!s.active,600);
  if(reason==='route')for(let i=0;i<351;i++)s.update(.1,{player});
  assert.equal(s.active,false,reason);assert.ok(s.pair.every(p=>!p.social&&!p.command));
 }
 const m=setup();m.r.pets.get('miso').activity='sleep';assert.equal(m.s.start(m.player),false);m.r.pets.get('miso').activity='idle';m.s.cooldown=0;m.s.update(.1,{player:m.player,hours:23});assert.equal(m.s.active,false);
 m.s.cooldown=0;m.s.update(.1,{player:m.player,hours:12});assert.equal(m.s.phase,'approach');
 const blocked=m.s.spot.center;m.s.update(.6,{player:{x:blocked.x,y:floorHeight(blocked.x,blocked.z)+1.67,z:blocked.z}});for(let i=0;i<5;i++)m.s.update(.1,{player:{x:blocked.x,y:floorHeight(blocked.x,blocked.z)+1.67,z:blocked.z}});assert.equal(m.s.active,false);
});
