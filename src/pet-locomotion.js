import {HOUSE_STAIRS,pointInPolygon,floorHeight} from './house-layout.js';

// Player navigation uses a ramp across stairs. Paws need the actual tread tops.
export function petFloorHeight(x,z){
 for(const s of HOUSE_STAIRS)if(pointInPolygon(x,z,s.polygon)){
  const axis=s.axis==='x'?0:1,v=s.polygon.map(p=>p[axis]),lo=Math.min(...v),hi=Math.max(...v);
  const t=((axis===0?x:z)-lo)/(hi-lo),up=s.reverse?1-t:t;
  return s.low+(s.high-s.low)*Math.min(s.risers,Math.floor(Math.max(0,up)*s.risers)+1)/s.risers;
 }return floorHeight(x,z);
}
export function petPose(p,dt){
 const ground=petFloorHeight(p.x,p.z),speed=Math.hypot(p.vx||0,p.vz||0);
 if(p.moving&&speed>.001&&!p.hop){
  const lead=p.id==='pebble'?.05:.18,ahead=petFloorHeight(p.x+p.vx/speed*lead,p.z+p.vz/speed*lead);
  if(Math.abs(ahead-ground)>.06)p.hop={from:ground,to:ahead,t:0,duration:p.id==='pebble'?1.15:.65};
 }
 let y=ground,pitch=0;
 if(p.hop){const h=p.hop;h.t+=Math.max(0,dt);const t=Math.min(1,h.t/h.duration),smooth=t*t*(3-2*t),arc=Math.sin(Math.PI*t)*(p.id==='pebble'?.025:.11);y=Math.max(ground,h.from+(h.to-h.from)*smooth+arc);pitch=Math.sin(Math.PI*t)*(h.to>h.from?.13:-.09);if(t>=1)p.hop=null;}
 // A small clearance also keeps antialiased fur edges above the depth buffer.
 return {y:y+.028,pitch,ground};
}
