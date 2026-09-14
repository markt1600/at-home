import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {BALCONY_DOORS,PLAN_SCALE,planPoint,MIRROR_POSITION,MIRROR_YAW,GUEST_MIRROR_POSITION,MASTER_VANITY} from './house-layout.js';
import {POWDER_MIRROR,GUEST_BATH_MIRROR} from './house-bathrooms.js';

// These planes sit on existing mirrors and fixed glazing, never on the open
// middle of a balcony doorway. Positions use the same drawing coordinates.
export function reflectionSurfaces(){
 const pane=(id,label,p,y,width,height,yaw=0,glass=false,offset=.045)=>({id,label,position:[...planPoint(...p)].toSpliced(1,0,y),width,height,yaw,glass,offset});
 return [
  {id:'bedroom-mirror',label:'bedroom mirror',position:[MIRROR_POSITION[0],MIRROR_POSITION[2],MIRROR_POSITION[1]],width:.87,height:2.08,yaw:MIRROR_YAW,offset:.045},
  pane('bedroom-side-mirror','mirror beside bedside cupboard',[619,398],2.015,.45,2.36,Math.PI,false,.041),
  {id:'guest-mirror',label:'second bedroom mirror',position:[GUEST_MIRROR_POSITION[0],GUEST_MIRROR_POSITION[2],GUEST_MIRROR_POSITION[1]],width:.8,height:2.1,yaw:0,offset:.048},
  pane('vanity-mirror','main bathroom vanity mirror',MASTER_VANITY.mirror,MASTER_VANITY.mirrorY,MASTER_VANITY.mirrorWidth,MASTER_VANITY.mirrorHeight,0,false,.027),
  pane('guest-bath-mirror','second bathroom mirror',GUEST_BATH_MIRROR.plan,GUEST_BATH_MIRROR.y,GUEST_BATH_MIRROR.width,GUEST_BATH_MIRROR.height,GUEST_BATH_MIRROR.yaw,false,.027),
  pane('powder-mirror','powder room mirror',POWDER_MIRROR.plan,POWDER_MIRROR.y,POWDER_MIRROR.width,POWDER_MIRROR.height,POWDER_MIRROR.yaw,false,.027),
  ...BALCONY_DOORS.flatMap(d=>[-1,1].map(side=>pane(`${d.id}-${side}`,d.base?'dining balcony glass':'living balcony glass',[d.center[0],d.center[1]+side*d.width*.375*PLAN_SCALE],d.base+1.19,d.width/4-.11,2.28,Math.PI/2,true,.051))),
  pane('theatre-north','window lounge glass',[399,181],2.525,2.34,1.68,0,true,.026),
  pane('theatre-west','window lounge glass',[299,282],2.525,2.38,1.68,Math.PI/2,true,.026),
  pane('bedroom-window','bedroom window',[690,208],2.3,4.39,1.59,0,true,.026),
 ];
}

export class HouseReflections {
 constructor(world){
  this.world=world;this.mobile=globalThis.matchMedia?.('(pointer:coarse)').matches||false;this.lastRefresh=-Infinity;
  this.frustum=new THREE.Frustum();this.projection=new THREE.Matrix4();this.forward=new THREE.Vector3();this.offset=new THREE.Vector3();
  this.surfaces=reflectionSurfaces().map(spec=>{
   const shader={...Reflector.ReflectorShader,uniforms:THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms)};
   shader.uniforms.reflectionOpacity={value:spec.glass?.18:1};
   shader.fragmentShader='uniform float reflectionOpacity;\n'+shader.fragmentShader.replace('blendOverlay( base.rgb, color ), 1.0','blendOverlay( base.rgb, color ), reflectionOpacity');
   const size=this.mobile?256:512;
   const mesh=new Reflector(new THREE.PlaneGeometry(spec.width,spec.height),{shader,color:spec.glass?0x697c83:0x929a94,textureWidth:size,textureHeight:size,clipBias:.003,multisample:0});
   const normal=new THREE.Vector3(Math.sin(spec.yaw),0,Math.cos(spec.yaw));
   mesh.name=spec.label+' reflection';mesh.position.set(...spec.position).addScaledVector(normal,spec.offset);mesh.rotation.y=spec.yaw;
   mesh.material.transparent=!!spec.glass;mesh.material.depthWrite=!spec.glass;
   world.scene.add(mesh);mesh.updateMatrixWorld();return {...spec,mesh,normal,refresh:false,lastRefresh:-Infinity};
  });
  for(const pane of this.surfaces){
   const render=pane.mesh.onBeforeRender.bind(pane.mesh);
   pane.mesh.onBeforeRender=(...args)=>{
    if(!pane.refresh)return;
    pane.refresh=false;pane.lastRefresh=this.lastRefresh;
    const visibility=this.surfaces.map(p=>p.mesh.visible),renderer=args[0],viewport=renderer.getCurrentViewport(new THREE.Vector4()),target=renderer.getRenderTarget();
    // A single reflection pass must not recursively render every other pane.
    this.surfaces.forEach(p=>p.mesh.visible=false);
    try{render(...args);}finally{renderer.setRenderTarget(target);renderer.state.viewport(viewport);this.surfaces.forEach((p,i)=>p.mesh.visible=visibility[i]);}
   };
  }
 }
 update(now=performance.now()){
  this.surfaces.forEach(p=>p.refresh=false);
  if(now-this.lastRefresh<(this.mobile?200:50))return;
  const camera=this.world.camera;camera.getWorldDirection(this.forward);
  this.projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.projection);
  const candidates=[];
  for(const p of this.surfaces){
   if(!p.mesh.visible||!this.frustum.intersectsObject(p.mesh))continue;
   const d=this.offset.copy(p.mesh.position).sub(camera.position),distance=d.lengthSq();
   if(p.normal.dot(d)>=0)continue;
   const score=this.forward.dot(d.normalize())*p.width*p.height/Math.max(1,distance);
   if(score>0)candidates.push({p,score});
  }
  // Keep the two most prominent desktop panes fresh at their existing 10 Hz,
  // but capture only one per frame. Reuse the other pane's finished texture.
  const next=candidates.sort((a,b)=>b.score-a.score).slice(0,this.mobile?1:2)
   .filter(({p})=>now-p.lastRefresh>=(this.mobile?200:100))
   .sort((a,b)=>a.p.lastRefresh-b.p.lastRefresh)[0];
  if(next){next.p.refresh=true;this.lastRefresh=now;}
 }
}
