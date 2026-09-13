import * as THREE from 'three';

export const TELESCOPE_CLIPS=['coffee','reading','plants','stretch','cooking'];
export const telescopeIsNight=hours=>{const h=(hours%24+24)%24;return h<6||h>=19;};
export function shuffledScenes(random=Math.random){const list=[...TELESCOPE_CLIPS];for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}
const direction=(yaw,pitch)=>new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));

export class Telescope{
 constructor(world,random=Math.random){
  this.world=world;this.random=random;this.active=false;this.media=new Map();this.panes=[];this.time=0;this.bag=[];
  this.camera=new THREE.PerspectiveCamera(12,1,.1,500);this.frustum=new THREE.Frustum();this.matrix=new THREE.Matrix4();this.sphere=new THREE.Sphere();
 }
 take(){if(!this.bag.length)this.bag=shuffledScenes(this.random);return this.bag.pop();}
 mediaFor(id){
  if(this.media.has(id))return this.media.get(id);
  const video=document.createElement('video');video.muted=true;video.loop=true;video.playsInline=true;video.preload='none';
  const texture=new THREE.VideoTexture(video);texture.colorSpace=THREE.SRGBColorSpace;
  const poster=new THREE.TextureLoader().load(`/art/telescope/${id}.webp`);poster.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map:poster,toneMapped:false,fog:false});
  const item={id,video,texture,poster,material,started:false,failed:false};video.addEventListener('error',()=>{item.failed=true;});this.media.set(id,item);return item;
 }
 build(){
  if(this.root)return;this.root=new THREE.Group();this.root.name='Telescope apartment interiors';this.world.scene.add(this.root);
  const slots=this.world.daylight.neighborhood.balconies.filter(b=>b.kind==='white'&&b.position.y>-9&&b.position.y<12&&b.position.distanceTo(this.camera.position)<110);
  for(const slot of slots){
   const scale=slot.scale||new THREE.Vector3(1,1,1),normal=new THREE.Vector3(Math.sin(slot.yaw),0,Math.cos(slot.yaw)),id=this.take();
   const mesh=new THREE.Mesh(new THREE.PlaneGeometry(4.94*scale.x,2.39*scale.y),this.mediaFor(id).material);
   mesh.name='An apartment with a quiet everyday moment';mesh.position.copy(slot.position).addScaledVector(normal,-.51*scale.z);mesh.position.y+=1.14*scale.y;mesh.rotation.y=slot.yaw;mesh.userData.scene=id;this.root.add(mesh);
   this.panes.push({mesh,id,lastSeen:0,lastChanged:0,wasVisible:false});
  }
  this.buildSky();
 }
 buildSky(){
  this.nightScene=new THREE.Scene();this.nightScene.background=new THREE.Color(0x030712);
  const pos=[];let seed=731;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
  for(let i=0;i<4500;i++){const yaw=(random()-.5)*Math.PI*2,pitch=Math.asin(random()*2-1),v=direction(yaw,pitch).multiplyScalar(220);pos.push(v.x,v.y,v.z);}
  const stars=new THREE.BufferGeometry();stars.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));this.nightScene.add(new THREE.Points(stars,new THREE.PointsMaterial({color:0xdce9ff,size:.08,sizeAttenuation:true,toneMapped:false})));
  const galaxy=this.mediaFor('galaxy');galaxy.material.transparent=true;galaxy.material.depthWrite=false;
  galaxy.material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nvec2 edge=min(vMapUv,1.-vMapUv);diffuseColor.a*=smoothstep(0.,.20,min(edge.x,edge.y));');};
  this.galaxy=new THREE.Mesh(new THREE.PlaneGeometry(52,34.67),galaxy.material);this.galaxy.position.copy(direction(.60,.57).multiplyScalar(145));this.galaxy.lookAt(0,0,0);this.nightScene.add(this.galaxy);
  // Stylized celestial objects, arranged for exploration rather than a real sky chart.
  const planet=(name,yaw,pitch,radius,colors,rings=false)=>{
   const material=new THREE.ShaderMaterial({uniforms:{light:{value:new THREE.Vector3(-.6,.45,1).normalize()},colors:{value:colors.map(c=>new THREE.Color(c))}},vertexShader:'varying vec3 n;varying vec3 p;void main(){n=normalize(normalMatrix*normal);p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 light;uniform vec3 colors[3];varying vec3 n;varying vec3 p;void main(){float band=.5+.5*sin(p.y*13.+sin(p.x*4.+p.z*6.)*.5);vec3 c=mix(colors[0],colors[1],smoothstep(.15,.85,band));c=mix(c,colors[2],pow(.5+.5*sin(p.y*31.+sin(p.z*7.)),8.)*.38);float shade=.12+.88*max(0.,dot(normalize(n),light));gl_FragColor=vec4(c*shade,1.);}' });
   const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,64,40),material);mesh.name=name;mesh.position.copy(direction(yaw,pitch).multiplyScalar(110));this.nightScene.add(mesh);
   if(rings){const ring=new THREE.Mesh(new THREE.RingGeometry(radius*1.35,radius*2.05,100),new THREE.MeshBasicMaterial({color:0xcbb99b,side:THREE.DoubleSide,transparent:true,opacity:.64,toneMapped:false}));ring.rotation.x=1.12;ring.rotation.z=.24;mesh.add(ring);}return mesh;
  };
  this.planets=[planet('Jupiter',.12,.43,3.2,[0xb58056,0xe9d1ad,0x704b37]),planet('Saturn',1.12,.42,2.6,[0xb9a783,0xe3d2ad,0x887a64],true),planet('Blue planet',.99,.89,1.9,[0x4a879a,0x7fbbbd,0x397285])];
 }
 enter(hours){
  if(this.active)return;this.active=true;this.time=0;this.night=null;this.camera.position.copy(this.world.windowLounge.telescope.position).add(new THREE.Vector3(0,1.46,-1.22));this.camera.fov=12;this.camera.aspect=this.world.camera.aspect;this.camera.updateProjectionMatrix();
  this.build();this.setPeriod(hours);this.world.keys={};this.world.jumpQueued=false;this.world.resumeWandering();this.world.onTelescopeChange?.(true);
 }
 setPeriod(hours){
  const night=telescopeIsNight(hours);if(night===this.night)return;this.night=night;this.yaw=night?.60:.57;this.pitch=night?.57:-.02;
  this.root.visible=!night;this.world.onTelescopePeriod?.(night);
 }
 pan(dx,dy){if(!this.active)return;const sensitivity=.00055*this.camera.fov/12;this.yaw=THREE.MathUtils.clamp(this.yaw-dx*sensitivity,-.48,1.6);this.pitch=THREE.MathUtils.clamp(this.pitch-dy*sensitivity,this.night?.12:-.35,this.night?1.12:.50);}
 zoom(delta){this.camera.fov=THREE.MathUtils.clamp(this.camera.fov+Math.sign(delta)*1.5,4,24);this.camera.updateProjectionMatrix();}
 update(dt,hours,motion=true){
  this.time+=dt;this.setPeriod(hours);this.camera.aspect=this.world.camera.aspect;this.camera.updateProjectionMatrix();this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');this.camera.updateMatrixWorld();
  this.matrix.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.matrix);const wanted=new Set();
  if(this.night)wanted.add('galaxy');else for(const p of this.panes){
   const visible=this.frustum.intersectsSphere(this.sphere.set(p.mesh.position,3.2));
   if(visible){
    if(!p.wasVisible&&this.time-p.lastSeen>4&&this.time-p.lastChanged>12){p.id=this.take();p.mesh.material=this.mediaFor(p.id).material;p.mesh.userData.scene=p.id;p.lastChanged=this.time;}
    wanted.add(p.id);p.lastSeen=this.time;
   }p.wasVisible=visible;
  }
  for(const [id,item] of this.media){
   const play=wanted.has(id)&&motion&&!document.hidden;
   if(play&&!item.started){item.started=true;item.video.src=`/art/telescope/${id}.mp4`;item.video.load();}
   if(play&&!item.failed&&item.video.paused)item.video.play().catch(()=>{});else if(!play&&!item.video.paused)item.video.pause();
   if(item.video.readyState>=2&&item.material.map!==item.texture){item.material.map=item.texture;item.material.needsUpdate=true;}
  }
  this.world.daylight.neighborhood.people.forEach(p=>p.root.visible=false);
  const camera=this.night?this.skyCamera():this.camera;this.world.renderer.render(this.night?this.nightScene:this.world.scene,camera);
 }
 skyCamera(){if(!this.spaceCamera)this.spaceCamera=new THREE.PerspectiveCamera();this.spaceCamera.copy(this.camera);this.spaceCamera.position.set(0,0,0);this.spaceCamera.updateMatrixWorld();return this.spaceCamera;}
 leave(){if(!this.active)return;this.active=false;this.root.visible=false;for(const item of this.media.values())item.video.pause();this.world.keys={};this.world.onTelescopeChange?.(false);}
}
