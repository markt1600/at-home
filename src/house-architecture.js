import * as THREE from 'three';
import {HOUSE_ROOMS,PLAN_SCALE,planPoint,pointInPolygon,FRONT_DOOR,BALCONY_DOORS} from './house-layout.js';
import {buildGlassBlockWall,glassBlockMaterial} from './glass-block-wall.js';

// One continuous wall run per partition; apertures cut the run and retain its lintel.
// Positions are in the same private-reference drawing grid as house-layout.js.
const opening=(id,center,width,height=2.13,base=.75,kind='door')=>({id,center,width,height,base,kind});
export const INTERIOR_WALLS=[
 {id:'theatre-bedroom',a:[523,208],b:[523,415]},
 {id:'theatre-entry',a:[331,397],b:[523,397],openings:[opening('theatre',[468,397],1.9,2.15)]},
 {id:'powder-east',a:[415,397],b:[415,482],openings:[opening('powder',[415,433],.9)]},
 {id:'powder-south',a:[299,482],b:[415,482]},
 // The bedside wall is uninterrupted glass blocks; GD06 is on the east return.
 {id:'meditation-glass-blocks',a:[523,249],b:[602,249],material:'glassblock'},
 {id:'meditation-side-entry',a:[602,208],b:[602,249],openings:[opening('meditation',[602,228.5],.90,2.54)]},
 {id:'master-south',a:[523,415],b:[783,415],openings:[opening('bedroom',[766,415],.9)]},
 {id:'cabinet-end-return',a:[523,415],b:[523,482]},
 {id:'master-east',a:[783,208],b:[783,415],openings:[opening('vanity',[783,250],.9,2.15)]},
 {id:'wardrobe-north',a:[783,273],b:[868,273],openings:[opening('wardrobe',[850,273],.9,2.15)]},
 {id:'wardrobe-east',a:[910,273],b:[910,415]},
 {id:'wardrobe-south',a:[783,415],b:[910,415]},
 {id:'bath-west',a:[868,208],b:[868,273],openings:[opening('bath',[868,250],.9)]},
 {id:'bath-south',a:[868,273],b:[952,273]},
 {id:'second-bedroom-entry',a:[853,415],b:[853,482],openings:[opening('guest',[853,461],.9)]},
 {id:'second-bedroom-vestibule',a:[910,415],b:[910,457],openings:[opening('guest-inner',[910,436],42/PLAN_SCALE,2.25)]},
 {id:'second-bedroom-closet-backing',a:[910,482],b:[984,482]},
 {id:'second-bath-north',a:[984,457],b:[1053,457],openings:[opening('guest-bath',[1023,457],.9)]},
 {id:'second-bath-west',a:[984,457],b:[984,563]},
 {id:'office-north',a:[853,531],b:[984,531]},
 {id:'office-west',a:[853,482],b:[853,632]},
 {id:'office-south',a:[853,632],b:[947,632],openings:[opening('office',[928,632],.9,2.25)]},
 {id:'wine-north',a:[653,482],b:[853,482],openings:[opening('wine-corridor-glazing',[753,482],200/PLAN_SCALE,2.2,.75,'window')]},
 {id:'wine-south',a:[653,632],b:[853,632],openings:[opening('wine-entry-glazing',[718,632],130/PLAN_SCALE,2.2,.75,'window')]},
 {id:'wine-west',a:[653,482],b:[653,632],material:'glass',openings:[opening('wine',[653,563],.84,2)]},
 ...BALCONY_DOORS.map(d=>({id:d.id,a:d.a,b:d.b,openings:[d]})),
 {id:'kitchen-north',a:[523,718],b:[650,718],openings:[opening('kitchen-window',[601,718],.34,1.15,1.72,'window'),opening('kitchen-window-wide',[539,718],.78,.68,1.98,'window')]},
 {id:'kitchen-west',a:[523,718],b:[523,883],openings:[opening('kitchen',[523,837],.9,2.13,.45)]},
 // The bathroom is entered from the service passage, not through this wall.
 {id:'kitchen-east',a:[650,718],b:[650,883],openings:[opening('yard-access',[650,850],.9,2.13,.45)]},
 {id:'service-bath-north',a:[650,718],b:[691,718]},
 {id:'service-bath-east',a:[691,718],b:[691,767]},
 {id:'service-bath-sink-north',a:[691,767],b:[714,767]},
 {id:'service-bath-sink-east',a:[714,767],b:[714,808]},
 {id:'service-bath-south',a:[650,808],b:[714,808],openings:[opening('service-bath',[670.5,808],.9,2.13,.45)]},
 {id:'service-room-entry',a:[691,808],b:[691,857],openings:[opening('service-room',[691,833],.9,2.13,.45)]},
 {id:'service-room-north',a:[714,786],b:[823,786]},
 {id:'service-room-south',a:[691,857],b:[818,857]},
 {id:'store-north',a:[691,718],b:[755,718]},
 {id:'entry-service-wall',a:[755,718],b:[856,819],openings:[opening('store',[808,771],.8,2.25,.45)]},
 {id:'front-door',a:[856,819],b:[925,750],openings:[opening('front-door',FRONT_DOOR.center,FRONT_DOOR.width,2.2,.45,'front')]},
 {id:'shoe-cabinet-backing',a:[925,750],b:[984,691]},
 {id:'shoe-cabinet-return',a:[925,750],b:[908,733]},
 {id:'lift-door',a:[947,877],b:[1002,822],openings:[opening('lift-door',[974.5,849.5],1.5,2.3,.45,'lift')]}
];

export const EXTERIOR_OPENINGS=[
 // W03 on the entrance's east wall (Windows Plan, page 9).
 opening('entry-nook-window',[984,666.5],.9,1.25,1.19,'window'),
 opening('office-window-one',[947,600],.34,1.66,1.54,'window'),
 opening('office-window-two',[947,622],.34,1.66,1.54,'window'),
 opening('master-windows',[690,208],4.5,1.7,1.45,'window'),
 opening('vanity-window',[826,208],1.9,1.5,1.77,'window'),
 opening('second-bath-window',[1037,563],.4,1.7,1.45,'window'),
 opening('second-bedroom-window',[1003,273],2.35,1.4,1.7,'window'),
 opening('meditation-window',[560,135],.5,1.6,1.45,'window'),
 opening('bath-window',[909,135],.5,1.6,1.45,'window'),
 opening('powder-window',[299,441.5],.44,1.65,1.45,'window'),
 opening('theatre-window-north',[399,181],2.45,1.79,1.63,'window'),
 opening('theatre-window-angle',[324.5,206.5],1.78,1.79,1.63,'window'),
 opening('theatre-window-west',[299,282],2.49,1.79,1.63,'window'),
 opening('theatre-window-northeast',[462,194.5],.92,1.79,1.63,'window'),
 opening('lobby-window',[1002,738],1.35,1.9,1,'window'),
 opening('lobby-exit',[1002,792],.9,2.13,.45,'closed'),
 opening('yard-exit',[826,883],.9,2.13,.45,'closed'),
 opening('yard-louvres',[650,908],.96,1.15,1.65,'window'),
 opening('kitchen-south-window',[563,883],1.7,1.1,1.75,'window')
];

// Split at intersections and remove shared room edges. This closes the complete
// concave envelope, including the lift lobby, yard recess and bedroom bay corners.
export function envelopeSegments(rooms=HOUSE_ROOMS){
 const polygons=rooms.map(r=>r.plan),edges=polygons.flatMap(p=>p.map((a,i)=>({a,b:p[(i+1)%p.length]})));
 const inside=(x,y)=>polygons.some(p=>pointInPolygon(x,y,p));
 const cross=(a,b)=>a[0]*b[1]-a[1]*b[0],out=[],seen=new Set();
 for(const e of edges){
  const v=[e.b[0]-e.a[0],e.b[1]-e.a[1]],len=Math.hypot(...v),ts=[0,1];
  for(const other of edges){
   const w=[other.b[0]-other.a[0],other.b[1]-other.a[1]],q=[other.a[0]-e.a[0],other.a[1]-e.a[1]],den=cross(v,w);
   if(Math.abs(den)>1e-8){const t=cross(q,w)/den,u=cross(q,v)/den;if(t>0&&t<1&&u>=0&&u<=1)ts.push(t);}
   else if(Math.abs(cross(q,v))<1e-7)for(const p of [other.a,other.b]){const t=((p[0]-e.a[0])*v[0]+(p[1]-e.a[1])*v[1])/(len*len);if(t>0&&t<1)ts.push(t);}
  }
  ts.sort((a,b)=>a-b);
  for(let i=1;i<ts.length;i++){
   if(ts[i]-ts[i-1]<1e-7)continue;
   const a=e.a.map((q,j)=>q+v[j]*ts[i-1]),b=e.a.map((q,j)=>q+v[j]*ts[i]),m=a.map((q,j)=>(q+b[j])/2),n=[-v[1]/len*.03,v[0]/len*.03];
   if(inside(m[0]+n[0],m[1]+n[1])===inside(m[0]-n[0],m[1]-n[1]))continue;
   const key=[a,b].map(p=>p.map(q=>q.toFixed(4)).join(',')).sort().join(':');if(seen.has(key))continue;seen.add(key);out.push({id:`envelope-${out.length}`,a,b});
  }
 }
 return out;
}

export function wallApertures(wall,openings=wall.openings||[]){
 const [x,z]=planPoint(...wall.a),[xx,zz]=planPoint(...wall.b),length=Math.hypot(xx-x,zz-z),dx=(xx-x)/length,dz=(zz-z)/length;
 return openings.flatMap(o=>{const [a,b]=planPoint(...o.center),t=(a-x)*dx+(b-z)*dz,distance=Math.abs((a-x)*dz-(b-z)*dx),lo=Math.max(0,t-o.width/2),hi=Math.min(length,t+o.width/2);return distance<.025&&hi>lo?[{...o,lo,hi,t}]:[];}).sort((a,b)=>a.lo-b.lo);
}

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
