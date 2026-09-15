import {floorHeight} from './house-layout.js';
import {inWalkableArea,moveAlongFloor} from './navigation.js';

export function cleanBone(value){return value&&['x','z'].every(k=>Number.isFinite(value[k])&&Math.abs(value[k])<100)?{x:value.x,z:value.z}:null;}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

// The save contains one floor position, never a path, video or transient task.
// Reloading during a throw or return leaves the bone safely at that position.
export class PetBone{
 constructor(roaming,{random=Math.random,onChange=()=>{},onMessage=()=>{}}={}){this.roaming=roaming;this.random=random;this.onChange=onChange;this.onMessage=onMessage;this.phase='rest';this.x=this.z=this.y=0;this.idle=45;this.time=0;}
 bind(life){
  if(this.life===life)return;this.life=life;this.roaming.release('sunny');this.phase='rest';this.idle=45;
  const p=this.roaming.pets.get('sunny');if(!p)return;
  const saved=cleanBone(life.bone),home=this.roaming.nodes.get(p.home),n=saved&&inWalkableArea(saved.x,saved.z,true,this.roaming.obstacles)?saved:this.roaming.nearest(saved?.x??home.x+.65,saved?.z??home.z);
  this.place(n);this.persist();
 }
 place(p){this.x=p.x;this.z=p.z;this.y=floorHeight(p.x,p.z)+.055;}
 persist(notify=false){if(!this.life)return;this.life.bone={x:this.x,z:this.z};if(notify)this.onChange();}
 canThrow(player){return !!this.life&&['rest','chew'].includes(this.phase)&&distance(this,player)<1.8&&Math.abs(floorHeight(player.x,player.z)-floorHeight(this.x,this.z))<.3;}
 beginPickup(player){
  if(!this.canThrow(player))return false;
  this.pickupFloor={x:this.x,z:this.z};this.phase='pickup';this.time=0;this.idle=60;
  this.roaming.release('sunny',12);return true;
 }
 cancelPickup(){if(this.phase!=='pickup')return;this.place(this.pickupFloor);this.phase='rest';this.idle=45;this.roaming.release('sunny',3);this.persist(true);}
 landing(player,direction){
  const len=Math.hypot(direction.x,direction.z);if(len<.01)return null;
  let p={x:player.x,z:player.z};const dx=direction.x/len*.10,dz=direction.z/len*.10;
  for(let i=0;i<40;i++){
   const next=moveAlongFloor(p.x,p.z,dx,dz,this.roaming.obstacles);
   // Stop on collision instead of sliding the throw around a corner.
   if(Math.hypot(next.x-p.x-dx,next.z-p.z-dz)>.015)break;p=next;
  }
  const n=this.roaming.nearest(p.x,p.z);return n&&distance(n,player)>.9&&distance(n,p)<.25?n:null;
 }
 throw(player,direction,launch=null){
  if(this.phase!=='pickup'&&!this.canThrow(player))return false;const target=this.landing(player,direction);
  if(!target){this.onMessage('Face an open part of the room to throw Leo’s bone.');return false;}
  this.roaming.player=player;if(!this.roaming.command('sunny',target,1.65)){this.roaming.release('sunny');this.onMessage('Leo needs a clear path to the bone.');return false;}
  this.phase='throw';this.time=0;this.trip=0;this.target=target;this.launch=launch?{x:launch.x,y:launch.y,z:launch.z}:{x:player.x,z:player.z,y:floorHeight(player.x,player.z)+.85};this.idle=60;
  if(launch){this.x=launch.x;this.y=launch.y;this.z=launch.z;}
  this.onMessage('Fetch, Leo!');return true;
 }
 drop(player){
  const p=this.roaming.pets.get('sunny'),d=distance(p,player)||1;
  const moved=moveAlongFloor(p.x,p.z,(player.x-p.x)/d*.28,(player.z-p.z)/d*.28,this.roaming.obstacles);
  this.place(moved);this.phase='rest';this.idle=45;this.roaming.release('sunny',8);this.persist(true);this.onMessage('Leo drops his bone at your feet.');
 }
 update(dt,player){
  if(!this.life||dt<=0||!player||this.phase==='pickup')return;dt=Math.min(dt,.1);const p=this.roaming.pets.get('sunny');if(!p)return;
  this.time+=dt;
  if(this.phase==='throw'){
   const t=Math.min(1,this.time/.75);this.x=this.launch.x+(this.target.x-this.launch.x)*t;this.z=this.launch.z+(this.target.z-this.launch.z)*t;this.y=this.launch.y+(this.target.y+.055-this.launch.y)*t+Math.sin(t*Math.PI)*.65;
   this.persist();if(t===1){this.place(this.target);this.phase='chase';this.persist(true);}
  }else if(this.phase==='chase'||this.phase==='seek'){
   this.trip=(this.trip||0)+dt;
   if(distance(p,this)<.34&&Math.abs(p.y-floorHeight(this.x,this.z))<.2){
    if(this.phase==='seek'){this.roaming.release('sunny',18);p.activity='chew';this.phase='chew';this.time=0;}
    else{this.phase='return';this.time=2;this.trip=0;this.returnPlayer=null;}
   }else if(this.trip>90){this.roaming.release('sunny');this.phase='rest';this.idle=40;this.persist(true);}
  }else if(this.phase==='return'){
   this.trip+=dt;const d=distance(p,player),vx=d>.01?(player.x-p.x)/d:0,vz=d>.01?(player.z-p.z)/d:1;
   const speed=Math.hypot(p.vx,p.vz),mx=speed>.001?p.vx/speed:vx,mz=speed>.001?p.vz/speed:vz;
   this.heading=Math.atan2(mx,mz);this.x=p.x+mx*.25;this.z=p.z+mz*.25;this.y=p.y+.24;this.persist();
   if(d<1.05&&Math.abs(p.y-floorHeight(player.x,player.z))<.22){this.drop(player);return;}
   if(this.time>1.2&&(!this.returnPlayer||distance(player,this.returnPlayer)>.45||!p.path.length)){
    this.time=0;this.returnPlayer={x:player.x,z:player.z};
    // Stop outside the player's footprint; the final mouth-to-feet drop is short.
    const target=this.roaming.nearest(player.x-vx*.9,player.z-vz*.9);this.roaming.command('sunny',target,1.45);
   }
   if(this.trip>90){this.place(p);this.phase='rest';this.roaming.release('sunny');this.idle=40;this.persist(true);}
  }else if(this.phase==='chew'){
   if(this.time>17||p.activity!=='chew'){this.phase='rest';this.idle=45;this.roaming.release('sunny',3);this.persist(true);}
  }else{
   // A moved chair may cover a resting bone. Keep the single object reachable.
   this.idle-=dt;if(this.idle<=0){
    this.idle=40+this.random()*35;
    if(!inWalkableArea(this.x,this.z,true,this.roaming.obstacles)){this.place(this.roaming.nearest(this.x,this.z));this.persist(true);}
    if(!p.greeting&&!p.command&&!p.social&&distance(p,this)<8&&this.roaming.command('sunny',this,1)){this.phase='seek';this.trip=0;}
   }
  }
 }
}
