import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryVisit} from '../src/memory-visit.js';

const catalog=Array.from({length:24},(_,i)=>({id:String(i),date:i<12?'2024-05-06':'2025-06-07'}));
const ids=items=>items.map(m=>m.id);
const year=y=>({from:`${y}-01-01`,to:`${y}-12-31`});
function randomSequence(){let n=0;return ()=>((n++*7)%29)/29;}

test('visits sample eight eligible floor memories without modifying the library',()=>{
 const memories=[...catalog,{id:'cyrus',petId:'miso',date:'2024-05-06'},{id:'undated'}];
 const visit=createMemoryVisit({random:randomSequence()}),chosen=visit.select(memories,year(2024));
 assert.equal(chosen.length,8);assert.equal(new Set(ids(chosen)).size,8);
 assert.ok(chosen.every(m=>!m.petId&&m.date.startsWith('2024')));
 assert.equal(memories.length,26);assert.deepEqual(memories.slice(0,24),catalog);
});

test('catalog refresh, reordering and metadata edits retain the visit selection',()=>{
 let calls=0;const random=randomSequence(),visit=createMemoryVisit({random:()=>{calls++;return random();}});
 const first=ids(visit.select(catalog,year(2024))),count=calls;
 const updated=catalog.map(m=>({...m,title:'Edited title'})).reverse();
 assert.deepEqual(ids(visit.select(updated,year(2024))),first);assert.equal(calls,count);
 assert.ok(visit.select(updated,year(2024)).every(m=>m.title==='Edited title'));
});

test('new visits and changes to the period draw fresh selections',()=>{
 const visit=createMemoryVisit({random:randomSequence()});
 const first=ids(visit.select(catalog,year(2024)));
 visit.reset();assert.notDeepEqual(ids(visit.select(catalog,year(2024))),first);
 const next=visit.select(catalog,year(2025));assert.ok(next.every(m=>m.date.startsWith('2025')));
 assert.notDeepEqual(ids(visit.select(catalog,year(2024))),first);
});

test('small or empty date ranges and undated memories are handled without fillers',()=>{
 const visit=createMemoryVisit(),memories=[{id:'undated'},{id:'in',date:'2024-03-02'},{id:'out',date:'2025-03-02'}];
 assert.deepEqual(ids(visit.select(memories,year(2024))),['in']);
 assert.deepEqual(new Set(ids(visit.select(memories,{...year(2024),includeUndated:true}))),new Set(['in','undated']));
 assert.deepEqual(visit.select(memories,{from:'2030-01-01'}),[]);
 assert.equal(visit.select(memories).length,3);
});
