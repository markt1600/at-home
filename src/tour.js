import {HOUSE_ROOMS,HOUSE_VIEWS,pointInPolygon} from './house-layout.js';
import {PETS,timeOfDay} from './life.js';
import {WALKERS,TRICKS} from './pet-days.js';
import {intersectsFootprint} from './navigation.js';

// Tour mode: the house plays itself. A walker follows the same clear-floor grid
// the pets use, through the game's own movement (so steps, stairs, head bob and
// footsteps are the real ones), and does what a visitor would: looks around,
// sits with the animals, relives memories, puts a record on. Nothing here is
// scripted in order; every choice, pace, pause and glance is drawn at random.
const turn=a=>Math.atan2(Math.sin(a),Math.cos(a));
const roomAt=(x,z)=>HOUSE_ROOMS.find(r=>pointInPolygon(x,z,r.polygon))?.id;
const between=(random,lo,hi)=>lo+random()*(hi-lo);
const pick=(random,list)=>list[Math.floor(random()*list.length)];

export function nearestNode(nodes,x,z,y=null,clear=()=>true){
 let best=null,distance=Infinity;
 for(const n of nodes.values()){if(y!==null&&Math.abs(n.y-y)>.55||!clear(n))continue;const d=(n.x-x)**2+(n.z-z)**2;if(d<distance){distance=d;best=n;}}
 return best;
}
// Shortest route over the walkable grid. Neighbours are visited in a shuffled
// order, so two walks between the same rooms rarely trace the same line.
export function pathBetween(nodes,start,goal,random=Math.random,clear=()=>true){
 if(!start||!goal)return null;if(start===goal)return [];
 const parents=new Map([[start.key,null]]),queue=[start];
 for(let i=0;i<queue.length;i++){
  const links=[...queue[i].links];for(let k=links.length-1;k>0;k--){const j=Math.floor(random()*(k+1));[links[k],links[j]]=[links[j],links[k]];}
  for(const key of links){if(parents.has(key)||key!==goal.key&&!clear(nodes.get(key)))continue;parents.set(key,queue[i].key);if(key===goal.key){const path=[];for(let at=key;at!==start.key;at=parents.get(at))path.unshift(nodes.get(at));return path;}queue.push(nodes.get(key));}
 }
 return null;
}
// What to do next: weighted chance, never the same kind twice in a row.
export function chooseActivity(options,last,random=Math.random){
 const open=options.filter(o=>o.weight>0&&o.kind!==last),pool=open.length?open:options.filter(o=>o.weight>0);
 let roll=random()*pool.reduce((n,o)=>n+o.weight,0);
 for(const option of pool){roll-=option.weight;if(roll<=0)return option;}
 return pool.at(-1)||null;
}
const VIEWS=['hall','corridor','cabinet_hall','living','dining','kitchen','study','bedroom_window','bedroom','wardrobe','vanity','sunroom','balcony','dining_balcony','guest','wine','records','board'];
const RITUALS={tea:'kitchen',plants:'balcony',view:'dining_balcony',book:'bedroom'};
const FIXTURES=['hallway-candle','fridge','kitchen-stove','massage-chair','leo-bone'];

export class Tour{
 constructor(host,{random=Math.random}={}){this.host=host;this.world=host.world;this.random=random;this.running=false;this.script=null;this.last=null;this.time=0;this.gaze=null;this.glance={until:0,next:4,offset:0};this.petTurn=0;}
 get nodes(){return this.world.petRoaming.nodes;}
 // The grid is laid out around fixed furniture; chairs that can be nudged and the fridge door are checked as they stand now.
 clear=n=>!this.world.petRoaming.dynamicObstacles.some(c=>intersectsFootprint(n.x,n.z,c));
 route(goal){return pathBetween(this.nodes,this.here(),goal,this.random,this.clear);}
 start(){
  if(this.running)return;this.running=true;this.script=null;this.last=null;this.gaze=null;this.clock=performance.now();
  const loop=now=>{if(!this.running)return;const dt=Math.min(.1,Math.max(0,(now-this.clock)/1000));this.clock=now;if(!document.hidden)this.step(dt);this.frame=requestAnimationFrame(loop);};
  this.frame=requestAnimationFrame(loop);
 }
 stop(){if(!this.running)return;this.running=false;cancelAnimationFrame(this.frame);this.settle();this.script=null;}
 // Leave everything as a player would find it.
 settle(){
  const w=this.world,h=this.host;w.touchMove={x:0,z:0};w.eyeHeight=1.67;this.gaze=null;
  if(w.telescope.active)h.leaveTelescope();if(w.massage.active)w.massage.cancel();if(w.cinema.active)h.stopCinema();if(h.panel())h.closePanel();
 }
 step(dt){
  this.dt=dt;this.time+=dt;
  if(!this.script){this.script=this.plan();this.spent=0;}
  try{if(this.script.next().done)this.script=null;}catch(error){console.warn('Tour activity ended early:',error);this.settle();this.script=null;}
  this.spent+=dt;if(this.script&&this.spent>300){this.settle();this.script=null;}   // nothing may hold the tour up for good
  this.look(dt);
 }
 // The eyes ease toward where attention is, with a little drift so the view is never locked still.
 look(dt){
  const w=this.world;if(!this.gaze||w.paused||w.telescope.active||w.massage.active||w.handInteraction.active)return;
  const sway=Math.sin(this.time*.43+1.7)*.035,nod=Math.sin(this.time*.31)*.018,ease=1-Math.exp(-(this.gaze.quick?5:2.6)*dt);
  w.yaw+=turn(this.gaze.yaw+sway-w.yaw)*ease;w.pitch+=(Math.max(-1.1,Math.min(.9,this.gaze.pitch+nod))-w.pitch)*ease;
 }
 lookAt(point,quick=false){const p=this.world.camera.position,dx=point.x-p.x,dy=point.y-p.y,dz=point.z-p.z;this.gaze={yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz)),quick};}
 feet(){const w=this.world;return w.feet||{x:w.camera.position.x,y:w.camera.position.y-1.67,z:w.camera.position.z};}
 here(){const f=this.feet();return nearestNode(this.nodes,f.x,f.z,f.y,this.clear)||nearestNode(this.nodes,f.x,f.z);}
 place(node){const w=this.world;w.camera.position.set(node.x,node.y+1.67,node.z);w.feet={x:node.x,y:node.y,z:node.z,vy:0,grounded:true};}

 *wait(seconds,each){for(let t=0;t<seconds;t+=this.dt){each?.(t);yield;}}
 *until(test,limit,each){for(let t=0;t<limit&&!test();t+=this.dt){each?.(t);yield;}return test();}
 // Stand and take a place in: a few unhurried looks to either side.
 *lookAround(seconds,base=this.world.yaw,pitch=-.06){
  let next=0,yaw=base;
  yield* this.wait(seconds,t=>{if(t>=next){yaw=base+between(this.random,-.9,.9);next=t+between(this.random,1.6,3.6);}this.gaze={yaw,pitch:pitch+Math.sin(t*.5)*.04};});
 }
 *walkTo(goal){
  const w=this.world;if(!goal)return false;
  if(!this.clear(goal))return false;
  let path=this.route(goal);
  if(!path)return false;
  const pace=between(this.random,.46,.7);let i=0,stalled=0,tries=0,from={...this.feet()},pause=this.random()<.2?Math.floor(path.length*between(this.random,.3,.7)):-1;
  while(i<path.length){
   yield;
   if(w.paused||w.handInteraction.active||w.massage.active){w.touchMove={x:0,z:0};continue;}
   const f=this.feet();while(i<path.length&&Math.hypot(path[i].x-f.x,path[i].z-f.z)<(i===path.length-1?.14:.26))i++;
   if(i>=path.length)break;
   const next=path[i],ahead=path[Math.min(i+3,path.length-1)],dx=next.x-f.x,dz=next.z-f.z,d=Math.hypot(dx,dz)||1;
   // Head for the next step, look further along the way, and glance about now and then.
   if(this.time>this.glance.next){this.glance={until:this.time+between(this.random,.9,1.9),next:this.time+between(this.random,4,10),offset:between(this.random,.35,.85)*(this.random()<.5?-1:1)};}
   const glance=this.time<this.glance.until?this.glance.offset:0;
   this.gaze={yaw:Math.atan2(-(ahead.x-f.x),-(ahead.z-f.z))+glance,pitch:-.07+(ahead.y-f.y)*.12};
   const slow=i>path.length-4?.75:1,c=Math.cos(w.yaw),s=Math.sin(w.yaw),ux=dx/d,uz=dz/d;
   w.touchMove={x:(ux*c-uz*s)*pace*slow,z:(ux*s+uz*c)*pace*slow};
   // Blocked by a pet or a nudged chair: find another way (never a jump, which could land on
   // the furniture), and after a few tries step past the spot.
   stalled+=this.dt;
   if(stalled>1.3){
    if(Math.hypot(f.x-from.x,f.z-from.z)>.12){stalled=0;from={...f};}
    else if(++tries<4){const again=this.route(goal);if(again){path=again;i=0;}stalled=0;}
    else{const next=path.slice(i).find(this.clear);if(!next)break;this.place(next);tries=0;stalled=0;}
   }
   if(i===pause){pause=-1;w.touchMove={x:0,z:0};yield* this.lookAround(between(this.random,1.5,3.5));}
  }
  w.touchMove={x:0,z:0};return true;
 }
 // A clear place to stand near something, on the same floor.
 standNear(point,near=.9,far=1.6,floor=null){
  const here=this.feet(),options=[];
  for(const n of this.nodes.values()){const d=Math.hypot(n.x-point.x,n.z-point.z);if(d<near||d>far||n.links.length<3||!this.clear(n))continue;if(floor!==null&&Math.abs(n.y-floor)>.45)continue;options.push(n);}
  options.sort((a,b)=>Math.hypot(a.x-here.x,a.z-here.z)-Math.hypot(b.x-here.x,b.z-here.z));
  return options.length?pick(this.random,options.slice(0,Math.min(4,options.length))):null;
 }
 viewNode(name){const v=HOUSE_VIEWS[name];return v?{node:nearestNode(this.nodes,v[0],v[2],v[1]-1.67,this.clear)||nearestNode(this.nodes,v[0],v[2],null,this.clear),yaw:v[3],pitch:v[4]}:null;}

 *plan(){
  const h=this.host,w=this.world,hour=timeOfDay(h.state().hours),night=hour>=22.5||hour<5,memories=h.memories().filter(m=>!m.petId);
  yield* this.wait(between(this.random,.4,2.2));
  const choice=chooseActivity([
   {kind:'view',weight:3},{kind:'wander',weight:2.4},{kind:'pet',weight:night?2:4.2},{kind:'memory',weight:memories.length?3:0},
   {kind:'fixture',weight:1.4},{kind:'ritual',weight:night?.4:1.2},{kind:'music',weight:h.musicPlaying()?.35:1},{kind:'cinema',weight:h.canScreen()?.6:0},
   {kind:'telescope',weight:.5},{kind:'rest',weight:hour>=23||hour<4.5?2.2:0}
  ],this.last,this.random);
  this.last=choice.kind;w.eyeHeight=1.67;
  yield* this[choice.kind](memories);
  w.eyeHeight=1.67;
 }
 // An authored viewpoint: walk there and take in the view it was made for.
 *view(){
  const view=this.viewNode(pick(this.random,VIEWS));if(!view?.node)return;
  yield* this.walkTo(view.node);
  const seconds=between(this.random,4,10),drift=between(this.random,-.25,.25);
  yield* this.wait(seconds,t=>{this.gaze={yaw:view.yaw+drift*t/seconds,pitch:view.pitch};});
  if(this.random()<.4)yield* this.lookAround(between(this.random,3,6),view.yaw,view.pitch);
 }
 *wander(){
  const here=this.feet(),options=[...this.nodes.values()].filter(n=>{const d=Math.hypot(n.x-here.x,n.z-here.z);return d>3&&d<15&&n.links.length===4&&this.clear(n);});
  if(!options.length)return;
  yield* this.walkTo(pick(this.random,options));yield* this.lookAround(between(this.random,3,9));
 }
 *pet(){
  const h=this.host,w=this.world,order=['sunny','miso','pebble','mops'],id=this.random()<.75?order[this.petTurn++%order.length]:pick(this.random,order),spec=PETS.find(p=>p.id===id);
  const where=()=>id==='mops'?w.mops?.group.position:w.petRoaming.pets.get(id);
  if(!where())return;
  // Pets move: head for where they are, and correct once if they have wandered on.
  for(let attempt=0;attempt<2;attempt++){
   const p=where(),spot=this.standNear(p,id==='mops'?1.0:1.15,id==='mops'?2.2:1.8,id==='mops'?null:p.y);if(!spot)return;
   yield* this.walkTo(spot);if(Math.hypot(where().x-this.feet().x,where().z-this.feet().z)<2.6)break;
  }
  const eye=()=>{const p=where();return {x:p.x,y:(id==='mops'?p.y:p.y+spec.height*.55),z:p.z};},crouch=id==='mops'?1.67:between(this.random,.85,1.15);
  const watch=()=>{w.eyeHeight=crouch;this.lookAt(eye());};
  yield* this.wait(between(this.random,4,9),watch);
  const roll=this.random(),near=()=>Math.hypot(where().x-this.feet().x,where().z-this.feet().z)<3.2;
  if(id==='mops'){if(roll<.6&&near()){h.care('mops',this.random()<.5?'pet':'talk');yield* this.wait(between(this.random,4,7),watch);}return;}
  if(roll<.38&&near()){h.care(id,h.neediest(id));yield* this.wait(between(this.random,5,9),watch);}
  else if(roll<.62&&near()&&TRICKS[id]){h.trick(id,pick(this.random,TRICKS[id]).id);yield* this.wait(between(this.random,5,8),watch);}
  else if(roll<.74&&WALKERS.includes(id)&&h.rain()<.3&&timeOfDay(h.state().hours)>6.5&&timeOfDay(h.state().hours)<21&&h.startWalk(id)){
   const balcony=[...this.nodes.values()].filter(n=>['balcony','dining_bay'].includes(roomAt(n.x,n.z))&&n.links.length===4&&this.clear(n));
   w.eyeHeight=1.67;yield* this.walkTo(pick(this.random,balcony));
   yield* this.until(()=>!h.walking(),75,t=>{if(Math.floor(t/5)%2)this.lookAt(eye());else this.gaze={yaw:Math.PI/2+Math.sin(t*.2)*.5,pitch:.02};});
   if(h.walking())h.endWalk();
  }
  yield* this.wait(between(this.random,2,6),watch);
 }
 *memory(memories){
  const m=pick(this.random,memories),marker={x:m.position[0],y:m.position[1],z:m.position[2]},spot=this.standNear(marker,.35,.95,marker.y);if(!spot)return;
  yield* this.walkTo(spot);
  yield* this.wait(between(this.random,1.4,2.6),()=>this.lookAt({...marker,y:marker.y+.03},true));
  yield* this.relive(m);
 }
 // Sit through a memory the way someone would: every photo, or the film to its end.
 *relive(m,open=false){
  const h=this.host;if(!open&&!h.openMemory(m.id))return;   // openMemory(id) opens it; openMemory() names the one already open
  const items=m.media?.length||1,video=m.type==='video';
  let seconds=video?75:Math.min(80,Math.max(8,items*2.2+between(this.random,2,6)));
  yield* this.wait(3);
  const film=video&&document.querySelector('#memory-player');if(film&&Number.isFinite(film.duration))seconds=Math.min(170,film.duration+1.5)-3;
  yield* this.until(()=>h.panel()!=='memory'||!!film?.ended&&items===1,seconds);
  if(h.panel()==='memory')h.closePanel();yield* this.wait(between(this.random,1,2.5));
 }
 *fixture(){
  const w=this.world,h=this.host,frames=[...w.houseInteractions.items.keys()].filter(id=>id.startsWith('memory-frame-'));
  const ids=[...FIXTURES,...frames].filter(id=>{const item=w.houseInteractions.items.get(id);return item&&(id==='leo-bone'||!item.available||item.available());});
  if(!ids.length)return;
  const id=pick(this.random,ids),item=w.houseInteractions.items.get(id),spot=this.standNear(item.pos,.75,1.5)||this.standNear(item.pos,.5,2.2);if(!spot)return;
  yield* this.walkTo(spot);
  const aimed=yield* this.until(()=>w.lookTarget===id,3,()=>this.lookAt(item.pos,true));
  if(!aimed||(item.available&&!item.available()))return;
  h.activate(id);const busy=()=>w.handInteraction.active;
  if(id.startsWith('memory-frame-')){yield* this.wait(1);const m=h.panel()==='memory'&&h.openMemory();if(m)yield* this.relive(m,true);else if(h.panel())h.closePanel();return;}
  if(id==='massage-chair'){yield* this.wait(2);yield* this.until(()=>!w.massage.active,50);return;}
  yield* this.wait(1);yield* this.until(()=>!busy(),25);
  if(id==='fridge'||id==='kitchen-stove'){yield* this.wait(between(this.random,4,8),()=>this.lookAt(item.pos));if(w.lookTarget===id){h.activate(id);yield* this.until(()=>!busy(),15);}}
  else if(id==='leo-bone'){const leo=()=>w.petRoaming.pets.get('sunny');yield* this.wait(between(this.random,10,16),()=>{const p=leo();if(p)this.lookAt({x:p.x,y:p.y+.25,z:p.z});});}
  else yield* this.wait(between(this.random,4,8),()=>this.lookAt(item.pos));
 }
 *ritual(){
  const key=pick(this.random,Object.keys(RITUALS)),view=this.viewNode(RITUALS[key]);if(!view?.node)return;
  yield* this.walkTo(view.node);yield* this.wait(1.5,()=>{this.gaze={yaw:view.yaw,pitch:view.pitch};});
  this.host.ritual(key);yield* this.lookAround(between(this.random,6,12),view.yaw,view.pitch);
 }
 *music(){
  const w=this.world,h=this.host,view=this.viewNode('turntable');if(!view?.node)return;
  yield* this.walkTo(view.node);
  const aimed=yield* this.until(()=>w.lookTarget==='turntable',3.5,()=>{this.gaze={yaw:view.yaw,pitch:view.pitch,quick:true};});
  if(aimed)h.activate('turntable');else h.toggleRecord();
  yield* this.wait(1.5);yield* this.until(()=>!w.handInteraction.active&&!w.turntable.busy,25);
  yield* this.wait(between(this.random,3,7),()=>{this.gaze={yaw:view.yaw,pitch:view.pitch+.25};});
 }
 *cinema(){
  const w=this.world,h=this.host,view=this.viewNode('theatre');if(!view?.node)return;
  yield* this.walkTo(view.node);
  const screen=w.cinema.face.getWorldPosition(w.camera.position.clone()),face=()=>this.lookAt(screen);
  yield* this.wait(2,face);if(!h.startCinema())return;
  yield* this.wait(6,face);yield* this.until(()=>!w.cinema.active,between(this.random,70,130),face);
  if(w.cinema.active)h.stopCinema();yield* this.wait(between(this.random,2,4));
 }
 *telescope(){
  const w=this.world,h=this.host,scope=w.windowLounge?.telescope;if(!scope)return;
  const eyepiece=scope.position.clone();eyepiece.y+=1.49;eyepiece.z+=.54;
  const spot=this.standNear(eyepiece,.9,1.9);if(!spot)return;
  yield* this.walkTo(spot);
  const aimed=yield* this.until(()=>w.lookTarget==='telescope',3.5,()=>this.lookAt(eyepiece,true));if(!aimed)return;
  h.activate('telescope');yield* this.wait(1);if(!w.telescope.active)return;
  let dx=between(this.random,-14,14),dy=between(this.random,-5,5),change=0;
  yield* this.wait(between(this.random,16,30),t=>{if(t>change){dx=between(this.random,-16,16);dy=between(this.random,-6,6);change=t+between(this.random,2.5,5);}w.telescope.pan(dx*this.dt,dy*this.dt);});
  h.leaveTelescope();
 }
 *rest(){
  const view=this.viewNode('bedroom');if(!view?.node)return;
  yield* this.walkTo(view.node);yield* this.lookAround(between(this.random,4,7),view.yaw,view.pitch);
  this.host.rest();yield* this.wait(3);
 }
}
