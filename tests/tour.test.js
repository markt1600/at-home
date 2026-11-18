import test from 'node:test';
import assert from 'node:assert/strict';
import {createHouseModel} from '../scripts/house-model.mjs';
import {PetRoaming} from '../src/pet-roaming.js';
import {PETS,newLife} from '../src/life.js';
import {Tour,pathBetween,nearestNode,chooseActivity} from '../src/tour.js';
import {moveWithJump,inWalkableArea} from '../src/navigation.js';
import {HOUSE_ROOMS,HOUSE_VIEWS,pointInPolygon,planPoint} from '../src/house-layout.js';

const seeded=seed=>()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
const roomAt=(x,z)=>HOUSE_ROOMS.find(r=>pointInPolygon(x,z,r.polygon))?.id;
function house(seed=11){
 const model=createHouseModel(),random=seeded(seed),roaming=new PetRoaming(model.colliders,seeded(seed+1));
 for(const spec of PETS.filter(p=>!p.stationary))roaming.register(spec.id,spec.plan);
 return {model,roaming,random};
}

test('routes follow linked, walkable floor between any two rooms and vary from walk to walk',()=>{
 const {roaming,random}=house(),nodes=roaming.nodes;
 const at=name=>nearestNode(nodes,HOUSE_VIEWS[name][0],HOUSE_VIEWS[name][2]);
 for(const [from,to] of [['living','bedroom'],['kitchen','balcony'],['guest','dining'],['study','sunroom'],['hall','wine']]){
  const start=at(from),goal=at(to),path=pathBetween(nodes,start,goal,random);
  assert.ok(path?.length>5,`${from} → ${to}`);assert.equal(path.at(-1),goal);
  let previous=start;for(const node of path){assert.ok(previous.links.includes(node.key),'each step is a linked neighbour');previous=node;}
 }
 const a=pathBetween(nodes,at('living'),at('bedroom'),seeded(1)),b=pathBetween(nodes,at('living'),at('bedroom'),seeded(2));
 assert.equal(a.length,b.length,'always a shortest route');assert.notDeepEqual(a.map(n=>n.key),b.map(n=>n.key),'but not always the same one');
 assert.deepEqual(pathBetween(nodes,at('living'),at('living')),[]);assert.equal(pathBetween(nodes,at('living'),{key:'nowhere',links:[]}),null);
});

test('the next activity is a weighted draw that never repeats the last kind',()=>{
 const options=[{kind:'view',weight:3},{kind:'pet',weight:4},{kind:'memory',weight:0},{kind:'music',weight:1}],random=seeded(5),counts={};let last=null;
 for(let i=0;i<4000;i++){const c=chooseActivity(options,last,random);assert.notEqual(c.kind,last);assert.notEqual(c.kind,'memory','nothing with no weight is chosen');counts[c.kind]=(counts[c.kind]||0)+1;last=c.kind;}
 assert.ok(counts.pet>counts.view&&counts.view>counts.music,'likelier things happen more often');
 assert.equal(chooseActivity([{kind:'view',weight:1}],'view',random).kind,'view','with one thing to do, it is done again');assert.equal(chooseActivity([],null,random),null);
});

test('a simulated half hour of tour: it walks through the real house, keeps to the floor, and does a mix of things',()=>{
 const {model,roaming,random}=house(23),state=newLife(),log=[],memory={id:'m1',type:'image',media:[{},{}],position:[...planPoint(507,620)].toSpliced(1,0,0)};
 const start=nearestNode(roaming.nodes,HOUSE_VIEWS.living[0],HOUSE_VIEWS.living[2]);
 const position={x:start.x,y:start.y+1.67,z:start.z,set(x,y,z){this.x=x;this.y=y;this.z=z;},clone(){return {...this};}};
 let panel=null,walking=false;
 const world={petRoaming:roaming,camera:{position},feet:{x:start.x,y:start.y,z:start.z,vy:0,grounded:true},yaw:0,pitch:0,touchMove:{x:0,z:0},eyeHeight:1.67,paused:false,lookTarget:null,
  telescope:{active:false},massage:{active:false,cancel(){}},handInteraction:{active:false},cinema:{active:false},turntable:{busy:false},houseInteractions:{items:new Map()},mops:{group:{position:{x:planPoint(609.5,354)[0],y:1.3,z:planPoint(609.5,354)[1]}}}};
 const host={world,state:()=>state,panel:()=>panel,closePanel:()=>{panel=null;world.paused=false;log.push('closed');},toast(){},memories:()=>[memory],
  openMemory:id=>{if(id===undefined)return memory;panel='memory';world.paused=true;log.push('memory');return true;},neediest:()=>'food',care:(id,action)=>log.push(`care:${id}:${action}`),trick:(id,t)=>log.push(`trick:${id}:${t}`),
  startWalk:id=>{walking=true;log.push('walk:'+id);return true;},walking:()=>walking,endWalk:()=>{walking=false;},activate:id=>log.push('activate:'+id),toggleRecord:()=>log.push('record'),musicPlaying:()=>log.filter(x=>x==='record').length%2===1,
  canScreen:()=>false,startCinema:()=>false,stopCinema(){},leaveTelescope(){},rain:()=>0,ritual:key=>log.push('ritual:'+key),rest:()=>log.push('rest')};
 const tour=new Tour(host,{random}),kinds=new Map(),rooms=new Set(),plan=tour.plan.bind(tour);let placed=0,travelled=0,blocked=0,longestBlock=0;
 const place=tour.place.bind(tour);tour.place=node=>{placed++;place(node);};
 globalThis.document??={querySelector:()=>null};globalThis.cancelAnimationFrame??=()=>{};
 const dt=.05;
 for(let step=0;step<36000;step++){
  const before=tour.last;tour.step(dt);if(tour.last!==before||step===0)kinds.set(tour.last,(kinds.get(tour.last)||0)+1);
  if(walking&&random()<.004)walking=false;   // the balcony walk completes at some point
  // The game's own movement, as in scene.js.
  if(!world.paused){
   const c=Math.cos(world.yaw),s=Math.sin(world.yaw),vx=world.touchMove.x*c+world.touchMove.z*s,vz=-world.touchMove.x*s+world.touchMove.z*c,pushing=Math.hypot(vx,vz)>.05;
   const moved=moveWithJump(world.feet,vx*dt*1.9,vz*dt*1.9,dt,model.colliders,!!world.jumpQueued);world.jumpQueued=false;world.feet=moved;position.set(moved.x,moved.y+world.eyeHeight,moved.z);
   travelled+=moved.distance||0;blocked=pushing&&(moved.distance||0)<.002?blocked+dt:0;longestBlock=Math.max(longestBlock,blocked);
   assert.ok(inWalkableArea(moved.x,moved.z,true,model.colliders),`left the floor at step ${step}`);
   assert.ok(Math.hypot(world.touchMove.x,world.touchMove.z)<=.75,'an unhurried walking pace');
   rooms.add(roomAt(moved.x,moved.z));
  }
  roaming.update(dt,{player:position});
  assert.ok(Number.isFinite(world.yaw)&&Number.isFinite(world.pitch)&&Math.abs(world.pitch)<1.2);
 }
 assert.ok(travelled>250,`walked ${travelled.toFixed(0)} m in half an hour`);assert.ok(rooms.size>=8,`visited ${rooms.size} rooms: ${[...rooms].join(', ')}`);
 assert.ok(kinds.size>=6,`did ${kinds.size} kinds of thing: ${[...kinds.keys()].join(', ')}`);
 assert.ok(placed<=3,`needed rescuing ${placed} times`);assert.ok(longestBlock<8,`never pushed against something for long (${longestBlock.toFixed(1)} s)`);
 assert.ok(log.includes('memory')&&log.filter(x=>x==='memory').length===log.filter(x=>x==='closed').length,'every memory opened was closed again');
 assert.ok(log.some(x=>x.startsWith('care:'))&&log.some(x=>x.startsWith('trick:'))&&log.some(x=>x.startsWith('ritual:')),'pets were cared for and taught, and a ritual was kept');
 // Two tours never play out alike.
 assert.notDeepEqual([...kinds.keys()],[],'');const other=new Tour(host,{random:seeded(99)});other.step(dt);for(let i=0;i<200;i++)other.step(dt);assert.ok(other.last);
 // Stopping hands the house back cleanly, whatever was in progress.
 panel='memory';world.touchMove={x:.4,z:.4};tour.running=true;tour.stop();assert.equal(panel,null);assert.deepEqual(world.touchMove,{x:0,z:0});assert.equal(world.eyeHeight,1.67);
});
