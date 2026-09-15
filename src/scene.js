import * as THREE from 'three';
import {buildHouse} from './house.js';
import {optimizeHouse} from './house-meshes.js';
import {applyHouseTextures} from './house-materials.js';
import {applyHallwayArt} from './house-gallery.js';
import {applyBathroomTextures} from './house-bathrooms.js';
import {applyDetailTexture} from './bedroom-details.js';
import {HouseReflections} from './house-reflections.js';
import {Daylight} from './daylight.js';
import {HOUSE_VIEWS,HOUSE_ROOMS,planPoint,floorHeight,pointInPolygon} from './house-layout.js';
import {moveWithJump} from './navigation.js';
import {BalconyLife} from './balcony-life.js';
import {applyHomeDetails} from './home-furnishings.js';
import {applyDiningArt} from './dining-details.js';
import {applyBalconyWallArt} from './balcony-wall-details.js';
import {preloadPetFilms,preloadPetActivities} from './pet-media.js';
import {createActor} from './actors.js';
import {createMemoryMarker} from './memory-marker.js';
import {PETS} from './life.js';
import {Moflin,MOPS_VIEW} from './moflin.js';
import {PetRoaming} from './pet-roaming.js';
import {PetSocial} from './pet-social.js';
import {AssetReadiness} from './asset-readiness.js';
import {Telescope} from './telescope.js';
import {petPose} from './pet-locomotion.js';
import {hasTouchInput,viewportBounds,fitRenderer} from './game-viewport.js';
import {installTouchLook} from './touch-controls.js';
import {installDesktopInteraction} from './desktop-controls.js';
import {optimizeLocalLights} from './render-lighting.js';
import {AdaptiveResolution} from './render-quality.js';
import {prepareHouseRenderer} from './render-preparation.js';
import {installPetBone} from './pet-bone-model.js';
import {HandInteractionBody} from './hand-interaction-body.js';
import {MassageSession} from './massage-session.js';
export class House{
 constructor(canvas,onLook=()=>{},onTick=()=>{}){
  this.canvas=canvas;this.onLook=onLook;this.onTick=onTick;this.scene=new THREE.Scene();this.scene.fog=new THREE.FogExp2(0xc9dce6,.002);
  this.camera=new THREE.PerspectiveCamera(62,1,.06,220);this.scene.add(this.camera);this.renderer=new THREE.WebGLRenderer({canvas,antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,hasTouchInput()?1.15:1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  this.renderQuality=new AdaptiveResolution(this.renderer.getPixelRatio());
  Object.assign(this,{materials:{},colliders:[],targets:[],keys:{},actors:new Map(),mode:'menu',paused:false,motion:true,yaw:0,pitch:0,elapsed:0,hours:7.25,room:'living',walking:false});
  this.handInteraction=new HandInteractionBody(this);
  buildHouse(this);this.massage=new MassageSession(this,this.massageChair);this.targets=[];optimizeHouse(this);this.cinema.installRoomDimming();this.flashlight.visible=false;this.daylight=new Daylight(this);this.reflections=new HouseReflections(this);this.door.rotation.y=-1.45;this.buildPetCorners();
  this.petRoaming=new PetRoaming(this.colliders);this.petBone=installPetBone(this);this.petSocial=new PetSocial(this.petRoaming,{canStart:()=>this.petBone.phase==='rest',ready:id=>this.actors.get(id)?.userData.playReady});this.balconyLife=new BalconyLife(this);this.telescope=new Telescope(this);optimizeLocalLights(this.scene);this.loadArtwork();this.focus('living');this.resize();this.clock=new THREE.Clock();
  this.viewportDirty=true;for(const event of ['resize','orientationchange','pageshow'])window.addEventListener(event,()=>{this.viewportDirty=true;});
  window.visualViewport?.addEventListener('resize',()=>{this.viewportDirty=true;});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.contextLost=true;this.keys={};this.touchMove={x:0,z:0};});
  canvas.addEventListener('webglcontextrestored',()=>{this.contextLost=false;this.viewportDirty=true;this.daylight.sun.shadow.needsUpdate=true;});
  window.addEventListener('blur',()=>{this.keys={};});
  document.addEventListener('keydown',e=>{if(this.mode!=='play'||this.paused||this.telescope.active||e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;if(e.code==='Space'){e.preventDefault();if(!e.repeat)this.jumpQueued=true;return;}if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();this.keys[e.code]=true;}});
  document.addEventListener('keyup',e=>delete this.keys[e.code]);document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===canvas;document.body.classList.toggle('wandering',locked||this.freeLook);if(!locked){this.keys={};if(this.mode==='play'&&!this.paused&&!document.hidden&&!this.freeLook)this.onUnlock?.();}});
  document.addEventListener('mousemove',e=>{if(hasTouchInput()||(document.pointerLockElement!==canvas&&!this.freeLook)||this.paused||this.mode!=='play')return;if(this.telescope.active){this.telescope.pan(e.movementX,e.movementY);return;}this.yaw-=e.movementX*.0018;this.pitch=THREE.MathUtils.clamp(this.pitch-e.movementY*.0018,-1.15,1.05);});
  canvas.addEventListener('wheel',e=>{if(this.telescope.active){e.preventDefault();this.telescope.zoom(e.deltaY);}},{passive:false});
  installDesktopInteraction(canvas,this);this.animate();
  installTouchLook(canvas,this);

 }
 mat(color,roughness=.8,metalness=0){const key=[color,roughness,metalness].join();return this.materials[key]||(this.materials[key]=new THREE.MeshStandardMaterial({color,roughness,metalness}));}
 box(w,h,d,x,y,z,mat,parent=this.scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof mat==='number'?this.mat(mat):mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 cyl(rt,rb,h,x,y,z,mat,parent=this.scene,n=12){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,n),typeof mat==='number'?this.mat(mat):mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
 sphere(r,x,y,z,mat,parent=this.scene,sx=1,sy=1,sz=1){const m=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),typeof mat==='number'?this.mat(mat):mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;}
 buildPetCorners(){this.petCorners=new Map();for(const p of PETS.filter(p=>!p.stationary)){const [x,z]=planPoint(...(p.carePlan||p.plan)),y=floorHeight(x,z),g=new THREE.Group();g.name=p.name+' care corner';g.position.set(x,y+.012,z);this.scene.add(g);const size=p.carePlan?.20:p.id==='sunny'?.48:p.id==='miso'?.32:.26;this.cyl(size,size,.018,0,0,0,this.mat(p.id==='pebble'?0xc1b596:0xb7c19b),g,48);const contents=[];for(const [i,color] of [0x755239,0x8eafb6].entries()){const px=size+.17,pz=(i-.5)*.30;const bowl=this.cyl(.135,.115,.045,px,.022,pz,this.mat(0xabb69e,.35),g,32);const liquid=this.cyl(.113,.113,.006,px,.047,pz,this.mat(color,.2),g,32);contents.push(liquid);if(i===0)for(let j=0;j<9;j++){const a=j*2.4,r=.025+(j%3)*.026;this.sphere(p.id==='pebble'?.027:.012,px+Math.cos(a)*r,.058,pz+Math.sin(a)*r,this.mat(p.id==='pebble'?0x63854a:0x976c40),g,1,p.id==='pebble'?.18:1,1.5);}}
  if(p.id==='sunny')this.sphere(.07,-.55,.07,.18,this.mat(0xc88557,.95),g);this.petCorners.set(p.id,{g,contents,care:0});}}
 showCare(id,action){this.petRoaming.interact(id);const corner=this.petCorners.get(id);if(corner){corner.care=2.8;corner.action=action;}const actor=this.actors.get(id);if(actor)actor.userData.careUntil=this.elapsed+6;}
 setMemories(memories){if(this.memoryMarkers){this.scene.remove(this.memoryMarkers);this.memoryMarkers.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});}this.memoryMarkers=new THREE.Group();this.scene.add(this.memoryMarkers);for(const memory of memories)this.memoryMarkers.add(createMemoryMarker(memory));}
 memoryVisible(memory){const [x,y,z]=memory.position,d=new THREE.Vector3(x,y+.027,z).sub(this.camera.position),distance=d.length();if(distance<.08)return true;const ray=new THREE.Raycaster(this.camera.position,d.normalize(),.05,distance-.025);return !ray.intersectObject(this.houseRoot,true).some(hit=>!hit.object.material.transparent);}
 loadArtwork(){
  if(this.artwork)return this.artwork.run();
  const a=Math.min(8,this.renderer.capabilities.getMaxAnisotropy()),materials=this.houseMaterials;
  const textures=[['bedroom-marble.webp',t=>applyDetailTexture(t,materials.bedroomMarble,a)],['sage-flowers.webp',t=>applyDetailTexture(t,materials.sageDrawing,a)],['balcony-collage.webp',t=>applyBalconyWallArt(t,materials,a)],['dining-prints.webp',t=>applyDiningArt(t,materials,a)],['entry-details-atlas.webp',t=>applyHomeDetails(t,materials,a)],['house-surfaces-v2.png',t=>applyHouseTextures(t,materials,a)],['hallway-prints.webp',t=>applyHallwayArt(t,materials,a)],['powder-marble.webp',t=>applyBathroomTextures(t,materials,a)]];
  const tasks=textures.map(([id,apply])=>({id,load:attempt=>new Promise((resolve,reject)=>{
   let settled=false;const timeout=setTimeout(()=>{settled=true;reject(new Error('Image transfer timed out'));},20000);
   new THREE.TextureLoader().load(`/art/${id}${attempt?'?retry='+Date.now():''}`,t=>{
    if(settled){t.dispose();return;}settled=true;clearTimeout(timeout);
    try{apply(t);resolve();}catch(error){reject(error);}
   },undefined,error=>{if(!settled){settled=true;clearTimeout(timeout);reject(error);}});
  })}));
  for(const id of ['sunny','miso','pebble'])tasks.push({id:`${id}-films`,load:()=>preloadPetFilms(id)});
  tasks.push({id:'pets',load:async()=>{const responses=await Promise.all(['/art/friends/framing.json','/art/motion/framing.json'].map(url=>fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(20000)})));if(responses.some(r=>!r.ok))throw new Error('Pet information unavailable');[this.framing,this.motionFraming]=await Promise.all(responses.map(r=>r.json()));this.syncPets(this.life);}});
  this.artwork=new AssetReadiness(tasks,{onChange:status=>this.onArtworkStatus?.(status),prepare:()=>prepareHouseRenderer(this)});return this.artwork.run();
 }
 syncPets(s){if(this.life!==s)this.petSocial.reset();this.life=s;if(!s||!this.framing)return;const specs=PETS.map(p=>({...p,position:planPoint(...p.plan)}));
  const ids=new Set(specs.map(p=>p.id));for(const [id,g] of this.actors)if(!ids.has(id)){this.scene.remove(g);g.userData.dispose();this.actors.delete(id);}
  for(const spec of specs){if(spec.stationary||!this.framing[spec.id])continue;let g=this.actors.get(spec.id);if(!g){g=createActor(spec.id,spec.height,this.framing[spec.id],this.motionFraming);this.actors.set(spec.id,g);this.scene.add(g);const p=this.petRoaming.register(spec.id,spec.plan);g.position.set(p.x,p.y,p.z);}}
  if(!this.mops){this.mops=new Moflin(this);this.actors.set('mops',this.mops.group);this.scene.add(this.mops.group);}
  this.petBone.bind(s);this.petBone.updateModel();if(!this.petActivitiesWarming){this.petActivitiesWarming=true;setTimeout(async()=>{for(const id of ['sunny','miso'])await preloadPetActivities(id);},5000);}
 }
 greetPlayer(){this.petRoaming.greet(this.camera.position,this.yaw);}
 focus(id){if(this.massage?.active){this.massage.cancel();return;}this.handInteraction?.cancel();const p=HOUSE_VIEWS[id]||HOUSE_VIEWS.living;this.camera.position.set(...p.slice(0,3));this.yaw=p[3];this.pitch=p[4];this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');this.room=id;this.keys={};this.eyeHeight=1.67;this.feet={x:this.camera.position.x,y:floorHeight(this.camera.position.x,this.camera.position.z),z:this.camera.position.z,vy:0,grounded:true};this.jumpQueued=false;}
 lookAtPet(id){if(this.massage?.active){this.massage.cancel();return;}this.handInteraction?.cancel();if(id==='mops'&&this.mops){this.camera.position.set(...MOPS_VIEW);this.eyeHeight=MOPS_VIEW[1]-floorHeight(MOPS_VIEW[0],MOPS_VIEW[2]);this.feet={x:MOPS_VIEW[0],y:MOPS_VIEW[1]-this.eyeHeight,z:MOPS_VIEW[2],vy:0,grounded:true};this.keys={};this.camera.lookAt(this.mops.group.position.clone().add(new THREE.Vector3(0,.05,0)));const e=new THREE.Euler().setFromQuaternion(this.camera.quaternion,'YXZ');this.yaw=e.y;this.pitch=e.x;this.room='bedroom';return;}const p=PETS.find(p=>p.id===id),position=this.petRoaming.pets.get(id),view=this.petRoaming.viewpoint(id);if(!p||!position||!view)return;this.eyeHeight=id==='sunny'?1:.65;this.camera.position.set(view.x,view.y+this.eyeHeight,view.z);this.feet={x:view.x,y:view.y,z:view.z,vy:0,grounded:true};this.keys={};this.camera.lookAt(position.x,position.y+p.height/2,position.z);const e=new THREE.Euler().setFromQuaternion(this.camera.quaternion,'YXZ');this.yaw=e.y;this.pitch=e.x;position.wait=Math.max(position.wait,6);}
 lock(){if(this.mode!=='play'||this.paused||hasTouchInput())return;this.canvas.requestPointerLock()?.catch(()=>{});}
 resumeWandering(){this.freeLook=true;this.keys={};this.canvas.classList.add('free-wander');document.body.classList.add('wandering');this.lock();}
 unlock(){this.touchMove={x:0,z:0};this.freeLook=false;this.canvas.classList.remove('free-wander');document.body.classList.remove('wandering');this.keys={};if(document.pointerLockElement)document.exitPointerLock();}
 resize(){const {width,height}=viewportBounds();fitRenderer(this.renderer,this.camera,width,height,this.viewportDirty);this.clawGame?.resizeView();this.pinballGame?.resizeView();this.viewportDirty=false;}
 animate(){requestAnimationFrame(()=>this.animate());const frameSeconds=this.clock.getDelta(),dt=Math.min(frameSeconds,.05);if(document.hidden||this.contextLost||this.preparingRenderer){this.renderQuality.reset();return;}
  // Audio can continue behind a silent album even when its frozen background
  // lets us skip the expensive scene update and render below.
  if(this.mode==='play')this.onAudioTick?.(dt);
  const ratio=this.renderQuality.update(frameSeconds,this.mode==='play'&&!this.paused&&!this.telescope.active&&!this.clawGame.active&&!this.pinballGame.active&&this.artwork.ready&&!this.viewportDirty);
  if(ratio!==undefined){this.renderer.setPixelRatio(ratio);this.viewportDirty=true;}
  const frozen=this.mode==='play'&&this.paused&&!this.previewAnimation&&!this.cinema.active&&this.cinema.darkness===0;if(frozen&&this.renderWasPaused&&!this.viewportDirty)return;this.renderWasPaused=frozen;this.resize();this.elapsed+=dt;const active=this.mode==='play'&&!this.paused&&!document.hidden;this.walking=false;
  if(active&&this.telescope.active)this.onTick(dt);
  if(active&&!this.telescope.active){
   if(this.massage.active)this.massage.update(dt);
   else if(this.handInteraction.active)this.handInteraction.update(dt);
   else {const v=new THREE.Vector3((this.keys.KeyD||this.keys.ArrowRight?1:0)-(this.keys.KeyA||this.keys.ArrowLeft?1:0),0,(this.keys.KeyS||this.keys.ArrowDown?1:0)-(this.keys.KeyW||this.keys.ArrowUp?1:0));
   v.x+=this.touchMove?.x||0;v.z+=this.touchMove?.z||0;
   if(v.length()||this.jumpQueued)this.eyeHeight=1.67;
   v.clampLength(0,1).applyAxisAngle(new THREE.Vector3(0,1,0),this.yaw);
   if(!this.feet||Math.hypot(this.feet.x-this.camera.position.x,this.feet.z-this.camera.position.z)>.1)this.feet={x:this.camera.position.x,y:floorHeight(this.camera.position.x,this.camera.position.z),z:this.camera.position.z,vy:0,grounded:true};
   if(!this.jumpQueued)this.movableFurniture.push(this.feet,v.x*dt*1.9,v.z*dt*1.9);
   const step=moveWithJump(this.feet,v.x*dt*1.9,v.z*dt*1.9,dt,this.colliders,this.jumpQueued);this.jumpQueued=false;this.feet=step;
   this.camera.position.x=step.x;this.camera.position.z=step.z;this.walking=step.distance>.001&&step.grounded;this.walkPhase=(this.walkPhase||0)+step.distance*10;
   if(this.walking&&this.elapsed-(this.lastStep||0)>.55){this.lastStep=this.elapsed;this.onStep?.();}
   if(step.landed)this.landingMotion=.035;this.landingMotion=(this.landingMotion||0)*Math.exp(-12*dt);
   const eye=step.y+(this.eyeHeight||1.67)+(this.motion?(this.walking?Math.sin(this.walkPhase)*.012:0)-this.landingMotion:0);
   this.camera.position.y=step.grounded?THREE.MathUtils.lerp(this.camera.position.y,eye,1-Math.exp(-18*dt)):eye;
   }
   this.camera.rotation.set(this.pitch,this.yaw,this.massage.roll,'YXZ');this.onTick(dt);this.room=HOUSE_ROOMS.find(r=>pointInPolygon(this.camera.position.x,this.camera.position.z,r.polygon))?.id||this.room;
  }
  this.petRoaming.update(active?dt:0,{enabled:this.motion,player:this.camera.position,hours:this.hours,canWalk:id=>this.actors.get(id)?.userData.canWalk()});this.petBone.update(active&&this.motion?dt:0,this.camera.position);this.petSocial.update(active?dt:0,{enabled:this.motion,player:this.camera.position,hours:this.hours});for(const [id,p] of this.petRoaming.pets){const actor=this.actors.get(id);if(actor){const pose=petPose(p,active?dt:0);actor.position.set(p.x,pose.y,p.z);actor.userData.activity=p.activity;actor.userData.socialTime=p.socialTime;actor.userData.carryingBone=id==='sunny'&&this.petBone.phase==='return';actor.userData.speed=Math.hypot(p.vx,p.vz);actor.userData.vx=p.vx;actor.userData.vz=p.vz;actor.userData.cameraX=this.camera.position.x-p.x;actor.userData.cameraZ=this.camera.position.z-p.z;actor.userData.cameraY=this.camera.position.y-p.y;actor.userData.travel=p.distance;if(Math.hypot(p.vx,p.vz)>.001)p.heading=Math.atan2(p.vx,p.vz);actor.userData.heading=p.heading||0;actor.userData.care=this.elapsed<(actor.userData.careUntil||0);actor.userData.hopping=!!p.hop;}}
  this.houseInteractions.update(active?dt:0);
  this.clawGame.update(this.clawGame.active?dt:0);this.pinballGame.update(this.pinballGame.active?dt:0);this.cinema.update(dt);
  this.balconyLife.update(active?dt:0,this.hours,this.motion);this.daylight.update(this.hours);this.daylight.neighborhood.update(active?dt:0,this.hours,this.motion);const checkAim=this.elapsed-(this.lastAimCheck||-1)>=.1;if(checkAim)this.lastAimCheck=this.elapsed;let nearest=checkAim?null:this.lookTarget;const forward=this.camera.getWorldDirection(new THREE.Vector3());
  this.memoryMarkers?.children.forEach(g=>g.visible=g.position.distanceTo(this.camera.position)<6);
  const animated=!document.hidden&&(this.mode==='menu'||this.mode==='play'&&(!this.paused||this.previewAnimation));
  let petAim=0;for(const [id,g] of this.actors){const distance=g.position.distanceTo(this.camera.position);g.rotation.y=Math.atan2(this.camera.position.x-g.position.x,this.camera.position.z-g.position.z);g.userData.update(animated?dt:0,this.motion,distance<9);const d=g.position.clone().add(new THREE.Vector3(0,PETS.find(p=>p.id===id)?.height/2||1.3,0)).sub(this.camera.position),aim=forward.dot(d.clone().normalize());if(checkAim&&distance<3.3&&aim>.85&&aim>petAim){const ray=new THREE.Raycaster(this.camera.position,d.clone().normalize(),.05,d.length()-.08);if(!ray.intersectObject(this.houseRoot,true).some(hit=>!hit.object.material.transparent)){nearest=id;petAim=aim;}}}
  this.petBone.updateModel();for(const corner of this.petCorners.values()){corner.care=Math.max(0,corner.care-(animated?dt:0));for(const content of corner.contents){content.scale.setScalar(corner.care>0?1+Math.sin(corner.care*7)*.05:1);}}
  if(checkAim&&this.turntablePosition){const d=this.turntablePosition.clone().sub(this.camera.position);if(d.length()<2.3&&forward.dot(d.clone().normalize())>.72){const ray=new THREE.Raycaster(this.camera.position,d.clone().normalize(),.05,d.length()-.30);if(!ray.intersectObject(this.houseRoot,true).some(hit=>!hit.object.material.transparent))nearest='turntable';}}
  if(checkAim&&this.windowLounge?.telescope){const d=this.windowLounge.telescope.position.clone().add(new THREE.Vector3(0,1.49,.54)).sub(this.camera.position);if(d.length()<2.5&&forward.dot(d.clone().normalize())>.68){const ray=new THREE.Raycaster(this.camera.position,d.clone().normalize(),.05,Math.max(.05,d.length()-.25));if(!ray.intersectObject(this.houseRoot,true).some(hit=>!hit.object.material.transparent))nearest='telescope';}}
  if(checkAim){const fixture=this.houseInteractions.select();if(fixture)nearest=fixture;}
  this.turntable.update(active?dt:0,this.recordPlaying);
  this.handInteraction.updateArms();
  const fixtureLabel=this.houseInteractions.label(nearest)||(nearest==='turntable'?this.turntable.label:'');if(nearest!==this.lookTarget||fixtureLabel!==this.lastFixtureLabel){this.lastFixtureLabel=fixtureLabel;this.lookTarget=nearest;this.onLook(nearest);}if(this.telescope.active){this.reflections.surfaces.forEach(p=>p.refresh=false);this.telescope.update(active?dt:0,this.hours,this.motion);return;}this.reflections.update();this.renderer.render(this.scene,this.camera);
 }
}
