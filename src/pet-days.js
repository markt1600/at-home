import {HOUSE_ROOMS,planPoint,pointInPolygon} from './house-layout.js';
import {PETS,dayNumber} from './life.js';

// Three small things to do with the pets beyond their bowls: a walk out to a
// balcony together, teaching a trick over a few short lessons, and finding
// where each pet has chosen to spend today.
export const TRICKS={
 sunny:[{id:'sit',name:'Sit'},{id:'spin',name:'Spin'},{id:'paw',name:'Give a paw'}],
 miso:[{id:'come',name:'Come when called'},{id:'five',name:'High five'}],
 pebble:[{id:'leaf',name:'Follow the leaf'}]
};
export const LESSONS=3,LESSON_REST_MS=40000,WALK_TOGETHER_SECONDS=15,BALCONIES=['balcony','dining_bay'];
export const WALKERS=['sunny','miso'];
const PLACES={
 doors:{plan:[340,622],label:'the bright patch by the balcony doors'},
 rug:{plan:[455,655],label:'the floor beside the coffee table'},
 dining:{plan:[345,775],label:'the quiet corner of the dining room'},
 kitchen:{plan:[585,800],label:'the warm kitchen floor'},
 entrance:{plan:[700,690],label:'the entrance, keeping an eye on the door'},
 cellar:{plan:[632,583],label:'the hallway by the wine cellar'},
 sideboard:{plan:[400,850],label:'the floor by the blue sideboard'}
};
export const FAVOURITE_PLACES={sunny:['doors','rug','dining','kitchen','entrance','cellar'],miso:['doors','rug','kitchen','entrance','cellar'],pebble:['dining','sideboard']};
const pick=(seed,n)=>{const x=Math.sin(seed*91.7+13.3)*43758.5453;return Math.floor((x-Math.floor(x))*n);};
// One place per pet per day of the game; never the same place two days running.
// Days are dealt in shuffled rounds of every place, and a round that would open
// with the place the last one closed on swaps its first two days.
function round(id,number,n){
 const order=Array.from({length:n},(_,i)=>i);
 for(let i=n-1;i>0;i--){const j=pick(number*31+i*7+id.charCodeAt(0),i+1);[order[i],order[j]]=[order[j],order[i]];}
 return order;
}
export function favouriteSpot(id,day){
 const ids=FAVOURITE_PLACES[id];if(!ids)return null;
 const n=ids.length,d=Math.max(0,day-1);let i;
 if(n<3)i=d%n;
 else{const number=Math.floor(d/n),order=round(id,number,n);if(number>0&&order[0]===round(id,number-1,n)[n-1])[order[0],order[1]]=[order[1],order[0]];i=order[d%n];}
 return {id:ids[i],...PLACES[ids[i]]};
}
export function cleanPetDays(input){
 const out={tricks:{},lastLesson:{},found:{day:0,ids:[]},walks:{day:0,ids:[]}};
 for(const [id,list] of Object.entries(TRICKS)){
  out.tricks[id]={};for(const trick of list){const n=Number(input?.tricks?.[id]?.[trick.id]);out.tricks[id][trick.id]=Number.isInteger(n)?Math.max(0,Math.min(LESSONS,n)):0;}
  const last=Number(input?.lastLesson?.[id]);out.lastLesson[id]=Number.isFinite(last)&&last>0?last:0;
 }
 for(const key of ['found','walks']){const day=Number(input?.[key]?.day);if(Number.isInteger(day)&&day>0)out[key]={day,ids:[...new Set((input[key].ids||[]).filter(id=>Object.hasOwn(TRICKS,id)))]};}
 return out;
}
const today=(record,day)=>record.day===day?record:{day,ids:[]};
export const trickLearnt=(state,id,trick)=>state.petDays.tricks[id]?.[trick]>=LESSONS;
// A lesson moves a trick one step on; a learnt trick can be asked for at any time.
export function practiseTrick(state,id,trickId,now=Date.now()){
 const pet=PETS.find(p=>p.id===id),trick=TRICKS[id]?.find(t=>t.id===trickId);if(!pet||!trick)return null;
 const days=state.petDays,progress=days.tricks[id][trickId];
 if(progress>=LESSONS){state.pets[id].affection=Math.min(100,state.pets[id].affection+8);return {learnt:true,performed:true,message:`${pet.name} does “${trick.name}” and looks very pleased about it.`};}
 const rest=LESSON_REST_MS-(now-days.lastLesson[id]);
 if(rest>0)return {resting:true,seconds:Math.ceil(rest/1000),message:`${pet.name} needs a short rest before the next lesson. Try again in about ${Math.ceil(rest/1000)} seconds.`};
 days.tricks[id][trickId]=progress+1;days.lastLesson[id]=now;state.pets[id].affection=Math.min(100,state.pets[id].affection+12);
 const step=progress+1,learnt=step>=LESSONS;
 const message=learnt?`${pet.name} has learnt “${trick.name}”!`:step===1?`${pet.name} watches closely and tries “${trick.name}”. Not quite, but it is a start.`:`${pet.name} nearly has “${trick.name}”. One more lesson should do it.`;
 return {learnt,performed:true,lesson:step,message,journal:learnt?`${pet.name} learnt a new trick: ${trick.name}.`:null};
}
export function markFound(state,id){const day=dayNumber(state.hours),record=today(state.petDays.found,day);if(record.ids.includes(id))return false;record.ids.push(id);state.petDays.found=record;state.pets[id].affection=Math.min(100,state.pets[id].affection+15);return true;}
export const foundToday=(state,id)=>today(state.petDays.found,dayNumber(state.hours)).ids.includes(id);
export function markWalked(state,id){const day=dayNumber(state.hours),record=today(state.petDays.walks,day);if(!record.ids.includes(id))record.ids.push(id);state.petDays.walks=record;state.pets[id].affection=100;}
export const walkedToday=(state,id)=>today(state.petDays.walks,dayNumber(state.hours)).ids.includes(id);
const roomAt=(x,z)=>HOUSE_ROOMS.find(r=>pointInPolygon(x,z,r.polygon))?.id;

// Drives the pets through the roaming system's own commands, so every step
// still follows clear floor, stairs and doors.
export class PetDays{
 constructor(roaming,{random=Math.random,onFound=()=>{},onWalk=()=>{}}={}){this.roaming=roaming;this.random=random;this.onFound=onFound;this.onWalk=onWalk;this.visits=new Map();this.acts=new Map();this.walk=null;}
 reset(){if(this.walk)this.roaming.release(this.walk.id,2);for(const [id,v] of this.visits)if(v.going&&this.roaming.pets.get(id)?.command===v.command)this.roaming.release(id,2);this.visits.clear();this.acts.clear();this.walk=null;}
 node(plan){const [x,z]=planPoint(...plan);return this.roaming.nearest(x,z);}
 // A short, happy performance on the spot: the play film and two little hops.
 perform(id,seconds=4){const p=this.roaming.pets.get(id);if(!p||this.walk?.id===id)return false;this.roaming.interact(id);if(p.command)return false;p.wait=seconds+1;p.activity=id==='pebble'?'idle':'play';p.socialTime=0;this.acts.set(id,{t:0,seconds,hops:0});return true;}
 startWalk(id){if(!WALKERS.includes(id)||!this.roaming.pets.has(id))return false;if(this.walk)this.endWalk(false);this.acts.delete(id);const v=this.visits.get(id);if(v)v.going=false;this.walk={id,elapsed:0,together:0,target:null};return true;}
 endWalk(done){const w=this.walk;if(!w)return;this.walk=null;this.roaming.release(w.id,done?14:3);this.onWalk(w.id,done);}
 update(dt,{player,state,busy=()=>false}={}){
  if(dt<=0||!player||!state)return;
  for(const [id,act] of this.acts){
   const p=this.roaming.pets.get(id);act.t+=dt;if(!p){this.acts.delete(id);continue;}
   p.socialTime=act.t;
   if(act.hops<2&&act.t>.35+act.hops*1.3&&!p.hop){p.hop={from:p.y,to:p.y,t:0,duration:.55};act.hops++;}
   if(act.t>=act.seconds){this.acts.delete(id);delete p.socialTime;if(p.activity==='play')p.activity='idle';}
  }
  if(this.walk)this.followPlayer(dt,player);
  const day=dayNumber(state.hours);
  for(const id of Object.keys(FAVOURITE_PLACES)){
   const p=this.roaming.pets.get(id),spot=favouriteSpot(id,day);if(!p||!spot||this.walk?.id===id||this.acts.has(id))continue;
   const node=this.node(spot.plan);if(!node)continue;
   const v=this.visits.get(id)||{next:25+this.random()*50,going:false,elapsed:0,day};this.visits.set(id,v);
   if(v.day!==day){v.day=day;v.next=Math.min(v.next,20);}
   if(v.going){
    v.elapsed+=dt;
    if(p.command!==v.command)v.going=false;   // the bone, a greeting or care took over
    else if(p.arrived){this.roaming.release(id,40+this.random()*25);if(id!=='pebble')p.activity='sleep';v.going=false;v.next=110+this.random()*100;}
    else if(v.elapsed>(id==='pebble'?240:80)){this.roaming.release(id,2);v.going=false;v.next=70;}
   }else{
    v.next-=dt;
    if(v.next<=0){
     if(p.command||p.greeting||p.social||busy(id))v.next=12;
     else if(Math.hypot(p.x-node.x,p.z-node.z)<.7)v.next=90+this.random()*60;
     else if(this.roaming.command(id,node,1)){v.going=true;v.elapsed=0;v.command=p.command;}
     else{this.roaming.release(id,2);v.next=45;}
    }
   }
   // Finding a pet settled in today's place is a small moment of its own.
   if(!foundToday(state,id)&&Math.hypot(p.x-node.x,p.z-node.z)<1.1&&!p.moving&&Math.abs(p.y-(player.y-1.67))<.6&&Math.hypot(p.x-player.x,p.z-player.z)<1.9&&markFound(state,id))this.onFound(id,spot);
  }
 }
 followPlayer(dt,player){
  const w=this.walk,p=this.roaming.pets.get(w.id),feet=player.y-1.67;w.elapsed+=dt;
  if(w.elapsed>240){this.endWalk(false);return;}
  if(!w.target||Math.hypot(player.x-w.target.px,player.z-w.target.pz)>.8||!p.command){
   // Heel: the clear spot about a metre from the player that is nearest the pet.
   // Spots in the player's own room come first, so the pet follows through a doorway.
   let best=null,score=Infinity;const room=roomAt(player.x,player.z);
   for(const n of this.roaming.nodes.values()){const d=Math.hypot(n.x-player.x,n.z-player.z);if(d<.95||d>1.5||Math.abs(n.y-feet)>.3)continue;const s=Math.hypot(n.x-p.x,n.z-p.z)+(roomAt(n.x,n.z)===room?0:4);if(s<score){score=s;best=n;}}
   if(best&&(Math.hypot(best.x-p.x,best.z-p.z)<.25||this.roaming.command(w.id,best,1.35)))w.target={px:player.x,pz:player.z};
   else if(p.command&&!p.path.length)this.roaming.release(w.id,.4);
  }
  const outside=BALCONIES.includes(roomAt(player.x,player.z))&&BALCONIES.includes(roomAt(p.x,p.z))&&Math.hypot(p.x-player.x,p.z-player.z)<3.2;
  w.together=outside?w.together+dt:Math.max(0,w.together-dt*.5);
  if(w.together>=WALK_TOGETHER_SECONDS)this.endWalk(true);
 }
}
