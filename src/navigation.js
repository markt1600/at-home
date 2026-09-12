import {HOUSE_ROOMS} from './house-layout.js';
export function inWalkableArea(x,z,exploring,obstacles=[]){
  if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  const inside=HOUSE_ROOMS.some(r=>x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1);
  return inside&&!obstacles.some(c=>Math.abs(x-c.x)<c.w/2+.16&&Math.abs(z-c.z)<c.d/2+.16);
}
