import * as THREE from 'three';
import {HOUSE_ROOMS,PLAN_SCALE,planPoint,pointInPolygon,FRONT_DOOR} from './house-layout.js';

// One continuous wall run per partition; apertures cut the run and retain its lintel.
// Positions are in the same private-reference drawing grid as house-layout.js.
const opening=(id,center,width,height=2.13,base=.75,kind='door')=>({id,center,width,height,base,kind});
export const INTERIOR_WALLS=[
 {id:'theatre-bedroom',a:[523,208],b:[523,415]},
 {id:'theatre-entry',a:[331,397],b:[523,397],openings:[opening('theatre',[468,397],1.9,2.15)]},
 {id:'powder-east',a:[415,397],b:[415,482],openings:[opening('powder',[415,433],.9)]},
 {id:'powder-south',a:[299,482],b:[415,482]},
 {id:'meditation-entry',a:[523,249],b:[602,249],material:'glassblock',openings:[opening('meditation',[583,249],.8,2.54)]},
 {id:'master-south',a:[523,415],b:[783,415],openings:[opening('bedroom',[766,415],.9)]},
 {id:'master-east',a:[783,208],b:[783,415],openings:[opening('vanity',[783,250],.9,2.15)]},
 {id:'wardrobe-north',a:[783,273],b:[910,273],openings:[opening('wardrobe',[850,273],.9,2.15)]},
 {id:'wardrobe-east',a:[910,273],b:[910,415]},
 {id:'wardrobe-south',a:[783,415],b:[910,415]},
 {id:'bath-west',a:[868,208],b:[868,273],openings:[opening('bath',[868,250],.9)]},
 {id:'bath-south',a:[868,273],b:[952,273]},
 {id:'second-bedroom-entry',a:[853,415],b:[853,531],openings:[opening('guest',[853,461],.9)]},
 {id:'second-bath-north',a:[984,457],b:[1053,457],openings:[opening('guest-bath',[1023,457],.9)]},
 {id:'second-bath-west',a:[984,457],b:[984,563]},
 {id:'office-north',a:[853,531],b:[984,531]},
 {id:'office-west',a:[853,482],b:[853,632]},
 {id:'office-south',a:[853,632],b:[947,632],openings:[opening('office',[928,632],.9,2.25)]},
 {id:'wine-north',a:[653,482],b:[853,482]},
 {id:'wine-south',a:[653,632],b:[853,632]},
 {id:'wine-west',a:[653,482],b:[653,632],material:'glass',openings:[opening('wine',[653,563],.84,2)]},
 {id:'kitchen-north',a:[523,718],b:[650,718],openings:[opening('kitchen-window',[551,718],.44,1.1,1.75,'window')]},
 {id:'kitchen-west',a:[523,718],b:[523,883],openings:[opening('kitchen',[523,837],.9,2.13,.45)]},
 {id:'kitchen-east',a:[650,718],b:[650,883],openings:[opening('service-bath',[650,786],.9,2.13,.45),opening('yard-access',[650,850],.9,2.13,.45)]},
 {id:'service-bath-north',a:[650,718],b:[691,718]},
 {id:'service-bath-east',a:[691,718],b:[691,767]},
 {id:'service-bath-sink-north',a:[691,767],b:[714,767]},
 {id:'service-bath-sink-east',a:[714,767],b:[714,808]},
 {id:'service-bath-south',a:[650,808],b:[714,808]},
 {id:'service-room-entry',a:[691,808],b:[691,857],openings:[opening('service-room',[691,833],.9,2.13,.45)]},
 {id:'service-room-north',a:[714,786],b:[823,786]},
 {id:'service-room-south',a:[691,857],b:[818,857]},
 {id:'store-north',a:[691,718],b:[755,718]},
 {id:'entry-service-wall',a:[755,718],b:[856,819],openings:[opening('store',[808,771],.8,2.25,.45)]},
 {id:'front-door',a:[856,819],b:[925,750],openings:[opening('front-door',FRONT_DOOR.center,FRONT_DOOR.width,2.2,.45,'front')]},
 {id:'lift-door',a:[947,877],b:[1002,822],openings:[opening('lift-door',[974.5,849.5],1.5,2.3,.45,'lift')]}
];

export const EXTERIOR_OPENINGS=[
 opening('master-windows',[690,208],4.5,1.7,1.45,'window'),
 opening('vanity-window',[826,208],1.5,1.1,2,'window'),
 opening('second-bedroom-window',[1003,273],2.35,1.4,1.7,'window'),
 opening('meditation-window',[560,135],.5,1.6,1.45,'window'),
 opening('bath-window',[909,135],.5,1.6,1.45,'window'),
 opening('theatre-window-north',[399,181],2.15,2.15,1.1,'window'),
 opening('theatre-window-angle',[324.5,206.5],1.55,2.15,1.1,'window'),
 opening('theatre-window-west',[299,282],2.35,2.15,1.1,'window'),
 opening('living-window',[222,622.5],2.36,2.15,.7,'window'),
 opening('living-window-nw',[233.5,561.5],.82,2.15,.7,'window'),
 opening('living-window-sw',[233.5,682.5],.79,2.15,.7,'window'),
 opening('dining-window',[248,809],2,2.15,.85,'window'),
 opening('dining-window-nw',[261,754.5],.84,2.15,.85,'window'),
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
 materials.glassblock=new THREE.MeshStandardMaterial({color:0xaebdb6,roughness:.35,metalness:.1,transparent:true,opacity:.7});
 const solid=(wall,lo,hi,base,height,material='plaster',collision=false,depth=.16)=>{
  if(hi-lo<1e-6||height<1e-6)return;
  const [x,z]=planPoint(...wall.a),[xx,zz]=planPoint(...wall.b),len=Math.hypot(xx-x,zz-z),t=(lo+hi)/2/len,angle=-Math.atan2(zz-z,xx-x);
  const mesh=world.box(hi-lo+.008,height,depth,x+(xx-x)*t,base+height/2,z+(zz-z)*t,materials[material],root);mesh.rotation.y=angle;mesh.userData.architecture=true;mesh.name=wall.id;
  if(collision)world.colliders.push({x:mesh.position.x,z:mesh.position.z,w:hi-lo,d:depth,angle,wall:wall.id});
  return mesh;
 };
 world.architectureWalls=[];
 for(const wall of [...envelopeSegments().map(w=>({...w,openings:EXTERIOR_OPENINGS,exterior:true})),...INTERIOR_WALLS]){
  const length=Math.hypot(wall.b[0]-wall.a[0],wall.b[1]-wall.a[1])/PLAN_SCALE,apertures=wallApertures(wall);let cursor=0;
  for(const a of apertures){
   solid(wall,cursor,a.lo,bottom,top-bottom,wall.material||'plaster',true);
   solid(wall,a.lo,a.hi,bottom,a.base-bottom,wall.material||'plaster',a.kind==='window');
   solid(wall,a.lo,a.hi,a.base+a.height,top-a.base-a.height);
   for(const end of [a.lo,a.hi])solid(wall,end-.022,end+.022,a.base,a.height,'steel',false,.19);
   solid(wall,a.lo,a.hi,a.base+a.height-.025,.05,'steel',false,.19);
   if(['window','closed','lift'].includes(a.kind)){
    solid(wall,a.lo,a.hi,a.base,a.height,a.kind==='window'?'glass':a.kind==='lift'?'steel':'walnut',true,.045);
    if(a.kind==='window')for(let t=a.lo+.6;t<a.hi;t+=.6)solid(wall,t-.014,t+.014,a.base,a.height,'black',false,.06);
    if(a.kind==='lift')solid(wall,(a.lo+a.hi)/2-.008,(a.lo+a.hi)/2+.008,a.base,a.height,'black',false,.06);
   }
   cursor=a.hi;
  }
  solid(wall,cursor,length,bottom,top-bottom,wall.material||'plaster',true);
  world.architectureWalls.push({...wall,length,apertures});
 }
 return world.architectureWalls;
}
