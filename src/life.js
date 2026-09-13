import {cleanMemoryFilter} from './memory-filter.js';
export const SAVE_KEY='at-home-save-v1';
export const cleanName=value=>String(value||'').normalize('NFKC').replace(/[\p{C}<>]/gu,'').trim().slice(0,28)||'Friend';
export const NEIGHBORS=[
 {id:'ken',name:'Ken',detail:'A neighbor who loves cooking',hour:9,height:1.75,greeting:'I made a little extra breakfast. It is lovely to see you.',topics:[['How is your day?','I took the long way home through the garden. The frangipani is blooming again.'],['What are you cooking?','Ginger rice and a big pot of vegetables. Good food is even better when there is enough to share.'],['Stay for tea','That sounds wonderful. I can stay for a little while.']]},
 {id:'nia',name:'Nia',detail:'Your plant-loving neighbor',hour:13,height:1.68,greeting:'Hello! I was passing by and thought I would say hi. How is your afternoon?',topics:[['Tell me something nice','A tiny new leaf opened on my monstera this morning. Some days, that is quite enough.'],['Any plant advice?','I like to check the soil before watering. Every plant has its own rhythm.'],['Stay for tea','I would love that. It is good to slow down together.']]},
 {id:'june',name:'June',detail:'A friend with a book to recommend',hour:17,height:1.63,greeting:'Good evening. The light in your living room is beautiful at this time of day.',topics:[['What are you reading?','A collection of short stories about ordinary lives. I keep finding little things that feel familiar.'],['How was your day?','A walk, a good lunch, and a conversation with a friend. A very good day, really.'],['Stay for tea','Just one cup would be lovely. Thank you for having me.']]}
];
export const PETS=[{id:'miso',name:'Miso',kind:'Cat',food:'a bowl of cat food',play:'a feather toy',height:.40,plan:[429,678]}, {id:'sunny',name:'Leo',kind:'English cream dachshund',food:'a bowl of dog food',play:'a favorite soft ball',height:.40,plan:[472,681]}, {id:'pebble',name:'Pebble',kind:'Tortoise',food:'fresh leafy greens',play:'a gentle enrichment moment',height:.20,plan:[350,851]}];
export const ACTIVITIES={tea:{title:'Make a cup of tea',room:'kitchen',text:'The kettle settles. You take a slow sip of warm tea.'},record:{title:'Put on a record',room:'living',text:'A gentle melody fills the living room.'},plants:{title:'Tend the plants',room:'balcony',text:'You check the leaves and water the plants that need it.'},book:{title:'Read a few pages',room:'bedroom',text:'You settle into a story and let the world wait for a moment.'},view:{title:'Watch the sky',room:'balcony',text:'You pause by the balcony and watch the changing light.'}};
export const newLife=(name='')=>({version:1,name:cleanName(name),hours:7.25,pace:1,personalized:true,memoryFilter:{from:'',to:'',includeUndated:false},visits:[],pending:null,guests:[],journal:[],pets:Object.fromEntries(PETS.map(p=>[p.id,{food:80,water:85,affection:75}]))});
const bounded=(n,min,max,fallback)=>Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
export function restoreLife(raw){
 try{const s=typeof raw==='string'?JSON.parse(raw):raw;if(!s||s.version!==1)return null;const n=newLife(s.name);n.hours=bounded(s.hours,0,240000,7.25);n.pace=[0,.5,1,2].includes(s.pace)?s.pace:1;n.personalized=s.personalized!==false;try{n.memoryFilter=cleanMemoryFilter(s.memoryFilter);}catch{}
 n.visits=Array.isArray(s.visits)?s.visits.filter(x=>typeof x==='string').slice(-18):[];n.pending=NEIGHBORS.some(p=>p.id===s.pending)?s.pending:null;
 n.guests=Array.isArray(s.guests)?s.guests.filter(g=>NEIGHBORS.some(p=>p.id===g.id)&&Number.isFinite(g.until)&&g.until>n.hours).slice(0,3):[];
 n.journal=Array.isArray(s.journal)?s.journal.filter(x=>typeof x.text==='string'&&Number.isFinite(x.hours)).slice(-60):[];
 for(const p of PETS)for(const key of ['food','water','affection'])n.pets[p.id][key]=bounded(s.pets?.[p.id]?.[key],20,100,n.pets[p.id][key]);return n;}catch{return null;}
}
export const timeOfDay=hours=>((hours%24)+24)%24;
export const dayNumber=hours=>Math.floor(hours/24)+1;
export function clockLabel(hours){const h=timeOfDay(hours),m=Math.floor(h*60);return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
export function dayPhase(hours){const h=timeOfDay(hours);return h<6?'Before sunrise':h<8?'Morning light':h<12?'A quiet morning':h<16?'An easy afternoon':h<19?'Golden hour':h<21?'A gentle evening':'A peaceful night';}
export function remember(s,text){s.journal.push({hours:s.hours,text});s.journal=s.journal.slice(-60);}
export function advanceLife(s,seconds){
 const before=s.hours,delta=Math.max(0,Math.min(seconds,5))*.02*s.pace;s.hours+=delta;
 const events=[];for(const p of PETS){const n=s.pets[p.id];n.food=Math.max(20,n.food-delta*2.2);n.water=Math.max(20,n.water-delta*2.8);n.affection=Math.max(20,n.affection-delta*1.5);}
 for(const g of s.guests)if(g.until<=s.hours)events.push({type:'left',id:g.id});s.guests=s.guests.filter(g=>g.until>s.hours);
 if(!s.pending){const day=Math.floor(s.hours/24);for(const n of NEIGHBORS){const at=day*24+n.hour,key=`${day}:${n.id}`;if(before<=at&&s.hours>=at&&!s.visits.includes(key)&&!s.guests.some(g=>g.id===n.id)){s.pending=n.id;s.visits.push(key);events.push({type:'arrival',id:n.id});break;}}}
 s.visits=s.visits.slice(-18);return events;
}
export function invite(s){if(!s.pending)return null;const id=s.pending;s.pending=null;s.guests=s.guests.filter(g=>g.id!==id);s.guests.push({id,until:s.hours+2.5});remember(s,`${NEIGHBORS.find(n=>n.id===id).name} came in for tea.`);return id;}
export function careForPet(s,id,action){const p=PETS.find(p=>p.id===id);if(!p||!['food','water','affection'].includes(action))return null;s.pets[id][action]=100;const text=action==='food'?`You give ${p.name} ${p.food}.`:action==='water'?`You refresh ${p.name}’s water.`:`You spend a little time with ${p.name} and ${p.play}.`;remember(s,text);return text;}
export function restUntil(s,hour){const now=timeOfDay(s.hours);s.hours+=((hour-now+24)%24)||24;s.pending=null;s.guests=[];remember(s,hour===6?'You wake to a new sunrise.':'You take a break and return for the evening light.');}
export function contextForVoice(s,room='living'){return JSON.stringify({game:'At Home',tone:'Warm, positive, relaxing home-life game. Safe and welcoming.',player_name:s.name,day:dayNumber(s.hours),time:clockLabel(s.hours),room,neighbor_at_door:s.pending?NEIGHBORS.find(n=>n.id===s.pending).name:null,visiting_neighbors:s.guests.map(g=>NEIGHBORS.find(n=>n.id===g.id).name),pets:PETS.map(p=>({name:p.name,kind:p.kind,needs:s.pets[p.id]})),recent_moments:s.journal.slice(-4).map(j=>j.text),rules:'Only describe people and events present in this context. You cannot change game state. Never invent danger, intruders, surveillance or frightening events. Acknowledge uncertainty. Pet care is fictional gameplay, not veterinary advice.'});}
