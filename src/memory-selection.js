// The ring is .19 m across its outer radius, lying .027 m above the floor.
// Selection is recalculated for E, so it never depends on a stale notification.
export function selectMemory(memories,position,direction,floorY,radius=1.25){
 const candidates=memories.map(memory=>({memory,distance:Math.hypot(memory.position[0]-position.x,memory.position[2]-position.z)}))
  .filter(({memory,distance})=>distance<=radius&&Math.abs(memory.position[1]-floorY)<.4).sort((a,b)=>a.distance-b.distance);
 let aimed=null,depth=Infinity;
 if(direction.y<-.0001)for(const item of candidates){
  const [x,y,z]=item.memory.position,t=(y+.027-position.y)/direction.y;
  if(t>0&&t<depth&&Math.hypot(position.x+direction.x*t-x,position.z+direction.z*t-z)<=.19){aimed=item.memory;depth=t;}
 }
 return {memory:aimed||candidates[0]?.memory||null,aimed:!!aimed};
}
