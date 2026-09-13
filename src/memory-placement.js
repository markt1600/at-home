import {HOUSE_ROOMS,HOUSE_STAIRS,PLAN_SCALE,planPoint,pointInPolygon,floorHeight} from './house-layout.js';
import {accessibleMemorySpot} from './memory-access.js';
import {MEMORY_FURNITURE} from './memory-floor-geometry.js';
import {INTERIOR_WALLS,envelopeSegments,wallApertures} from './house-architecture.js';

export const positionToPlan=([x,,z])=>[x*PLAN_SCALE+881,z*PLAN_SCALE+789];
// Show door gaps in the same wall runs used to build the house. Windows remain boundaries.
export const MEMORY_PLAN_WALLS=[...envelopeSegments(),...INTERIOR_WALLS].flatMap(w=>{
 const length=Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1])/PLAN_SCALE;
 const gaps=wallApertures(w).filter(o=>['door','front','sliding'].includes(o.kind));
 const at=t=>w.a.map((v,i)=>v+(w.b[i]-v)*t/length),lines=[];let from=0;
 for(const g of gaps){if(g.lo>from)lines.push([at(from),at(g.lo)]);from=Math.max(from,g.hi);}
 if(from<length)lines.push([at(from),w.b]);return lines;
});
function distanceToSegment(p,a,b){const d=b.map((v,i)=>v-a[i]),t=Math.max(0,Math.min(1,((p[0]-a[0])*d[0]+(p[1]-a[1])*d[1])/(d[0]**2+d[1]**2)));return Math.hypot(p[0]-a[0]-d[0]*t,p[1]-a[1]-d[1]*t);}
export function memorySpotAtPlan(px,pz){
 if(!Number.isFinite(px)||!Number.isFinite(pz))return null;
 const [x,z]=planPoint(px,pz),room=HOUSE_ROOMS.find(r=>r.walkable!==false&&pointInPolygon(x,z,r.polygon));
 if(!room||MEMORY_PLAN_WALLS.some(([a,b])=>distanceToSegment([px,pz],a,b)<.12*PLAN_SCALE))return null;
 return {position:[x,floorHeight(x,z),z],room:room.name,roomId:room.id};
}
export function furniturePlanPolygon(c){return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx,sz])=>{const dx=sx*c.w/2,dz=sz*c.d/2,a=c.angle||0;return positionToPlan([c.x+dx*Math.cos(a)+dz*Math.sin(a),0,c.z-dx*Math.sin(a)+dz*Math.cos(a)]);});}
const labels=[['Window','lounge',409,300],['Main bedroom','',679,321],['Wardrobe','',845,342],['Main','bath',911,192],['Vanity','',826,240],['Second','bedroom',981,358],['Second','bath',1019,506],['Home','office',902,578],['Wine cellar','',751,557],['Entrance','',767,677],['Lift','lobby',955,792],['Dining room','',420,814],['Kitchen','',586,793],['Utility yard','',735,900],['Living room','',425,624],['Balcony','',264,619],['Powder','room',356,440],['Main passage','',672,451]];
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountMemoryFloorPlan(host,{position,memories=[],disabled=()=>false,onChange=()=>{}}){
 let placement=accessibleMemorySpot(...positionToPlan(position)),current=placement?.position||[...position],dragging=false;const whole='192 105 900 875';
 host.innerHTML=`<div class="map-heading"><h3>Place this memory</h3><span>Click the plan or drag the pin</span></div><div class="map-toolbar"><label>View a room<select class="map-room"><option value="">Whole house</option>${HOUSE_ROOMS.filter(r=>r.walkable!==false).map(r=>`<option value="${r.id}">${safe(r.name)}</option>`).join('')}</select></label><button type="button" class="map-focus">Focus on pin</button></div><p class="fine" id="map-help">Furniture is shown in brown. Pins keep at least 45 cm from furniture and avoid tight, unreachable gaps. The large ring shows where a memory appears. Tab to the plan and use arrow keys to adjust; hold Shift for larger moves.</p><svg class="memory-floor-plan" viewBox="${whole}" tabindex="0" role="group" aria-label="Memory location floor plan" aria-describedby="map-help"><title>At Home floor plan</title><g class="map-rooms">${HOUSE_ROOMS.map(r=>`<polygon class="${r.walkable===false?'unavailable':r.balcony?'balcony':''}" points="${r.plan.map(p=>p.join(',')).join(' ')}"><title>${safe(r.name)}</title></polygon>`).join('')}</g><g class="map-stairs">${HOUSE_STAIRS.map(s=>`<polygon points="${s.plan.map(p=>p.join(',')).join(' ')}"/>`).join('')}</g><g class="map-furniture">${MEMORY_FURNITURE.map(c=>`<polygon points="${furniturePlanPolygon(c).map(p=>p.join(',')).join(' ')}"><title>Furniture or fitted fixture</title></polygon>`).join('')}</g><g class="map-walls">${MEMORY_PLAN_WALLS.map(([a,b])=>`<path d="M${a.join(',')} L${b.join(',')}"/>`).join('')}</g><g class="map-labels">${labels.map(([a,b,x,z])=>`<text x="${x}" y="${z}">${a}${b?`<tspan x="${x}" dy="20">${b}</tspan>`:''}</text>`).join('')}</g><g class="other-memories">${memories.filter(m=>m.position).map(m=>{const [x,z]=positionToPlan(m.position);return `<circle cx="${x}" cy="${z}" r="6"><title>${safe(m.title)}</title></circle>`;}).join('')}</g><g class="memory-map-pin"><circle class="trigger-ring" r="${1.25*PLAN_SCALE}"/><circle class="clearance-ring" r="${.45*PLAN_SCALE}"/><circle class="pin-halo" r="15"/><circle class="pin-dot" r="8"/><path d="M-4,0 H4 M0,-4 V4"/></g></svg><p class="map-selection" role="status" aria-live="polite"></p>`;
 const svg=host.querySelector('svg'),pin=host.querySelector('.memory-map-pin'),readout=host.querySelector('.map-selection'),roomSelect=host.querySelector('.map-room');
 const update=()=>{const [px,pz]=positionToPlan(current);pin.setAttribute('transform',`translate(${px} ${pz})`);const room=HOUSE_ROOMS.find(r=>r.walkable!==false&&pointInPolygon(current[0],current[2],r.polygon));readout.textContent=`${placement?.adjusted?`Moved ${placement.distance.toFixed(1)} m to an accessible spot in ${room?.name||'this room'}. `:`Selected: ${room?.name||'Current location'}. `}45 cm furniture clearance. Memories appear within about 1.25 m.${placement?.adjusted?' Save to keep this placement.':''}`;};
 function choose(px,pz){if(disabled())return;const spot=accessibleMemorySpot(px,pz);if(!spot){readout.textContent='No nearby accessible spot here. Choose an open area in the same room or balcony.';return;}placement=spot;current=spot.position;update();onChange([...current]);}
 const fromPointer=e=>{const matrix=svg.getScreenCTM();if(!matrix)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());choose(p.x,p.y);};
 svg.addEventListener('pointerdown',e=>{if(disabled()||e.button!==0)return;e.preventDefault();svg.focus({preventScroll:true});dragging=true;svg.setPointerCapture(e.pointerId);fromPointer(e);});
 svg.addEventListener('pointermove',e=>{if(dragging)fromPointer(e);});
 svg.addEventListener('pointerup',()=>{dragging=false;});svg.addEventListener('pointercancel',()=>{dragging=false;});
 svg.addEventListener('keydown',e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!d)return;e.preventDefault();const p=positionToPlan(current),step=PLAN_SCALE*(e.shiftKey?1:.2);choose(p[0]+d[0]*step,p[1]+d[1]*step);});
 function focusRoom(id){const r=HOUSE_ROOMS.find(r=>r.id===id);if(!r){svg.setAttribute('viewBox',whole);return;}const xs=r.plan.map(p=>p[0]),zs=r.plan.map(p=>p[1]),width=Math.max(220,Math.max(...xs)-Math.min(...xs)+65),height=Math.max(220,Math.max(...zs)-Math.min(...zs)+65);svg.setAttribute('viewBox',`${(Math.max(...xs)+Math.min(...xs)-width)/2} ${(Math.max(...zs)+Math.min(...zs)-height)/2} ${width} ${height}`);}
 roomSelect.addEventListener('change',()=>focusRoom(roomSelect.value));host.querySelector('.map-focus').addEventListener('click',()=>{const room=HOUSE_ROOMS.find(r=>r.walkable!==false&&pointInPolygon(current[0],current[2],r.polygon));roomSelect.value=room?.id||'';focusRoom(roomSelect.value);});
 update();if(placement?.adjusted)onChange([...current]);return {getPosition:()=>{if(!placement)throw Error('Choose an accessible location on the floor plan.');return [...current];},setPosition:p=>choose(...positionToPlan(p))};
}
