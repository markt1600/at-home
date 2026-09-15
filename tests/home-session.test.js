import test from 'node:test';
import assert from 'node:assert/strict';
import {HomeSession} from '../src/home-session.js';
import {newLife,restoreLife,SAVE_KEY,advanceLife,careForPet,restUntil} from '../src/life.js';

const storage=()=>({writes:[],setItem(key,value){this.writes.push([key,value]);}});

test('exploring allows pet care and time changes without saving or mutating the regular game',()=>{
 const saved=newLife('Mark');saved.hours=42;saved.bone={x:1,z:2};saved.memoryFilter={from:'2024-01-01',to:'2024-12-31',includeUndated:false};
 const before=structuredClone(saved),session=new HomeSession(saved),disk=storage(),visit=session.startNew(true);
 assert.equal(session.exploring,true);assert.notEqual(visit,saved);
 careForPet(visit,'miso','food');advanceLife(visit,5);restUntil(visit,18);visit.bone={x:3,z:4};
 // The same save policy applies to interaction, periodic, visibility and exit saves.
 for(let i=0;i<4;i++)session.save(disk);
 assert.deepEqual(disk.writes,[]);assert.deepEqual(saved,before);
 assert.equal(session.leave(),saved);assert.equal(session.exploring,false);assert.equal(session.hasSavedGame,true);
 session.save(disk);assert.deepEqual(restoreLife(disk.writes[0][1]),before);
});

test('exploring before the first game never creates a Continue save',()=>{
 const session=new HomeSession(),disk=storage();
 for(let i=0;i<2;i++){const visit=session.startNew(true);careForPet(visit,'sunny','affection');session.save(disk);session.leave();}
 assert.equal(session.hasSavedGame,false);assert.deepEqual(disk.writes,[]);
 const game=session.startNew();assert.equal(session.exploring,false);assert.equal(game.journal.length,0);
 session.save(disk);assert.equal(session.hasSavedGame,true);assert.equal(disk.writes[0][0],SAVE_KEY);
});

test('regular new games and continued games still save normally',()=>{
 const session=new HomeSession(newLife('Mark')),disk=storage();
 session.state.hours=55;session.save(disk);assert.equal(restoreLife(disk.writes[0][1]).hours,55);
 const fresh=session.startNew();assert.equal(fresh.hours,7.25);session.save(disk);
 assert.equal(session.leave(),fresh);assert.equal(restoreLife(disk.writes[1][1]).hours,7.25);
});

test('failed storage writes do not create a saved-game flag',()=>{
 const session=new HomeSession();session.startNew();
 assert.throws(()=>session.save({setItem(){throw Error('Storage full');}}));assert.equal(session.hasSavedGame,false);
});
