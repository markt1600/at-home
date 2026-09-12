import {HOUSE_ROOMS,HOUSE_STAIRS,pointInPolygon} from './house-layout.js';
export function inWalkableArea(x,z,exploring,obstacles=[]){
  if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  const inside=[...HOUSE_ROOMS,...HOUSE_STAIRS].some(r=>r.walkable!==false&&pointInPolygon(x,z,r.polygon));
  return inside&&!obstacles.some(c=>{
    const dx=x-c.x,dz=z-c.z,a=c.angle||0;
    return Math.abs(dx*Math.cos(a)-dz*Math.sin(a))<c.w/2+.16&&Math.abs(dx*Math.sin(a)+dz*Math.cos(a))<c.d/2+.16;
  });
}
