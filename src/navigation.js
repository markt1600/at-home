import {HOUSE_ROOMS,HOUSE_STAIRS,pointInPolygon,floorHeight} from './house-layout.js';
export function inWalkableArea(x,z,exploring,obstacles=[]){
  if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  const inside=[...HOUSE_ROOMS,...HOUSE_STAIRS].some(r=>r.walkable!==false&&pointInPolygon(x,z,r.polygon));
  return inside&&!obstacles.some(c=>{
    if(c.top!==undefined&&c.top<=floorHeight(x,z)+.015)return false;
    const dx=x-c.x,dz=z-c.z,a=c.angle||0;
    return Math.abs(dx*Math.cos(a)-dz*Math.sin(a))<c.w/2+.16&&Math.abs(dx*Math.sin(a)+dz*Math.cos(a))<c.d/2+.16;
  });
}

// Follow the floor automatically across ordinary 150 mm risers. Substeps keep
// long frames from skipping thin walls, while axis sliding frees diagonal motion.
export function moveAlongFloor(x,z,dx,dz,obstacles=[]){
 const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.045));let climbed=0,distance=0;
 const attempt=(nx,nz)=>{
  const rise=floorHeight(nx,nz)-floorHeight(x,z);
  if(rise>.22||rise<-.32||!inWalkableArea(nx,nz,true,obstacles))return false;
  distance+=Math.hypot(nx-x,nz-z);climbed+=Math.abs(rise);x=nx;z=nz;return true;
 };
 for(let i=0;i<count;i++){const sx=dx/count,sz=dz/count;if(!attempt(x+sx,z+sz)){if(sx)attempt(x+sx,z);if(sz)attempt(x,z+sz);}}
 return {x,z,distance,climbed};
}

export function intersectsFootprint(x,z,c,padding=.16){
 const dx=x-c.x,dz=z-c.z,a=c.angle||0;
 return Math.abs(dx*Math.cos(a)-dz*Math.sin(a))<c.w/2+padding&&Math.abs(dx*Math.sin(a)+dz*Math.cos(a))<c.d/2+padding;
}
export function standingHeight(x,z,y,obstacles=[]){
 let top=floorHeight(x,z);
 for(const c of obstacles)if(c.landable&&c.top<=y+.04&&c.top>top&&intersectsFootprint(x,z,c,.10))top=c.top;
 return top;
}
// Position y is the player's feet. Furniture has explicit top heights; walls
// remain solid. Small fixed substeps prevent tunnelling during jumps and falls.
export function moveWithJump(player,dx,dz,dt,obstacles=[],jump=false){
 const p={...player},count=Math.max(1,Math.ceil(dt/.0125),Math.ceil(Math.hypot(dx,dz)/.045));let distance=0,landed=false;
 if(jump&&p.grounded){p.vy=4.8;p.grounded=false;}
 for(let i=0;i<count;i++){
  const h=dt/count;
  const attempt=(x,z)=>{
   const inside=HOUSE_ROOMS.some(r=>r.walkable!==false&&pointInPolygon(x,z,r.polygon))||HOUSE_STAIRS.some(s=>pointInPolygon(x,z,s.polygon));if(!inside)return false;
   const floor=floorHeight(x,z);if(floor>p.y+.22)return false;
   if(obstacles.some(c=>intersectsFootprint(x,z,c)&&!(c.top!==undefined&&c.top<=floor+.015)&&!(c.landable&&c.top<=p.y+.045)))return false;
   distance+=Math.hypot(x-p.x,z-p.z);p.x=x;p.z=z;return true;
  };
  const sx=dx/count,sz=dz/count;if(!attempt(p.x+sx,p.z+sz)){if(sx)attempt(p.x+sx,p.z);if(sz)attempt(p.x,p.z+sz);}
  const support=standingHeight(p.x,p.z,p.y,obstacles);
  if(p.grounded&&Math.abs(support-p.y)<=.23){p.y=support;p.vy=0;}else{
   p.grounded=false;p.vy-=10*h;let next=p.y+p.vy*h;
   const room=HOUSE_ROOMS.find(r=>pointInPolygon(p.x,p.z,r.polygon)),ceiling=(room?room.floor+room.ceiling:3.4)-1.67-.06;
   if(next>ceiling&&p.vy>0){next=Math.max(p.y,ceiling);p.vy=0;}
   if(next<=support&&p.vy<=0){next=support;p.vy=0;p.grounded=true;landed=true;}
   p.y=next;
  }
 }
 return {...p,distance,landed};
}
