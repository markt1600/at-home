import test from 'node:test';
import assert from 'node:assert/strict';
import {createHouseModel} from '../scripts/house-model.mjs';
import {PetRoaming} from '../src/pet-roaming.js';
import {PetBone} from '../src/pet-bone.js';
import {PETS,newLife,restoreLife} from '../src/life.js';
import {floorHeight,HOUSE_VIEWS} from '../src/house-layout.js';
import {inWalkableArea} from '../src/navigation.js';

function setup(){let seed=19;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32),w=createHouseModel(),r=new PetRoaming(w.colliders,random);for(const spec of PETS)r.register(spec.id,spec.plan);const state=newLife(),messages=[],bone=new PetBone(r,{random,onMessage:m=>messages.push(m)});bone.bind(state);return {w,r,state,bone,messages};}
function tick(s,player,seconds){for(let i=0;i<seconds*10;i++){s.r.update(.1,{player});s.bone.update(.1,player);const p=s.r.pets.get('sunny');assert.ok(inWalkableArea(p.x,p.z,true,s.w.colliders),'Leo crossed an obstacle');}}
function openThrow(s){const [x,y,z]=HOUSE_VIEWS.living,player={x,y,z};s.bone.place(player);for(const direction of [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}])if(s.bone.landing(player,direction))return {player,direction};throw Error('No open throw');}

test('bone position survives Continue and old/corrupt saves get a safe default',()=>{
 const s=setup(),n=[...s.r.nodes.values()].find(n=>n.y===.45&&n.links.length===4);s.bone.place(n);s.bone.persist();const restored=restoreLife(JSON.stringify(s.state));assert.deepEqual(restored.bone,{x:n.x,z:n.z});s.bone.bind(restored);assert.equal(s.bone.x,n.x);assert.equal(s.bone.phase,'rest');
 assert.equal(restoreLife({...newLife(),bone:{x:Infinity,z:0}}).bone,null);assert.equal(restoreLife({version:1}).bone,null);
 s.bone.bind({...newLife(),bone:{x:80,z:80}});assert.ok(inWalkableArea(s.bone.x,s.bone.z,true,s.w.colliders));
});
test('throw, chase, return and drop completes; throwing twice and throwing out of reach are blocked',()=>{
 const s=setup(),{player,direction}=openThrow(s);assert.ok(s.bone.throw(player,direction));assert.equal(s.bone.throw(player,direction),false);
 const phases=new Set();for(let i=0;i<900;i++){tick(s,player,.1);phases.add(s.bone.phase);if(s.messages.some(m=>m.includes('at your feet')))break;}
 assert.ok(phases.has('chase'));assert.ok(phases.has('return'));assert.equal(s.bone.phase,'rest');assert.ok(Math.hypot(s.bone.x-player.x,s.bone.z-player.z)<1.05);assert.ok(s.messages.some(m=>m.includes('at your feet')));
 assert.deepEqual(s.state.bone,{x:s.bone.x,z:s.bone.z});assert.equal(s.bone.throw({...player,x:player.x+6},direction),false);
 assert.ok(s.bone.throw(player,direction),'bone can be thrown again');
});
test('fetch pauses and Leo follows the player to a new accessible position',()=>{
 const s=setup(),{player,direction}=openThrow(s);s.bone.throw(player,direction);const before=JSON.stringify(s.state);s.bone.update(0,player);assert.equal(JSON.stringify(s.state),before);
 for(let i=0;i<700&&s.bone.phase!=='return';i++)tick(s,player,.1);assert.equal(s.bone.phase,'return');
 const next=s.r.nearest(player.x+direction.x*1.5,player.z+direction.z*1.5);Object.assign(player,{x:next.x,z:next.z,y:next.y+1.67});
 for(let i=0;i<1000&&!s.messages.some(m=>m.includes('at your feet'));i++)tick(s,player,.1);
 assert.ok(s.messages.some(m=>m.includes('at your feet')));assert.ok(Math.hypot(s.bone.x-player.x,s.bone.z-player.z)<1.05);
});
test('Leo seeks his one saved bone to chew, then goes back to his routine',()=>{
 const s=setup(),p=s.r.pets.get('sunny'),player={x:p.x+5,y:p.y+1.67,z:p.z};s.bone.idle=0;let chewed=false;
 for(let i=0;i<700;i++){tick(s,player,.1);if(s.bone.phase==='chew'){chewed=true;assert.equal(p.activity,'chew');break;}}
 assert.ok(chewed);tick(s,player,19);assert.equal(s.bone.phase,'rest');assert.equal(p.command,null);
});
test('Cyrus sometimes grooms and rests belly-out by a real wall, away from doorways',()=>{
 const s=setup(),p=s.r.pets.get('miso'),wallSpots=[...s.r.nodes.values()].filter(n=>s.r.wallRest(n));assert.ok(wallSpots.length>10);
 let groom=false,lounge=false;for(let i=0;i<14000;i++){s.r.update(.1);if(p.activity==='groom')groom=true;if(p.activity==='lounge'){lounge=true;const n=s.r.nearest(p.x,p.z);assert.ok(s.r.wallRest(n));assert.ok(s.r.restingSpot(n));assert.ok(Number.isFinite(p.heading));}if(groom&&lounge)break;}
 assert.ok(groom,'grooming chosen');assert.ok(lounge,'upright wall sit chosen');
});
