import * as THREE from 'three';
import {buildHouse} from './house.js';
import {optimizeHouse} from './house-meshes.js';
import {applyHouseTextures} from './house-materials.js';
import {applyHallwayArt} from './house-gallery.js';
import {applyBathroomTextures} from './house-bathrooms.js';
import {HouseReflections} from './house-reflections.js';
import {Daylight} from './daylight.js';
import {HOUSE_VIEWS,HOUSE_ROOMS,planPoint,floorHeight,pointInPolygon,VISITOR_POSITION} from './house-layout.js';
import {moveAlongFloor} from './navigation.js';
import {createActor} from './actors.js';
import {PETS,NEIGHBORS} from './life.js';
export class House{
 constructor(canvas,onLook=()=>{},onTick=()=>{}){
  this.canvas=canvas;this.onLook=onLook;this.onTick=onTick;this.scene=new THREE.Scene();this.scene.fog=new THREE.FogExp2(0xc9dce6,.002);
  this.camera=new THREE.PerspectiveCamera(62,1,.06,100);this.scene.add(this.camera);this.renderer=new THREE.WebGLRenderer({canvas,antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  Object.assign(this,{materials:{},colliders:[],targets:[],keys:{},actors:new Map(),mode:'menu',paused:false,motion:true,yaw:0,pitch:0,elapsed:0,hours:7.25,room:'living',walking:false});
  buildHouse(this);this.targets=[];optimizeHouse(this);this.flashlight.visible=false;this.daylight=new Daylight(this);this.reflections=new HouseReflections(this);this.door.rotation.y=-1.45;this.buildPetCorners();
  this.loadArtwork();this.focus('living');this.resize();this.clock=new THREE.Clock();
  window.addEventListener('resize',()=>this.resize());window.addEventListener('blur',()=>{this.keys={};});
  document.addEventListener('keydown',e=>{if(this.paused||e.target.matches('input,textarea,select'))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();this.keys[e.code]=true;}});
  document.addEventListener('keyup',e=>delete this.keys[e.code]);document.addEventListener('pointerlockchange',()=>document.body.classList.toggle('wandering',document.pointerLockElement===canvas));
  document.addEventListener('mousemove',e=>{if(document.pointerLockElement!==canvas||this.paused)return;this.yaw-=e.movementX*.0018;this.pitch=THREE.MathUtils.clamp(this.pitch-e.movementY*.0018,-1.15,1.05);});
  canvas.addEventListener('click',()=>this.lock());this.animate();
  let drag=null;canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&!this.paused)drag=[e.clientX,e.clientY];});canvas.addEventListener('pointermove',e=>{if(!drag)return;this.yaw-=(e.clientX-drag[0])*.005;this.pitch=THREE.MathUtils.clamp(this.pitch-(e.clientY-drag[1])*.005,-1.3,1.05);drag=[e.clientX,e.clientY];});canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
 }
 mat(color,roughness=.8,metalness=0){const key=[color,roughness,metalness].join();return this.materials[key]||(this.materials[key]=new THREE.MeshStandardMaterial({color,roughness,metalness}));}
 box(w,h,d,x,y,z,mat,parent=this.scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof mat==='number'?this.mat(mat):mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 cyl(rt,rb,h,x,y,z,mat,parent=this.scene,n=12){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,n),typeof mat==='number'?this.mat(mat):mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
 sphere(r,x,y,z,mat,parent=this.scene,sx=1,sy=1,sz=1){const m=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),typeof mat==='number'?this.mat(mat):mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;}
 buildPetCorners(){this.petCorners=new Map();for(const p of PETS){const [x,z]=planPoint(...p.plan),y=floorHeight(x,z),g=new THREE.Group();g.name=p.name+' care corner';g.position.set(x,y+.012,z);this.scene.add(g);const size=p.id==='sunny'?.48:p.id==='miso'?.32:.26;this.cyl(size,size,.018,0,0,0,this.mat(p.id==='pebble'?0xc1b596:0xb7c19b),g,48);const contents=[];for(const [i,color] of [0x755239,0x8eafb6].entries()){const px=size+.17,pz=(i-.5)*.30;const bowl=this.cyl(.135,.115,.045,px,.022,pz,this.mat(0xabb69e,.35),g,32);const liquid=this.cyl(.113,.113,.006,px,.047,pz,this.mat(color,.2),g,32);contents.push(liquid);if(i===0)for(let j=0;j<9;j++){const a=j*2.4,r=.025+(j%3)*.026;this.sphere(p.id==='pebble'?.027:.012,px+Math.cos(a)*r,.058,pz+Math.sin(a)*r,this.mat(p.id==='pebble'?0x63854a:0x976c40),g,1,p.id==='pebble'?.18:1,1.5);}}
  if(p.id==='sunny')this.sphere(.07,-.55,.07,.18,this.mat(0xc88557,.95),g);this.petCorners.set(p.id,{g,contents,care:0});}}
 showCare(id,action){const corner=this.petCorners.get(id);if(corner){corner.care=2.8;corner.action=action;}const actor=this.actors.get(id);if(actor)actor.userData.careUntil=this.elapsed+6;}
 lookAtActor(id){const actor=this.actors.get(id);if(!actor)return;const h=PETS.find(p=>p.id===id)?.height||1.7;this.camera.lookAt(actor.position.clone().add(new THREE.Vector3(0,h*.75,0)));const e=new THREE.Euler().setFromQuaternion(this.camera.quaternion,'YXZ');this.yaw=e.y;this.pitch=e.x;}
 setMemories(memories){if(this.memoryMarkers){this.scene.remove(this.memoryMarkers);this.memoryMarkers.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});}this.memoryMarkers=new THREE.Group();this.scene.add(this.memoryMarkers);for(const memory of memories){const g=new THREE.Group();g.position.set(...memory.position);const disk=new THREE.Mesh(new THREE.RingGeometry(.16,.19,48),new THREE.MeshBasicMaterial({color:0xc2b676,transparent:true,opacity:.65,depthWrite:false}));disk.rotation.x=-Math.PI/2;disk.position.y=.025;g.add(disk);this.memoryMarkers.add(g);}}
 loadArtwork(){const loader=new THREE.TextureLoader(),a=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());loader.load('/art/house-surfaces-v2.png',t=>applyHouseTextures(t,this.houseMaterials,a));loader.load('/art/hallway-prints.webp',t=>applyHallwayArt(t,this.houseMaterials,a));loader.load('/art/powder-marble.webp',t=>applyBathroomTextures(t,this.houseMaterials,a));fetch('/art/friends/framing.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(f=>{this.framing=f;this.syncPeople(this.life);}).catch(()=>this.onAssetError?.());}
 syncPeople(s){this.life=s;if(!s||!this.framing)return;const specs=PETS.map(p=>({...p,position:planPoint(...p.plan)}));
  if(s.pending){const n=NEIGHBORS.find(n=>n.id===s.pending);specs.push({...n,position:[VISITOR_POSITION[0],VISITOR_POSITION[2]]});}
  for(const [i,v] of s.guests.entries()){const n=NEIGHBORS.find(n=>n.id===v.id);specs.push({...n,position:planPoint(...[[372,610],[495,578],[345,820]][i])});}
  const ids=new Set(specs.map(p=>p.id));for(const [id,g] of this.actors)if(!ids.has(id)){this.scene.remove(g);g.userData.dispose();this.actors.delete(id);}
  for(const spec of specs){if(!this.framing[spec.id])continue;let g=this.actors.get(spec.id);if(!g){g=createActor(spec.id,spec.height,this.framing[spec.id]);this.actors.set(spec.id,g);this.scene.add(g);}g.position.set(spec.position[0],floorHeight(...spec.position),spec.position[1]);}
 }
 focus(id){const p=HOUSE_VIEWS[id]||HOUSE_VIEWS.living;this.camera.position.set(...p.slice(0,3));this.yaw=p[3];this.pitch=p[4];this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');this.room=id;this.keys={};this.eyeHeight=1.67;}
 lookAtPet(id){const p=PETS.find(p=>p.id===id);if(!p)return;const [x,z]=planPoint(...p.plan);this.focus(id==='pebble'?'dining':'living');const positions={miso:[400,670],sunny:[502,681],pebble:[346,812]},[a,b]=planPoint(...positions[id]);this.eyeHeight=id==='sunny'?1:.65;this.camera.position.set(a,floorHeight(a,b)+this.eyeHeight,b);this.camera.lookAt(x,floorHeight(x,z)+p.height/2,z);const e=new THREE.Euler().setFromQuaternion(this.camera.quaternion,'YXZ');this.yaw=e.y;this.pitch=e.x;}
 lock(){if(this.mode!=='play'||this.paused||matchMedia('(pointer:coarse)').matches)return;this.canvas.requestPointerLock()?.catch(()=>{});}
 unlock(){this.keys={};if(document.pointerLockElement)document.exitPointerLock();}
 resize(){this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);}
 animate(){requestAnimationFrame(()=>this.animate());const dt=Math.min(this.clock.getDelta(),.05);this.elapsed+=dt;const active=this.mode==='play'&&!this.paused&&!document.hidden;this.walking=false;
  if(active){const v=new THREE.Vector3((this.keys.KeyD||this.keys.ArrowRight?1:0)-(this.keys.KeyA||this.keys.ArrowLeft?1:0),0,(this.keys.KeyS||this.keys.ArrowDown?1:0)-(this.keys.KeyW||this.keys.ArrowUp?1:0));if(v.length()){this.eyeHeight=1.67;v.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),this.yaw);const s=moveAlongFloor(this.camera.position.x,this.camera.position.z,v.x*dt*1.9,v.z*dt*1.9,this.colliders);this.camera.position.x=s.x;this.camera.position.z=s.z;this.walking=s.distance>.001;this.walkPhase=(this.walkPhase||0)+s.distance*10;if(this.walking&&this.elapsed-(this.lastStep||0)>.55){this.lastStep=this.elapsed;this.onStep?.();}}
   this.camera.position.y=THREE.MathUtils.lerp(this.camera.position.y,floorHeight(this.camera.position.x,this.camera.position.z)+(this.eyeHeight||1.67)+(this.motion&&this.walking?Math.sin(this.walkPhase)*.012:0),1-Math.exp(-14*dt));
   this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');this.onTick(dt);this.room=HOUSE_ROOMS.find(r=>pointInPolygon(this.camera.position.x,this.camera.position.z,r.polygon))?.id||this.room;
  }
  this.daylight.update(this.hours);let nearest=null;const forward=this.camera.getWorldDirection(new THREE.Vector3());
  this.memoryMarkers?.children.forEach(g=>g.visible=g.position.distanceTo(this.camera.position)<6);
  const animated=this.mode==='play'&&!document.hidden&&(!this.paused||this.previewAnimation);
  for(const [id,g] of this.actors){const distance=g.position.distanceTo(this.camera.position);g.rotation.y=Math.atan2(this.camera.position.x-g.position.x,this.camera.position.z-g.position.z);g.userData.update(animated?dt:0,this.motion,distance<9);const d=g.position.clone().add(new THREE.Vector3(0,PETS.find(p=>p.id===id)?.height/2||1.3,0)).sub(this.camera.position);if(distance<3.3&&forward.dot(d.clone().normalize())>.85){const ray=new THREE.Raycaster(this.camera.position,d.clone().normalize(),.05,d.length()-.08);if(!ray.intersectObject(this.houseRoot,true).some(hit=>!hit.object.material.transparent))nearest=id;}}
  for(const corner of this.petCorners.values()){corner.care=Math.max(0,corner.care-(animated?dt:0));for(const content of corner.contents){content.scale.setScalar(corner.care>0?1+Math.sin(corner.care*7)*.05:1);}}
  if(nearest!==this.lookTarget){this.lookTarget=nearest;this.onLook(nearest);}this.reflections.update();this.renderer.render(this.scene,this.camera);
 }
}
