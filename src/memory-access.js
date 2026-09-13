import {HOUSE_ROOMS,planPoint,pointInPolygon,floorHeight} from './house-layout.js';
import {MEMORY_OBSTACLES,MEMORY_OPEN_SPOTS} from './memory-floor-geometry.js';

export const MEMORY_FURNITURE_CLEARANCE=.45;
export function furnitureDistance(x,z,c){
 const dx=x-c.x,dz=z-c.z,a=c.angle||0;
 return Math.hypot(Math.max(0,Math.abs(dx*Math.cos(a)-dz*Math.sin(a))-c.w/2),Math.max(0,Math.abs(dx*Math.sin(a)+dz*Math.cos(a))-c.d/2));
}
export function hasMemoryClearance(x,z){
 const y=floorHeight(x,z);
 return !MEMORY_OBSTACLES.some(c=>!(c.top!==undefined&&c.top<=y+.015)&&furnitureDistance(x,z,c)<(c.wall ? .22 :MEMORY_FURNITURE_CLEARANCE));
}
export function accessibleMemorySpot(px,pz){
 if(!Number.isFinite(px)||!Number.isFinite(pz))return null;
 const [x,z]=planPoint(px,pz),room=HOUSE_ROOMS.find(r=>r.walkable!==false&&pointInPolygon(x,z,r.polygon));
 if(!room)return null;
 // Candidates were flood-filled through the game's actual doors and stairs.
 // Same-room selection avoids snapping across a partition into another room.
 let best=null,distance=Infinity;
 for(const p of MEMORY_OPEN_SPOTS){if(p[3]!==room.id)continue;const d=Math.hypot(p[0]-x,p[2]-z);if(d<distance){best=p;distance=d;}}
 if(!best||distance>2.5)return null;
 const exact=distance<.18&&hasMemoryClearance(x,z);
 return {position:exact?[x,floorHeight(x,z),z]:best.slice(0,3),room:room.name,roomId:room.id,adjusted:!exact,distance:exact?0:distance};
}
