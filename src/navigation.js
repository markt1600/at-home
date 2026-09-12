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
