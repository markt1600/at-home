import {filterMemories} from './memory-filter.js';
import {floorMemories} from './pet-memories.js';

export const VISIT_MEMORY_LIMIT=8;

// Keep a random rank per ID throughout a visit. Reloading catalog objects must
// not reshuffle markers while someone is walking towards one.
// `weight` lets the house favour some memories (an anniversary, the season, ones
// not opened lately) while chance still decides among equals.
export function createMemoryVisit({limit=VISIT_MEMORY_LIMIT,random=Math.random,weight=()=>0}={}){
 const ranks=new Map();let period=null;
 return {
  reset(){ranks.clear();period=null;},
  select(memories,filter={}){
   const key=JSON.stringify([filter.from||'',filter.to||'',filter.includeUndated===true]);
   if(key!==period){ranks.clear();period=key;}
   const eligible=floorMemories(filterMemories(memories,filter));
   for(const memory of eligible)if(!ranks.has(memory.id))ranks.set(memory.id,random()-weight(memory));
   return eligible.slice().sort((a,b)=>ranks.get(a.id)-ranks.get(b.id)||String(a.id).localeCompare(String(b.id))).slice(0,limit);
  }
 };
}
