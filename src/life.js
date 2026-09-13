import {cleanMemoryFilter} from './memory-filter.js';
export const SAVE_KEY='at-home-save-v1';
export const cleanName=value=>String(value||'').normalize('NFKC').replace(/[\p{C}<>]/gu,'').trim().slice(0,28)||'Friend';
export const PETS=[{id:'miso',name:'Cyrus',kind:'Cat',food:'a bowl of cat food',play:'a feather toy',height:.40,plan:[429,678],carePlan:[570,764]}, {id:'sunny',name:'Leo',kind:'English cream dachshund',food:'a bowl of dog food',play:'a favorite soft ball',height:.40,plan:[472,681],carePlan:[570,800]}, {id:'pebble',name:'Pebble',kind:'Tortoise',food:'fresh leafy greens',play:'a gentle enrichment moment',height:.20,plan:[350,851]}];
export const ACTIVITIES={tea:{title:'Make a cup of tea',room:'kitchen',text:'The kettle settles. You take a slow sip of warm tea.'},record:{title:'Put on a record',room:'living',text:'A gentle melody fills the living room.'},plants:{title:'Tend the plants',room:'balcony',text:'You check the leaves and water the plants that need it.'},book:{title:'Read a few pages',room:'bedroom',text:'You settle into a story and let the world wait for a moment.'},view:{title:'Watch the sky',room:'balcony',text:'You pause by the balcony and watch the changing light.'}};
export const newLife=(name='')=>({version:1,name:cleanName(name),hours:7.25,pace:1,personalized:true,memoryFilter:{from:'',to:'',includeUndated:false},journal:[],pets:Object.fromEntries(PETS.map(p=>[p.id,{food:80,water:85,affection:75}]))});
const bounded=(n,min,max,fallback)=>Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
export function restoreLife(raw){
 try{const s=typeof raw==='string'?JSON.parse(raw):raw;if(!s||s.version!==1)return null;const n=newLife(s.name);n.hours=bounded(s.hours,0,240000,7.25);n.pace=[0,.5,1,2].includes(s.pace)?s.pace:1;n.personalized=s.personalized!==false;try{n.memoryFilter=cleanMemoryFilter(s.memoryFilter);}catch{}
 n.journal=Array.isArray(s.journal)?s.journal.filter(x=>typeof x.text==='string'&&Number.isFinite(x.hours)).slice(-60):[];
 for(const p of PETS)for(const key of ['food','water','affection'])n.pets[p.id][key]=bounded(s.pets?.[p.id]?.[key],20,100,n.pets[p.id][key]);return n;}catch{return null;}
}
export const timeOfDay=hours=>((hours%24)+24)%24;
export const dayNumber=hours=>Math.floor(hours/24)+1;
export function clockLabel(hours){const h=timeOfDay(hours),m=Math.floor(h*60);return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
export function dayPhase(hours){const h=timeOfDay(hours);return h<6?'Before sunrise':h<8?'Morning light':h<12?'A quiet morning':h<16?'An easy afternoon':h<19?'Golden hour':h<21?'A gentle evening':'A peaceful night';}
export function remember(s,text){s.journal.push({hours:s.hours,text});s.journal=s.journal.slice(-60);}
export function advanceLife(s,seconds){
 const delta=Math.max(0,Math.min(seconds,5))*.02*s.pace;s.hours+=delta;
 for(const p of PETS){const n=s.pets[p.id];n.food=Math.max(20,n.food-delta*2.2);n.water=Math.max(20,n.water-delta*2.8);n.affection=Math.max(20,n.affection-delta*1.5);}
}
export function careForPet(s,id,action){const p=PETS.find(p=>p.id===id);if(!p||!['food','water','affection'].includes(action))return null;s.pets[id][action]=100;const text=action==='food'?`You give ${p.name} ${p.food}.`:action==='water'?`You refresh ${p.name}’s water.`:`You spend a little time with ${p.name} and ${p.play}.`;remember(s,text);return text;}
export function restUntil(s,hour){const now=timeOfDay(s.hours);s.hours+=((hour-now+24)%24)||24;remember(s,hour===6?'You wake to a new sunrise.':'You take a break and return for the evening light.');}
export function contextForVoice(s,room='living'){return JSON.stringify({game:'At Home',tone:'Warm, positive, relaxing home-life game. Safe and welcoming.',player_name:s.name,day:dayNumber(s.hours),time:clockLabel(s.hours),room,visitor_feature:false,pets:PETS.map(p=>({name:p.name,kind:p.kind,needs:s.pets[p.id]})),recent_moments:s.journal.slice(-4).map(j=>j.text),rules:'Visitors are disabled. Nobody arrives at the door or can be invited into the house. Do not suggest visitor controls or treat past journal entries as current visits. Only describe people and events present in this context. You cannot change game state. Never invent danger, intruders, surveillance or frightening events. Acknowledge uncertainty. Pet care is fictional gameplay, not veterinary advice.'});}
