import * as THREE from 'three';
import {planPoint,HOUSE_ROOMS} from './house-layout.js';
import {memoryMedia} from './memory-media.js';

// The existing generated sky film keeps the screen usable without personal media.
export const EXPLORATION_MOVIE={id:'house-galaxy-film',title:'A little closer to the stars',type:'video',src:'/art/telescope/galaxy.mp4'};

export const cinemaVideos=memories=>memories.flatMap(memory=>memoryMedia(memory).filter(item=>item.type==='video'&&item.src).map(item=>({...memory,type:'video',media:[item],src:item.src,soundtrack:null})));

export class Cinema{
 constructor(world,screen){
  this.world=world;this.screen=screen;this.active=false;this.darkness=0;this.curtains=[];
  this.face=new THREE.Mesh(new THREE.PlaneGeometry(3.66,1.76),new THREE.MeshBasicMaterial({color:0xe5e5df,toneMapped:false}));
  this.face.position.z=.067;this.face.userData.dynamic=true;this.face.name='Movie playback surface';screen.add(this.face);
  const cloth=new THREE.MeshStandardMaterial({color:0x77736c,roughness:1,side:THREE.DoubleSide}),[cx,cz]=planPoint(405,293);
  for(const wall of world.architectureWalls)for(const a of wall.apertures.filter(a=>a.id.startsWith('theatre-window'))){
   const [ax,az]=planPoint(...wall.a),[bx,bz]=planPoint(...wall.b),len=Math.hypot(bx-ax,bz-az),dx=(bx-ax)/len,dz=(bz-az)/len;
   const x=ax+dx*(a.lo+a.hi)/2,z=az+dz*(a.lo+a.hi)/2,nx=-dz,nz=dx,sign=(cx-x)*nx+(cz-z)*nz>0?1:-1,width=a.hi-a.lo+.10;
   const g=new THREE.Group();g.name='Closing cinema curtains · '+a.id;g.userData.dynamic=true;g.position.set(x+nx*sign*.13,a.base+a.height/2,z+nz*sign*.13);g.rotation.y=-Math.atan2(dz,dx);world.houseRoot.add(g);
   const geo=new THREE.PlaneGeometry(width/2+.025,a.height+.16,32,1),p=geo.attributes.position;
   for(let i=0;i<p.count;i++)p.setZ(i,.032*Math.cos(p.getX(i)*55));geo.computeVertexNormals();
   for(const side of [-1,1]){const mesh=new THREE.Mesh(geo,cloth);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);this.curtains.push({mesh,width,side});}
  }
  this.paintCurtains();screen.updateWorldMatrix(true,true);
  world.houseInteractions.add({id:'cinema-screen',pos:screen.localToWorld(new THREE.Vector3(0,0,.09)),range:5.8,touchObjects:[this.face],surfaceOffset:.12,label:()=>this.active?'Stop the movie':this.memoryMode===false?'Play a movie':'Play a movie memory',activate:()=>world.onCinemaPlay?.()});
 }
 enter(){
  if(this.active)return;this.active=true;this.ready=false;this.face.material.color.set(0x050607);
 }
 attachVideo(video){
  this.detachVideo();this.video=video;video.crossOrigin='anonymous';this.texture=new THREE.VideoTexture(video);this.texture.colorSpace=THREE.SRGBColorSpace;this.face.material.map=this.texture;this.face.material.color.set(0xffffff);this.face.material.needsUpdate=true;
  this.fit=()=>{if(!video.videoWidth||!video.videoHeight)return;const ratio=video.videoWidth/video.videoHeight,screenRatio=3.66/1.76;this.face.scale.set(ratio<screenRatio?ratio/screenRatio:1,ratio>screenRatio?screenRatio/ratio:1,1);};
  video.addEventListener('loadedmetadata',this.fit);this.fit();
 }
 detachVideo(){if(this.video)this.video.removeEventListener('loadedmetadata',this.fit);this.video=null;this.texture?.dispose();this.texture=null;this.face.material.map=null;this.face.material.needsUpdate=true;this.face.scale.set(1,1,1);}
 paintCurtains(){for(const {mesh,width,side} of this.curtains){mesh.scale.x=THREE.MathUtils.lerp(.075,1,this.darkness);mesh.position.x=side*THREE.MathUtils.lerp(width/2-.035,width/4,this.darkness);}}
 update(dt){
  const target=this.active?1:0;if(Math.abs(this.darkness-target)>.001){this.darkness=THREE.MathUtils.damp(this.darkness,target,3,dt);if(Math.abs(this.darkness-target)<.005)this.darkness=target;this.paintCurtains();this.world.daylight.sun.shadow.needsUpdate=true;}
  if(this.active&&!this.ready&&this.darkness>.96){this.ready=true;this.onReady?.();}
  if(this.dimUniform)this.dimUniform.value=this.darkness;
  if(this.video)this.video.volume=(this.volume??.65)*THREE.MathUtils.clamp(1-(this.screen.position.distanceTo(this.world.camera.position)-2)/12,0,1);
 }
 leave(){
  if(!this.active)return;this.active=false;this.onReady=null;this.detachVideo();this.face.material.color.set(0xe5e5df);
 }
 installRoomDimming(){
  // One shared scalar and a world-space room mask keep the theatre dark even
  // when seen through the doorway, without dimming the rest of the house.
  this.dimUniform={value:0};const polygon=HOUSE_ROOMS.find(r=>r.id==='theatre').polygon,materials=new Set();
  this.world.houseRoot.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.isMeshStandardMaterial)materials.add(m);});
  const edges=polygon.flatMap((a,i)=>{const b=polygon[(i+1)%polygon.length];if(Math.abs(b[1]-a[1])<.00001)return [];return `if((${a[1].toFixed(6)}>vCinemaWorld.z)!=(${b[1].toFixed(6)}>vCinemaWorld.z)) {if(vCinemaWorld.x<(${(b[0]-a[0]).toFixed(6)})*(vCinemaWorld.z-(${a[1].toFixed(6)}))/(${(b[1]-a[1]).toFixed(6)})+(${a[0].toFixed(6)}))cinemaInside=!cinemaInside;}`;}).join('\n');
  for(const material of materials){const previous=material.onBeforeCompile,key=material.customProgramCacheKey();material.onBeforeCompile=shader=>{
   previous.call(material,shader);shader.uniforms.uCinemaDim=this.dimUniform;
   shader.vertexShader='varying vec3 vCinemaWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvec4 cinemaPosition=vec4(transformed,1.);\n#ifdef USE_INSTANCING\ncinemaPosition=instanceMatrix*cinemaPosition;\n#endif\nvCinemaWorld=(modelMatrix*cinemaPosition).xyz;');
   shader.fragmentShader='varying vec3 vCinemaWorld; uniform float uCinemaDim;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`if(uCinemaDim>.001){bool cinemaInside=false;\n${edges}\nif(cinemaInside)outgoingLight*=1.-.92*uCinemaDim;}\n#include <opaque_fragment>`);
  };material.customProgramCacheKey=()=>key+'-cinema-room-v1';material.needsUpdate=true;}
 }
}
