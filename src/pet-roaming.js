import {HOUSE_ROOMS,HOUSE_VIEWS,planPoint,floorHeight} from './house-layout.js';
import {inWalkableArea,moveAlongFloor,intersectsFootprint} from './navigation.js';
import {INTERIOR_WALLS} from './house-architecture.js';

// Paths follow the same furniture footprints and stair limits as the player.
export class PetRoaming{
 constructor(obstacles,random=Math.random){this.obstacles=obstacles;this.dynamicObstacles=obstacles.filter(c=>c.wall==='fridge-door'||c.movable);const fixed=obstacles.filter(c=>!c.movable);this.random=random;this.step=.20;this.nodes=new Map();this.pets=new Map();
  const points=HOUSE_ROOMS.flatMap(r=>r.polygon),xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
  for(let i=Math.ceil(Math.min(...xs)/this.step);i<=Math.floor(Math.max(...xs)/this.step);i++)for(let j=Math.ceil(Math.min(...zs)/this.step);j<=Math.floor(Math.max(...zs)/this.step);j++){
   const x=i*this.step,z=j*this.step;if(inWalkableArea(x,z,true,fixed))this.nodes.set(`${i},${j}`,{key:`${i},${j}`,i,j,x,z,y:floorHeight(x,z),links:[]});
  }
  for(const n of this.nodes.values())for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const next=this.nodes.get(`${n.i+di},${n.j+dj}`);if(!next)continue;const moved=moveAlongFloor(n.x,n.z,next.x-n.x,next.z-n.z,fixed);if(Math.hypot(moved.x-next.x,moved.z-next.z)<.001)n.links.push(next.key);}
 }
 nearest(x,z){let found,distance=Infinity;for(const n of this.nodes.values()){const d=(n.x-x)**2+(n.z-z)**2;if(d<distance&&!this.dynamicObstacles.some(c=>intersectsFootprint(n.x,n.z,c))){distance=d;found=n;}}return found;}
 restingSpot(n){return n.resting??=(n.links.length>=3&&!INTERIOR_WALLS.some(w=>w.openings?.some(o=>['door','front','sliding'].includes(o.kind)&&Math.hypot(n.x-planPoint(...o.center)[0],n.z-planPoint(...o.center)[1])<.85)));}
 register(id,plan){if(this.pets.has(id))return this.pets.get(id);const [x,z]=planPoint(...plan),n=this.nearest(x,z);const p={id,x:n.x,z:n.z,y:n.y,home:n.key,path:[],wait:1+this.random()*4,moving:false,activity:'idle',distance:0,vx:0,vz:0,speed:id==='pebble'?.075:id==='sunny'?.42:.34};this.pets.set(id,p);return p;}
 interact(id){const p=this.pets.get(id);if(p){p.greeting=null;p.path=[];p.wait=15;p.moving=false;p.activity='idle';}}
 greet(player,yaw=0){
  for(const [i,id] of ['sunny','miso'].entries()){
   const p=this.pets.get(id);if(!p)continue;const home=this.nodes.get(p.home);Object.assign(p,{x:home.x,y:home.y,z:home.z,path:[],wait:i*.7,blocked:0,moving:false,activity:'idle'});
   p.greeting={remaining:60,side:i?1:-1,yaw,player:{x:player.x,z:player.z}};this.route(p);
  }
 }
 route(p){
  const others=[...this.pets.values()].filter(o=>o!==p);
  const clear=n=>!this.dynamicObstacles.some(c=>intersectsFootprint(n.x,n.z,c))&&others.every(o=>Math.abs(n.y-o.y)>.4||Math.hypot(n.x-o.x,n.z-o.z)>=Math.min(.53,Math.hypot(p.x-o.x,p.z-o.z)-.005))&&(!this.player||Math.abs(n.y-(this.player.y-1.67))>.5||Math.hypot(n.x-this.player.x,n.z-this.player.z)>=Math.min(.78,Math.hypot(p.x-this.player.x,p.z-this.player.z)-.005));
  const start=[...this.nodes.values()].filter(n=>Math.hypot(n.x-p.x,n.z-p.z)<.45&&clear(n)).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z)).find(n=>{const m=moveAlongFloor(p.x,p.z,n.x-p.x,n.z-p.z,this.obstacles);return Math.hypot(m.x-n.x,m.z-n.z)<.001;});if(!start){p.wait=.5;return;}const parents=new Map([[start.key,null]]),queue=[start];
  for(let i=0;i<queue.length;i++)for(const key of queue[i].links)if(!parents.has(key)&&clear(this.nodes.get(key))){parents.set(key,queue[i].key);queue.push(this.nodes.get(key));}
  const home=this.nodes.get(p.home),max=p.id==='pebble'?3.2:12,choices=queue.filter(n=>Math.hypot(n.x-p.x,n.z-p.z)>1&&Math.hypot(n.x-p.x,n.z-p.z)<max&&this.restingSpot(n));
  let dest;
  if(p.greeting){
   const {player,yaw,side}=p.greeting,x=player.x-Math.sin(yaw)*1.15+Math.cos(yaw)*side*.55,z=player.z-Math.cos(yaw)*1.15-Math.sin(yaw)*side*.55,y=floorHeight(player.x,player.z);
   const nearby=queue.filter(n=>Math.abs(n.y-y)<.22&&Math.hypot(n.x-player.x,n.z-player.z)>=.9&&Math.hypot(n.x-player.x,n.z-player.z)<1.8);
   dest=nearby.sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0];
   if(!dest){p.greeting=null;p.wait=4;return;}
  }else dest=this.random()<.2&&parents.has(home.key)&&this.restingSpot(home)&&Math.hypot(home.x-p.x,home.z-p.z)>.5?home:choices[Math.floor(this.random()*choices.length)];if(!dest){p.wait=.6;return;}
  const path=[];for(let key=dest.key;key!==start.key;key=parents.get(key))path.unshift(this.nodes.get(key));if(Math.hypot(start.x-p.x,start.z-p.z)>.002)path.unshift(start);p.path=path;
 }
 update(dt,{enabled=true,player=null,hours=12,canWalk=()=>true}={}){
  if(!enabled||dt<=0)return;dt=Math.min(dt,.1);this.player=player;
  for(const p of this.pets.values()){
   p.moving=false;p.vx=p.vz=0;
   if(p.greeting){p.greeting.remaining-=dt;if(p.greeting.remaining<=0)p.greeting=null;else if(player&&Math.hypot(player.x-p.greeting.player.x,player.z-p.greeting.player.z)>.7){p.greeting.player={x:player.x,z:player.z};p.path=[];this.route(p);}}
   if(player&&p.greeting&&Math.hypot(p.x-player.x,p.z-player.z)<.72){p.greeting=null;p.path=[];p.wait=10;}
   if(p.wait>0){p.wait-=dt;continue;}p.activity='idle';if(!canWalk(p.id))continue;if(!p.path.length)this.route(p);const next=p.path[0];if(!next)continue;
   const d=Math.hypot(next.x-p.x,next.z-p.z);if(d<.002){p.path.shift();continue;}const step=Math.min(d,p.speed*(p.greeting?1.3:1)*dt),x=p.x+(next.x-p.x)/d*step,z=p.z+(next.z-p.z)/d*step;
   const approachingPlayer=player&&Math.hypot(x-player.x,z-player.z)<.72&&Math.hypot(x-player.x,z-player.z)<Math.hypot(p.x-player.x,p.z-player.z)-.0001;
   if(approachingPlayer||[...this.pets.values()].some(other=>other!==p&&Math.abs(p.y-other.y)<.4&&Math.hypot(x-other.x,z-other.z)<.46&&Math.hypot(x-other.x,z-other.z)<Math.hypot(p.x-other.x,p.z-other.z)-.0001)){
    p.blocked=(p.blocked||0)+dt;if(p.blocked>.65){p.path=[];this.route(p);p.wait=.2+this.random()*.6;p.blocked=0;}continue;
   }
   const moved=moveAlongFloor(p.x,p.z,x-p.x,z-p.z,this.obstacles);if(moved.distance<.00001){p.path=[];p.wait=.3;continue;}p.vx=(moved.x-p.x)/dt;p.vz=(moved.z-p.z)/dt;p.distance+=moved.distance;p.x=moved.x;p.z=moved.z;p.y=floorHeight(p.x,p.z);p.moving=moved.distance>0;p.activity=p.moving?'walk':'idle';p.blocked=0;
   if(Math.hypot(next.x-p.x,next.z-p.z)<.002){p.path.shift();if(!p.path.length){const night=hours%24<6||hours%24>21,sleep=!p.greeting&&(night||this.random()<.35);p.wait=(p.greeting?15:sleep?25:4)+this.random()*(sleep?25:10);p.activity=sleep?'sleep':'idle';p.greeting=null;}}
  }
 }
 viewpoint(id){const p=this.pets.get(id);if(!p)return null;const nearby=[...this.nodes.values()].filter(n=>Math.abs(n.y-p.y)<.2&&Math.hypot(n.x-p.x,n.z-p.z)>1&&Math.hypot(n.x-p.x,n.z-p.z)<1.6);return nearby.find(n=>{const m=moveAlongFloor(n.x,n.z,p.x-n.x,p.z-n.z,this.obstacles);return Math.hypot(m.x-p.x,m.z-p.z)<.01;})||this.nearest(...HOUSE_VIEWS.living.filter((_,i)=>i===0||i===2));}
}
