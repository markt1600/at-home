import {floorHeight} from './house-layout.js';
import {inWalkableArea,moveAlongFloor} from './navigation.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const ids=['sunny','miso'];
const loopSeconds=124/24;

// A brief shared activity owns both routes. Care, fetch and a new greeting can
// interrupt it; neither pet remains reserved after an abandoned approach.
export class PetSocial{
 constructor(roaming,{random=Math.random,canStart=()=>true,ready=()=>true}={}){
  this.roaming=roaming;roaming.social=this;this.random=random;this.canStart=canStart;this.ready=ready;this.phase='idle';this.cooldown=40+random()*20;this.time=0;
 }
 get active(){return this.phase!=='idle';}
 get pair(){return ids.map(id=>this.roaming.pets.get(id));}
 clear(center,player,yaw=0){
  const r=this.roaming,y=floorHeight(center.x,center.z);
  if(!inWalkableArea(center.x,center.z,true,r.obstacles))return false;
  if(player&&Math.abs(player.y-1.67-y)<.5&&distance(center,player)<1.35)return false;
  for(const pet of r.pets.values())if(!ids.includes(pet.id)&&Math.abs(pet.y-y)<.3&&distance(center,pet)<1.3)return false;
  for(let i=0;i<16;i++){
   const along=Math.cos(i*Math.PI/8)*1.02,across=Math.sin(i*Math.PI/8)*.43;
   const x=center.x+Math.sin(yaw)*along+Math.cos(yaw)*across,z=center.z+Math.cos(yaw)*along-Math.sin(yaw)*across;
   if(!inWalkableArea(x,z,true,r.obstacles)||Math.abs(floorHeight(x,z)-y)>.025)return false;
   const m=moveAlongFloor(center.x,center.z,x-center.x,z-center.z,r.obstacles);
   if(Math.hypot(m.x-x,m.z-z)>.01)return false;
  }
  return true;
 }
 findSpot(player){
  const [leo,cyrus]=this.pair,r=this.roaming;if(!leo||!cyrus||distance(leo,cyrus)>6)return null;
  const middle={x:(leo.x+cyrus.x)/2,z:(leo.z+cyrus.z)/2},yaw=Math.atan2(cyrus.x-leo.x,cyrus.z-leo.z);
  const nearby=[...r.nodes.values()].filter(n=>Math.min(Math.abs(n.y-leo.y),Math.abs(n.y-cyrus.y))<.025&&distance(n,middle)<2.5&&r.restingSpot(n)).sort((a,b)=>distance(a,middle)-distance(b,middle));
  // Candidate spacing avoids repeating the expensive clearance check for
  // adjacent 20 cm navigation nodes.
  const tried=[];
  for(const center of nearby){
   if(tried.some(n=>distance(n,center)<.5))continue;tried.push(center);if(tried.length>24)break;
   for(const angle of [yaw,yaw+Math.PI/2]){
    if(!this.clear(center,player,angle))continue;
    const x=Math.sin(angle)*.54,z=Math.cos(angle)*.54,a=r.nearest(center.x-x,center.z-z),b=r.nearest(center.x+x,center.z+z);
    if(distance(a,b)<.95||distance(a,b)>1.25||!r.restingSpot(a)||!r.restingSpot(b)||distance(a,leo)>5||distance(b,cyrus)>5)continue;
    const actual={x:(a.x+b.x)/2,z:(a.z+b.z)/2},facing=Math.atan2(b.x-a.x,b.z-a.z);
    if(Math.abs(a.y-b.y)>.025||!this.clear(actual,player,facing))continue;
    return {center:actual,a,b,yaw:facing};
   }
  }
  return null;
 }
 start(player){
  if(this.active||!this.canStart()||this.pair.some(p=>!p||p.greeting||p.command||p.social||['sleep','chew'].includes(p.activity)))return false;
  const spot=this.findSpot(player);if(!spot)return false;const r=this.roaming;
  if(!r.command('sunny',spot.a,1.05)){r.release('sunny',3);return false;}
  if(!r.command('miso',spot.b,1.05)){r.release('sunny',3);r.release('miso',3);return false;}
  for(const p of this.pair){p.social=true;p.command.social=true;}
  this.spot=spot;this.phase='approach';this.time=0;this.checkIn=.5;return true;
 }
 cancel(){
  for(const p of this.pair)if(p?.social){p.social=false;p.socialTime=null;this.roaming.release(p.id,3+this.random()*3);}
  this.phase='idle';this.time=0;this.spot=null;this.cooldown=75+this.random()*75;
 }
 reset(){this.cancel();this.cooldown=40+this.random()*20;}
 update(dt,{player=null,hours=12,enabled=true}={}){
  if(!enabled||dt<=0)return;dt=Math.min(dt,.1);
  if(!this.active){
   this.cooldown-=dt;if(this.cooldown>0)return;
   const hour=hours%24;if(hour<6||hour>=21||!this.start(player))this.cooldown=4+this.random()*4;
   return;
  }
  this.time+=dt;this.checkIn-=dt;
  if(!this.canStart()||this.pair.some(p=>!p?.social)){this.cancel();return;}
  if(this.checkIn<=0){this.checkIn=.5;if(!this.clear(this.spot.center,player,this.spot.yaw)){this.cancel();return;}}
  if(this.phase==='approach'){
   if(this.time>35||this.pair.some(p=>!p.command?.social)){this.cancel();return;}
   if(!this.pair.every(p=>p.arrived))return;
   this.phase='ready';this.time=0;
   for(const p of this.pair){this.roaming.release(p.id,999,true);p.activity='play';p.socialTime=-1;}
  }
  if(this.phase==='ready'||this.phase==='play'){
   const [a,b]=this.pair;
   a.heading=Math.atan2(b.x-a.x,b.z-a.z);b.heading=Math.atan2(a.x-b.x,a.z-b.z);
   if(this.phase==='ready'){
    if(ids.every(id=>this.ready(id))){this.phase='play';this.time=0;this.duration=loopSeconds*(this.random()<.5?2:3);}
    else if(this.time>12){this.cancel();return;}
   }
   if(this.phase==='play'){
    for(const p of this.pair)p.socialTime=this.time;
    if(this.time>=this.duration)this.cancel();
   }
  }
 }
}
