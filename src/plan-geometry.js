// Subtract stair footprints from floor slabs, so upper floors never cover treads.
function clip(p,axis,bound,less){
 const out=[];for(let i=0;i<p.length;i++){
  const a=p[i],b=p[(i+1)%p.length],ina=less?a[axis]<=bound:a[axis]>=bound,inb=less?b[axis]<=bound:b[axis]>=bound;
  if(ina)out.push(a);if(ina!==inb){const t=(bound-a[axis])/(b[axis]-a[axis]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
 }return out;
}
export function floorPieces(polygon,stairs){
 let pieces=[polygon];for(const s of stairs){
  const xs=s.polygon.map(p=>p[0]),zs=s.polygon.map(p=>p[1]),bounds=[[0,Math.min(...xs),true],[0,Math.max(...xs),false],[1,Math.min(...zs),true],[1,Math.max(...zs),false]];
  pieces=pieces.flatMap(p=>{let inside=p;const out=[];for(const [axis,bound,less] of bounds){if(inside.length<3)break;const part=clip(inside,axis,bound,less);if(part.length>=3)out.push(part);inside=clip(inside,axis,bound,!less);}return out;});
 }
 // Boundary-only clipped polygons have no floor area. Extruding them would
 // nevertheless create vertical sheets across the mouths of the stair runs.
 return pieces.filter(p=>Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-a[1]*b[0];},0))>1e-7);
}
