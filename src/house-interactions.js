import * as THREE from 'three';
import {planPoint} from './house-layout.js';

// Fixture states belong to this visit to the house; paused time stops the water
// and lift timers. Only small moving parts stay outside the static mesh batches.
export class HouseInteractions{
 constructor(world){this.world=world;this.items=new Map();}
 add(item){this.items.set(item.id,item);return item;}
 label(id){return this.items.get(id)?.label()||'';}
 update(dt){for(const item of this.items.values())item.update?.(dt);}
 select(camera=this.world.camera){
  const forward=camera.getWorldDirection(new THREE.Vector3());let chosen=null,best=0;
  for(const item of this.items.values()){
   if(item.available&&!item.available())continue;
   const d=item.pos.clone().sub(camera.position),distance=d.length(),aim=forward.dot(d.clone().normalize());
   if(distance>(item.range||2.15)||aim<.94||aim<=best)continue;
   const ray=new THREE.Raycaster(camera.position,d.normalize(),.025,Math.max(.026,distance-(item.surfaceOffset||.06)));
   if(ray.intersectObject(this.world.houseRoot,true).some(h=>!h.object.material.transparent))continue;
   chosen=item.id;best=aim;
  }return chosen;
 }
 selectRay(ray){
  let chosen=null;
  const obstruction=ray.intersectObject(this.world.houseRoot,true).find(hit=>!hit.object.material.transparent)?.distance??Infinity;
  for(const item of this.items.values()){
   if(item.available&&!item.available())continue;
   let distance=Infinity;
   if(item.touchObjects){for(const object of item.touchObjects)for(const hit of ray.intersectObject(object,true))distance=Math.min(distance,hit.distance);}
   else for(const point of item.touchPoints||[item.pos]){
    if(point.distanceTo(ray.ray.origin)>(item.range||2.15))continue;
    const hit=ray.ray.intersectSphere(new THREE.Sphere(point,item.touchRadius||.16),new THREE.Vector3());
    if(hit)distance=Math.min(distance,hit.distanceTo(ray.ray.origin));
   }
   if(distance>(item.range||2.15)||distance>obstruction+.025||distance>=(chosen?.distance??Infinity))continue;
   chosen={id:item.id,distance};
  }return chosen;
 }
 activate(id,ray=null){const item=this.items.get(id);if(!item||(ray?this.selectRay(ray)?.id:this.select())!==id)return false;item.activate();this.world.onLook?.(id);return true;}
}
const dynamic=g=>{g.userData.dynamic=true;return g;};
function mesh(parent,geo,material,x=0,y=0,z=0){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);parent.add(m);return m;}
function positioned(root,plan,y,yaw=0){const g=new THREE.Group(),[x,z]=planPoint(...plan);g.position.set(x,y,z);g.rotation.y=yaw;root.add(g);return g;}
function position(g,p){g.updateWorldMatrix(true,false);return g.localToWorld(new THREE.Vector3(...p));}

export function addWaterTap(world,parent,{id,name,spout,bottom,control,handle,shower=false,onChange=()=>{}}){
 const water=dynamic(new THREE.Group());water.name=name+' water';parent.add(water);water.visible=false;
 const material=new THREE.MeshStandardMaterial({color:0xafdce5,roughness:.14,metalness:.08,transparent:true,opacity:.55,depthWrite:false});
 const height=spout[1]-bottom;
 if(shower){
  const points=[];for(let i=0;i<25;i++){const a=i*2.4,r=.08*Math.sqrt(i/25),x=spout[0]+Math.cos(a)*r,z=spout[2]+Math.sin(a)*r;points.push(x,bottom,z,x,spout[1],z);}
  const geo=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  const rain=new THREE.LineSegments(geo,new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:'varying float level; void main(){level=position.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float time; varying float level; void main(){float streak=smoothstep(.10,.3,fract(level*5.+time*3.7));gl_FragColor=vec4(.69,.88,.94,streak*.55);}'}));water.add(rain);water.userData.rain=rain;
 }else mesh(water,new THREE.CylinderGeometry(.009,.013,height,8),material,spout[0],bottom+height/2,spout[2]);
 const rings=[];for(let i=0;i<3;i++){const ring=mesh(water,new THREE.RingGeometry(.031,.036,28),material,spout[0],bottom+.002+i*.001,spout[2]);ring.rotation.x=-Math.PI/2;rings.push(ring);}
 if(handle)dynamic(handle);
 let running=false,time=0;const initial=handle?.rotation.z||0;
 const item=world.houseInteractions.add({id,pos:position(parent,control||spout),touchPoints:[position(parent,control||spout),position(parent,spout)],surfaceOffset:.095,
  label:()=>`${running?'Turn off':'Turn on'} ${name}`,get running(){return running;},water,
  setRunning(value){running=!!value;water.visible=running;onChange(running);},
  activate(){this.setRunning(!running);},
  update(dt){if(dt<=0)return;time+=dt;if(handle)handle.rotation.z=THREE.MathUtils.damp(handle.rotation.z,initial+(running?.65:0),9,dt);if(!running)return;
   if(water.userData.rain)water.userData.rain.material.uniforms.time.value=time;
   rings.forEach((r,i)=>r.scale.setScalar(1+((time*1.3+i/3)%1)*(shower?5:2)));
  }
 });return item;
}

export function addBathWater(world,tub,filler,handle){
 const g=dynamic(new THREE.Group());g.name='Bath water level';tub.add(g);
 const water=mesh(g,new THREE.CircleGeometry(1,64),new THREE.MeshStandardMaterial({color:0x9dc9ca,roughness:.16,transparent:true,opacity:.73,depthWrite:false}));water.rotation.x=-Math.PI/2;g.visible=false;
 let level=0,draining=false;
 const tap=addWaterTap(world,filler,{id:'bath-tap',name:'bath tap',spout:[0,.798,-.30],bottom:.20,control:[.065,.65,.02],handle,onChange:running=>{if(running)draining=false;}});
 const tapUpdate=tap.update;tap.update=dt=>{tapUpdate.call(tap,dt);if(dt<=0)return;level=THREE.MathUtils.clamp(level+dt*(tap.running?1/35:draining?-1/20:0),0,1);if(level>=1&&tap.running)tap.setRunning(false);if(!level)draining=false;
  g.visible=level>0;water.position.y=.165+level*.365;const radius=.28+level*.075;water.scale.set(radius*2.15,radius,1);
 };tap.getLevel=()=>level;
 world.houseInteractions.add({id:'bath-drain',pos:position(tub,[.18,.62,0]),surfaceOffset:.10,available:()=>level>.01,label:()=>draining?'Close bath drain':'Drain bath',activate(){draining=!draining;if(draining)tap.setRunning(false);}});
}

export function buildInteractiveFridge(world,root,m){
 const g=positioned(root,[632.65,812.5],.45,-Math.PI/2);g.name='Opening kitchen fridge';
 const B=(w,h,d,x,y,z,material=m.steel,parent=g)=>world.box(w,h,d,x,y,z,material,parent);
 const inside=world.mat(0xe9ebe3,.45),food=world.mat(0x76965c,.78);
 for(const x of [-.397,.397])B(.046,1.98,.74,x,.99,0);
 for(const y of [.028,1.952])B(.75,.056,.74,0,y,0);
 B(.75,1.88,.04,0,.99,-.35);B(.75,1.86,.006,0,.99,-.326,inside);B(.75,.025,.65,0,.25,-.01,inside);
 for(const y of [.50,.84,1.18,1.51]){B(.75,.018,.59,0,y,-.02,inside);for(let i=0;i<3;i++){const x=-.23+i*.23;world.cyl(.052,.057,.17,x,y+.094,-.16,i===1?food:inside,g,10);world.cyl(.042,.042,.025,x,y+.19,-.16,m.steel,g,10);}}
 B(.71,.20,.51,0,.125,-.015,inside);
 const door=dynamic(new THREE.Group());door.name='Fridge hinged door';door.position.set(-.42,0,.37);g.add(door);
 B(.84,1.98,.055,.42,.99,0,m.steel,door);B(.018,.64,.047,.76,1.24,.052,m.black,door);
 B(.75,1.82,.015,.42,.99,-.034,inside,door);
 for(const y of [.35,.9,1.48]){B(.69,.025,.10,.42,y,-.089,inside,door);B(.69,.085,.017,.42,y+.04,-.145,inside,door);}
 g.updateWorldMatrix(true,true);const center=position(g,[0,0,0]);world.colliders.push({x:center.x,z:center.z,w:.84,d:.74,angle:g.rotation.y});
 const collider={x:0,z:0,w:.84,d:.06,angle:0,wall:'fridge-door'};world.colliders.push(collider);
 let open=false;
 const updateCollider=()=>{g.updateWorldMatrix(true,true);const p=door.localToWorld(new THREE.Vector3(.42,0,0));Object.assign(collider,{x:p.x,z:p.z,angle:g.rotation.y+door.rotation.y});};updateCollider();
 const item=world.houseInteractions.add({id:'fridge',pos:position(g,[.10,1.25,.43]),touchObjects:[door],surfaceOffset:.12,label:()=>open?'Close fridge':'Open fridge',door,get open(){return open;},activate(){open=!open;},update(dt){if(dt<=0)return;const before=door.rotation.y,desired=open?-1.7:0;door.rotation.y=THREE.MathUtils.damp(before,desired,5,dt);
  // Do not sweep a closing door through the player. Leave it open and retry later.
  updateCollider();const p=world.camera?.position;if(!open&&p){const dx=p.x-collider.x,dz=p.z-collider.z,a=collider.angle;if(Math.abs(dx*Math.cos(a)-dz*Math.sin(a))<.57&&Math.abs(dx*Math.sin(a)+dz*Math.cos(a))<.19){open=true;door.rotation.y=before;updateCollider();}}
 }});return item;
}

export function buildLift(world,root,m){
 const g=positioned(root,[974.5,849.5],.45,Math.PI/4);g.name='Lift sliding doors';
 const leaves=[];for(const sign of [-1,1]){const leaf=dynamic(new THREE.Group());leaf.position.x=sign*.375;g.add(leaf);world.box(.746,2.3,.048,0,1.15,0,m.steel,leaf);world.box(.014,2.27,.051,-sign*.366,1.15,0,m.black,leaf);leaves.push({leaf,sign});}
 const panel=positioned(root,[949,871],1.8,Math.PI/4);panel.name='Lift call button';world.box(.13,.23,.04,0,0,0,m.black,panel);
 const lampMat=new THREE.MeshStandardMaterial({color:0xe4dfc3,emissive:0xe0bc67,emissiveIntensity:.05,roughness:.35});
 const button=dynamic(mesh(panel,new THREE.CylinderGeometry(.027,.027,.012,20),lampMat,0,0,-.027));button.rotation.x=Math.PI/2;
 const car=positioned(root,[999,874],.45,Math.PI/4);world.box(1.30,.035,.035,0,1.02,0,m.steel,car);
 let state='closed',timer=0,slide=0;
 world.houseInteractions.add({id:'lift',pos:position(panel,[0,0,-.04]),surfaceOffset:.05,range:1.8,label:()=>state==='calling'?'Lift arriving…':state==='open'?'Hold lift doors':'Call lift',get state(){return state;},leaves,
  activate(){if(state==='closed'||state==='closing'){state='calling';timer=2;}else if(state==='open')timer=7;},
  update(dt){if(dt<=0)return;timer-=dt;if(state==='calling'&&timer<=0){state='opening';world.onLiftArrival?.();}if(state==='opening'){slide=Math.min(1,slide+dt*.75);if(slide===1){state='open';timer=7;}}else if(state==='open'&&timer<=0)state='closing';else if(state==='closing'){slide=Math.max(0,slide-dt*.55);if(slide===0)state='closed';}
   for(const {leaf,sign} of leaves)leaf.position.x=sign*(.375+slide*.755);lampMat.emissiveIntensity=state==='closed'?.05:.9;
  }
 });
}
