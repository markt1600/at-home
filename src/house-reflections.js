import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {BALCONY_DOORS,PLAN_SCALE,planPoint,MIRROR_POSITION,MIRROR_YAW,GUEST_MIRROR_POSITION,MASTER_VANITY} from './house-layout.js';
import {MirrorHaunting,REFLECTION_TIMING} from './mirror.js';
import {createStandingVisitor,animateStandingVisitor} from './visitors.js';
import {POWDER_MIRROR} from './house-bathrooms.js';

// These planes sit on existing mirrors and fixed glazing, never on the open
// middle of a balcony doorway. Positions use the same drawing coordinates.
export function reflectionSurfaces(){
 const pane=(id,label,p,y,width,height,yaw=0,glass=false,offset=.045)=>({id,label,position:[...planPoint(...p)].toSpliced(1,0,y),width,height,yaw,glass,offset});
 return [
  {id:'bedroom-mirror',label:'bedroom mirror',position:[MIRROR_POSITION[0],MIRROR_POSITION[2],MIRROR_POSITION[1]],width:.87,height:2.08,yaw:MIRROR_YAW,offset:.045},
  {id:'guest-mirror',label:'second bedroom mirror',position:[GUEST_MIRROR_POSITION[0],GUEST_MIRROR_POSITION[2],GUEST_MIRROR_POSITION[1]],width:.8,height:2.1,yaw:0,offset:.048},
  pane('vanity-mirror','main bathroom vanity mirror',MASTER_VANITY.mirror,MASTER_VANITY.mirrorY,MASTER_VANITY.mirrorWidth,MASTER_VANITY.mirrorHeight,0,false,.027),
  pane('powder-mirror','powder room mirror',POWDER_MIRROR.plan,POWDER_MIRROR.y,POWDER_MIRROR.width,POWDER_MIRROR.height,POWDER_MIRROR.yaw,false,.027),
  ...BALCONY_DOORS.flatMap(d=>[-1,1].map(side=>pane(`${d.id}-${side}`,d.base?'dining balcony glass':'living balcony glass',[d.center[0],d.center[1]+side*d.width*.375*PLAN_SCALE],d.base+1.19,d.width/4-.11,2.28,Math.PI/2,true,.051))),
  pane('theatre-north','window lounge glass',[399,181],2.175,2.04,2.04,0,true,.026),
  pane('theatre-west','window lounge glass',[299,282],2.175,2.24,2.04,Math.PI/2,true,.026),
  pane('bedroom-window','bedroom window',[690,208],2.3,4.39,1.59,0,true,.026),
 ];
}

export class HouseReflections {
 constructor(world){
  this.world=world;this.apparition=null;this.lastSurface=null;
  this.haunting=new MirrorHaunting(Math.random,REFLECTION_TIMING);
  this.surfaces=reflectionSurfaces().map(spec=>{
   const shader={...Reflector.ReflectorShader,uniforms:THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms)};
   shader.uniforms.reflectionOpacity={value:spec.glass?.18:1};
   shader.fragmentShader='uniform float reflectionOpacity;\n'+shader.fragmentShader.replace('blendOverlay( base.rgb, color ), 1.0','blendOverlay( base.rgb, color ), reflectionOpacity');
   const mesh=new Reflector(new THREE.PlaneGeometry(spec.width,spec.height),{shader,color:spec.glass?0x697c83:0x929a94,textureWidth:512,textureHeight:512,clipBias:.003,multisample:0});
   const normal=new THREE.Vector3(Math.sin(spec.yaw),0,Math.cos(spec.yaw));
   mesh.name=spec.label+' reflection';mesh.position.set(...spec.position).addScaledVector(normal,spec.offset);mesh.rotation.y=spec.yaw;
   mesh.material.transparent=!!spec.glass;mesh.material.depthWrite=!spec.glass;
   world.scene.add(mesh);return {...spec,mesh,normal,refresh:false};
  });
  for(const pane of this.surfaces){
   const render=pane.mesh.onBeforeRender.bind(pane.mesh);
   pane.mesh.onBeforeRender=(...args)=>{
    if(!pane.refresh)return;
    const visibility=this.surfaces.map(p=>p.mesh.visible),apparition=this.apparition,wasVisible=apparition?.visible;
    // A single reflection pass must not recursively render every other pane.
    this.surfaces.forEach(p=>p.mesh.visible=false);if(apparition)apparition.visible=false;
    try{render(...args);}finally{this.surfaces.forEach((p,i)=>p.mesh.visible=visibility[i]);if(apparition)apparition.visible=wasVisible;}
   };
  }
 }
 clear(){
  if(!this.apparition)return;
  this.world.scene.remove(this.apparition);
  this.apparition.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.map?.dispose();o.material.dispose();}});
  this.apparition=null;
 }
 reset(){this.clear();this.haunting.reset();this.lastSurface=null;}
 reveal(pane,portrait,{special=Math.random()<.4}={}){
  if(special)portrait=Math.random()<.5?9:11;
  const atlas=this.world.standingAtlases[Math.floor(portrait/3)];if(!atlas?.userData.frames)return false;
  this.clear();const height=Math.min(1.75,pane.height*.85);
  const g=createStandingVisitor(atlas,portrait,{height,shadow:false,animation:special?'reflection':'idle'});
  g.name='Unreliable reflection';g.scale.x=-1;g.rotation.y=pane.yaw;
  g.position.copy(pane.mesh.position).addScaledVector(pane.normal,pane.glass?.0015:.008);g.position.y-=height/2;
  const material=g.userData.body.material;material.color.set(pane.glass?0x71838c:0xa7b3aa);material.opacity=0;material.depthWrite=false;material.side=THREE.FrontSide;
  this.apparition=g;this.apparitionPane=pane;this.apparitionTime=0;this.world.scene.add(g);
  this.world.onReflection?.({surface:pane.label,glass:!!pane.glass});return true;
 }
 update(dt){
  const world=this.world,camera=world.camera,forward=camera.getWorldDirection(new THREE.Vector3()),active=world.mode==='play'&&!world.paused;
  const candidates=this.surfaces.map(p=>{
   const to=p.mesh.position.clone().sub(camera.position),distance=to.length(),facing=forward.dot(to.clone().normalize()),front=p.normal.dot(to)<-.05;
   return {pane:p,to,distance,facing,front,score:p.width*p.height/Math.max(1,distance*distance)*Math.max(0,facing)};
  }).filter(c=>c.front&&c.facing>.12&&c.distance<24).sort((a,b)=>b.score-a.score);
  // Refresh at most two camera-facing panes per frame. All other panes reuse
  // their last image, keeping a house full of glass affordable on laptops.
  this.surfaces.forEach(p=>p.refresh=false);candidates.slice(0,2).forEach(c=>c.pane.refresh=true);
  const near=candidates.find(c=>{
   if(c.distance>5.2||c.facing<.55)return false;
   const ray=new THREE.Raycaster(camera.position,c.to.clone().normalize(),.04,Math.max(.04,c.distance-.16));
   return !ray.intersectObject(world.houseRoot,true).some(h=>h.object.isMesh&&!h.object.material.transparent);
  });
  if(active&&near?.pane.id!==this.lastSurface){this.haunting.wasNear=false;this.lastSurface=near?.pane.id;}
  const event=this.haunting.tick(dt,{active,near:!!near,moving:world.walking});
  if(event?.type==='show'&&near)this.reveal(near.pane,event.portrait);
  if(event?.type==='hide'||world.mode!=='play')this.clear();
  if(this.apparition){
   if(active)this.apparitionTime+=dt;
   const t=this.apparitionTime;
   this.apparition.userData.body.material.opacity=Math.min(1,t/.4,Math.max(0,(5.3-t)/.65))*(this.apparitionPane.glass?.68:.92);
   animateStandingVisitor(this.apparition,active?dt:0,world.motion);
  }
 }
}
