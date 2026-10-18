import * as THREE from 'three';
import {HOUSE_ROOMS,PLAN_SCALE,planPoint,pointInPolygon,FRONT_DOOR,BALCONY_DOORS} from './house-layout.js';
import {buildGlassBlockWall,glassBlockMaterial} from './glass-block-wall.js';
import {INTERIOR_WALLS,EXTERIOR_OPENINGS,envelopeSegments,wallApertures} from './house-walls.js';
export {INTERIOR_WALLS,EXTERIOR_OPENINGS,envelopeSegments,wallApertures};

export function buildArchitecture(world,root,materials){
 const top=4.1,bottom=-.12;
 materials.glassblock=glassBlockMaterial();
 materials.frostedOfficeGlass=new THREE.MeshStandardMaterial({color:0xacc3c9,roughness:.8,metalness:.05,emissive:0x91afbb,emissiveIntensity:.15});
 const solid=(wall,lo,hi,base,height,material='plaster',collision=false,depth=.16)=>{
  if(hi-lo<1e-6||height<1e-6)return;
  const [x,z]=planPoint(...wall.a),[xx,zz]=planPoint(...wall.b),len=Math.hypot(xx-x,zz-z),t=(lo+hi)/2/len,angle=-Math.atan2(zz-z,xx-x);
  // Adjacent sections meet exactly. Padding every box created coplanar strips
  // at wall seams, door jambs and balcony rail corners (visible as flicker).
  const mesh=world.box(hi-lo,height,depth,x+(xx-x)*t,base+height/2,z+(zz-z)*t,materials[material],root);mesh.rotation.y=angle;mesh.userData.architecture=true;mesh.name=wall.id;
  if(material==='glass'){
   // Double-sided glass box caps lay exactly on adjoining floor surfaces.
   // Keep the vertical panes, with no horizontal cap competing with the floor.
   const geo=mesh.geometry.toNonIndexed(),normal=geo.attributes.normal,keep=[];
   for(let i=0;i<normal.count;i+=3)if(Math.abs(normal.getY(i))<.5)keep.push(i,i+1,i+2);
   geo.setIndex(keep);mesh.geometry.dispose();mesh.geometry=geo;
  }
  if(collision)world.colliders.push({x:mesh.position.x,z:mesh.position.z,w:hi-lo,d:depth,angle,wall:wall.id});
  return mesh;
 };
 world.architectureWalls=[];
 for(const wall of [...envelopeSegments().map(w=>({...w,openings:EXTERIOR_OPENINGS,exterior:true})),...INTERIOR_WALLS]){
  const length=Math.hypot(wall.b[0]-wall.a[0],wall.b[1]-wall.a[1])/PLAN_SCALE,apertures=wallApertures(wall);let cursor=0;
  if(wall.material==='glassblock'){
   buildGlassBlockWall(world,root,wall,materials);
   solid(wall,0,length,bottom,.75-bottom,'plaster',true);
   solid(wall,0,length,3.41,top-3.41,'plaster',true);
   world.architectureWalls.push({...wall,length,apertures:[]});continue;
  }
  const balcony=wall.exterior&&HOUSE_ROOMS.find(r=>r.balcony&&pointInPolygon(...planPoint((wall.a[0]+wall.b[0])/2,(wall.a[1]+wall.b[1])/2),r.polygon));
  if(balcony){
   // Covered outdoor balconies: low parapets and handrails, open air above.
   solid(wall,0,length,bottom,balcony.floor+.94-bottom,'plaster',true,.14);
   solid(wall,0,length,balcony.floor+1.075,.035,'steel',false,.045);
   for(let t=.08;t<length;t+=.72)solid(wall,t-.012,t+.012,balcony.floor+.94,.15,'steel',false,.035);
   world.architectureWalls.push({...wall,length,apertures:[],balcony:true,floor:balcony.floor});continue;
  }
  for(const a of apertures){
   solid(wall,cursor,a.lo,bottom,top-bottom,wall.material||'plaster',true);
   solid(wall,a.lo,a.hi,bottom,a.base-bottom-([0,.45,.75].some(y=>Math.abs(y-a.base)<.001)?.004:0),wall.material||'plaster',a.kind==='window');
   solid(wall,a.lo,a.hi,a.base+a.height,top-a.base-a.height);
   const frame=a.kind==='sliding'||(a.id.startsWith('theatre-window')||a.id.startsWith('office-window'))?'black':a.kind==='door'&&!['wine','theatre'].includes(a.id)?'white':'steel';
   for(const end of [a.lo,a.hi])solid(wall,end-.022,end+.022,a.base,a.height-.025,frame,false,.19);
   solid(wall,a.lo,a.hi,a.base+a.height-.025,.05,frame,false,.19);
   if(['window','closed'].includes(a.kind)){
    solid(wall,a.lo,a.hi,a.base,a.height,a.kind==='window'?(a.id.startsWith('office-window')||a.id==='entry-nook-window'?'frostedOfficeGlass':'glass'):a.kind==='lift'?'steel':'walnut',true,.045);
    if(a.kind==='window'){const spacing=a.id.startsWith('kitchen-window')?Infinity:a.id==='master-windows'?(a.hi-a.lo)/4:.6;for(let t=a.lo+spacing;t<a.hi-.01;t+=spacing)solid(wall,t-.014,t+.014,a.base,a.height,'black',false,.06);}
    if(a.kind==='lift')solid(wall,(a.lo+a.hi)/2-.008,(a.lo+a.hi)/2+.008,a.base,a.height,'black',false,.06);
   }
   if(a.kind==='sliding'){
    const leaf=(a.hi-a.lo)/4,doorHeight=2.38;
    // Four leaves parked as two pairs, leaving a real central passage.
    for(const [lo,hi] of [[a.lo,a.lo+leaf],[a.hi-leaf,a.hi]]){
     solid(wall,lo,hi,a.base,doorHeight,'glass',true,.085);
     // Outer jambs already support the outside edges of the parked leaves.
     for(const edge of [lo,hi])if(edge>a.lo+.001&&edge<a.hi-.001)solid(wall,edge-.022,edge+.022,a.base+.035,doorHeight-.07,'black',false,.12);
     solid(wall,lo-.022,hi+.022,a.base,.035,'black',false,.12);
     solid(wall,lo-.022,hi+.022,a.base+doorHeight-.035,.035,'black',false,.12);
     solid(wall,lo+.045,hi-.045,a.base+.012,.025,'steel',false,.16);
    }
    solid(wall,a.lo,a.hi,a.base+doorHeight,.045,'black',false,.12);
    solid(wall,a.lo,a.hi,a.base+doorHeight+.045,a.height-doorHeight-.045,'glass',false,.03);
    for(let i=1;i<4;i++)solid(wall,a.lo+i*leaf-.016,a.lo+i*leaf+.016,a.base+doorHeight,a.height-doorHeight,'black',false,.08);
    for(const t of [a.lo+leaf-.07,a.hi-leaf+.07])solid(wall,t-.017,t+.017,a.base+.98,.27,'black',false,.17);
    solid(wall,a.lo,a.hi,a.base,.012,'steel',false,.18);
   }
   cursor=a.hi;
  }
  solid(wall,cursor,length,bottom,top-bottom,wall.material||'plaster',true);
  world.architectureWalls.push({...wall,length,apertures});
 }
 return world.architectureWalls;
}
