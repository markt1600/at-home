import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { inWalkableArea,moveAlongFloor } from './navigation.js';
import {buildHouse} from './house.js';
import {optimizeHouse} from './house-meshes.js';
import {applyHouseTextures} from './house-materials.js';
import {applyHallwayArt} from './house-gallery.js';
import {shelterLocation} from './shelter.js';
import {HOUSE_VIEWS,floorHeight,VISITOR_POSITION,planPoint} from './house-layout.js';
import {BloodEffects} from './blood.js';
import {HouseReflections} from './house-reflections.js';
import {VISITOR_IDS,keyStandingAtlas,createStandingVisitor,animateStandingVisitor,visibleVisitorHit} from './visitors.js';
import {collapseVisitor,updateVisitorFall} from './corpse.js';

const UP=new THREE.Vector3(0,1,0);
export class House {
  constructor(canvas,onInteract,onShoot,onLook){
    this.canvas=canvas;this.onInteract=onInteract;this.onShoot=onShoot;this.onLook=onLook;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x091017);this.scene.fog=new THREE.FogExp2(0x14202a,.012);
    this.camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.06,100);this.scene.add(this.camera);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.95;
    this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.12,.6,.9);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
    this.clock=new THREE.Clock();this.mode='menu';this.keys={};this.yaw=0;this.pitch=0;this.aim=false;this.recoil=0;this.blood=true;this.motion=true;this.particles=[];this.decals=[];this.targets=[];this.dead=false;this.elapsed=0;this.scanUntil=0;this.npc=null;this.depart=null;
    this.materials={};this.colliders=[];this.exploring=false;this.torchOn=false;buildHouse(this);optimizeHouse(this);this.buildGun();this.loadArtwork();this.bloodEffects=new BloodEffects(this.scene,floorHeight);
    this.reflections=new HouseReflections(this);
    this.ray=new THREE.Raycaster();this.mouse=new THREE.Vector2(0,0);
    window.addEventListener('resize',()=>this.resize());
    document.addEventListener('pointerlockchange',()=>{document.body.classList.toggle('free-look',document.pointerLockElement===canvas);this.resize();});
    document.addEventListener('keydown',e=>{if(this.paused||e.target.matches('input,textarea'))return;this.keys[e.code]=true;if(this.mode==='play'&&['KeyW','KeyA','KeyS','KeyD','Space'].includes(e.code))e.preventDefault();});
    document.addEventListener('keyup',e=>this.keys[e.code]=false);
    window.addEventListener('blur',()=>{this.keys={};});
    document.addEventListener('mousemove',e=>{if(document.pointerLockElement!==canvas||this.mode!=='play')return;this.yaw-=e.movementX*.0018;this.pitch=Math.max(-.8,Math.min(.8,this.pitch-e.movementY*.0018));});
    canvas.addEventListener('mousedown',e=>{if(this.mode!=='play')return;if(e.button===2){this.aim=true;return;}if(document.pointerLockElement===canvas&&this.aim)this.fire();else if(document.pointerLockElement!==canvas)this.lock();});
    document.addEventListener('mouseup',e=>{if(e.button===2)this.aim=false;});
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    this.animate();
  }
  mat(color,roughness=.8,metalness=0){const key=[color,roughness,metalness].join();return this.materials[key]||(this.materials[key]=new THREE.MeshStandardMaterial({color,roughness,metalness}));}
  box(w,h,d,x,y,z,mat,parent=this.scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof mat==='number'?this.mat(mat):mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  cyl(rt,rb,h,x,y,z,mat,parent=this.scene,n=12){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,n),typeof mat==='number'?this.mat(mat):mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
  sphere(r,x,y,z,mat,parent=this.scene,sx=1,sy=1,sz=1){const m=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),typeof mat==='number'?this.mat(mat):mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;}
  label(text,x,y,z,w,h,opts={}){
    const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024*h/w);const ctx=c.getContext('2d');ctx.fillStyle=opts.bg||'#233c36';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=opts.color||'#d1d7bd';ctx.textAlign=opts.align||'center';ctx.textBaseline='middle';ctx.font=`${opts.weight||500} ${opts.size||Math.min(c.height*.35,100)}px ${opts.font||'sans-serif'}`;
    const lines=text.split('\n');lines.forEach((line,i)=>ctx.fillText(line,opts.align==='left'?35:512,c.height*(i+1)/(lines.length+1),960));
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:.9,side:THREE.DoubleSide}));m.position.set(x,y,z);this.scene.add(m);return m;
  }
  buildGun(){
    this.gun=new THREE.Group();this.gun.scale.setScalar(.65);this.camera.add(this.gun);const metal=this.mat(0x242c2b,.27,.8),grip=this.mat(0x252b26,.95),sleeve=this.mat(0x4a5743);
    this.box(.11,.13,.37,0,0,-.02,metal,this.gun);this.box(.105,.10,.42,0,.065,-.055,metal,this.gun);this.box(.09,.23,.11,0,-.15,.105,grip,this.gun).rotation.x=-.23;
    for(let z=.025;z<.12;z+=.02)this.box(.115,.072,.007,0,.064,z,this.mat(0x4a514b,.35,.8),this.gun);
    this.box(.012,.025,.023,0,.125,-.245,metal,this.gun);this.box(.055,.03,.03,0,.125,.12,metal,this.gun);
    const muzzle=this.cyl(.029,.029,.035,0,.065,-.277,0x080e0c,this.gun);muzzle.rotation.x=Math.PI/2;
    this.box(.075,.08,.065,0,-.065,-.04,metal,this.gun);
    this.sphere(.07,-.02,-.115,.12,0xa67a5b,this.gun,.8,1.1,1.3);
    this.cyl(.09,.11,.4,.03,-.28,.26,sleeve,this.gun).rotation.x=-.8;
    this.sphere(.065,-.065,-.10,.045,0xad8060,this.gun,.85,1,1.15);
    this.cyl(.085,.11,.38,-.12,-.22,.22,sleeve,this.gun).rotation.x=-.9;
    this.muzzleLight=new THREE.PointLight(0xffac4f,0,5);this.muzzleLight.position.set(0,.07,-.38);this.gun.add(this.muzzleLight);
    this.muzzleMesh=new THREE.Mesh(new THREE.ConeGeometry(.075,.3,7),new THREE.MeshBasicMaterial({color:0xffd880,transparent:true,opacity:.95}));this.muzzleMesh.rotation.x=-Math.PI/2;this.muzzleMesh.position.set(0,.065,-.4);this.muzzleMesh.visible=false;this.gun.add(this.muzzleMesh);this.gun.visible=false;
  }
  setExploration(enabled){this.exploring=enabled;this.gun.visible=this.mode==='play'&&!enabled;this.door.rotation.y=-1.45;this.torchOn=enabled;this.flashlight.visible=enabled;if(enabled)this.focus('hall');this.resize();}
  toggleTorch(){this.torchOn=!this.torchOn;this.flashlight.visible=this.torchOn;}
  loadArtwork(){
    const loader=new THREE.TextureLoader();
    this.standingAtlases=Array.from({length:4},(_,i)=>loader.load('/art/visitors-standing-'+(i+1)+'.png',atlas=>{
      const canvas=document.createElement('canvas');canvas.width=atlas.image.width;canvas.height=atlas.image.height;
      const ctx=canvas.getContext('2d');ctx.drawImage(atlas.image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
      atlas.userData.frames=keyStandingAtlas(pixels.data,canvas.width,canvas.height);atlas.userData.pixels=pixels.data;
      ctx.putImageData(pixels,0,0);atlas.image=canvas;atlas.colorSpace=THREE.SRGBColorSpace;atlas.needsUpdate=true;
      if(this.waitingPerson&&Math.floor(VISITOR_IDS.indexOf(this.waitingPerson.id)/3)===i)this.showPerson(this.waitingPerson);
      this.setSheltered(this.shelteredPeople||[]);
    }));
    loader.load('/art/house-surfaces-v2.png',atlas=>applyHouseTextures(atlas,this.houseMaterials,Math.min(8,this.renderer.capabilities.getMaxAnisotropy())));
    loader.load('/art/hallway-prints.webp',atlas=>applyHallwayArt(atlas,this.houseMaterials,Math.min(8,this.renderer.capabilities.getMaxAnisotropy())));
  }
  showPerson(p){
    if(this.npc){this.scene.remove(this.npc);this.npc.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.map?.dispose();o.material.dispose();}});}
    this.dead=false;this.depart=null;this.waitingPerson=null;this.doorPersonId=p?.id;if(!p){this.npc=null;return;}
    const index=Math.max(0,VISITOR_IDS.indexOf(p.id)),atlas=this.standingAtlases[Math.floor(index/3)];
    this.waitingPerson=p;if(!atlas?.userData.frames){this.npc=null;return;}this.waitingPerson=null;
    const g=createStandingVisitor(atlas,index);g.position.set(...VISITOR_POSITION);this.scene.add(g);this.npc=g;this.npcMeshes=[g.userData.body];
    g.rotation.y=Math.atan2(this.camera.position.x-g.position.x,this.camera.position.z-g.position.z);
  }
  setSheltered(people){
    this.shelteredPeople=people;this.residents??=new Map();const ids=new Set(people.map(p=>p.id));
    for(const [id,g] of this.residents)if(!ids.has(id)){this.scene.remove(g);g.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.map?.dispose();o.material.dispose();}});this.residents.delete(id);}
    people.forEach((p,i)=>{
      const index=VISITOR_IDS.indexOf(p.id),atlas=this.standingAtlases?.[Math.floor(index/3)];if(!atlas?.userData.frames)return;
      let g=this.residents.get(p.id);if(!g){g=createStandingVisitor(atlas,index);g.name=p.name;g.userData.personId=p.id;this.residents.set(p.id,g);this.scene.add(g);}
      const place=shelterLocation(i);g.position.set(place.x,place.y,place.z);
      g.visible=!(this.depart?.action==='admit'&&this.doorPersonId===p.id&&this.depart.t<=2.5);
    });
  }
  setMode(mode){this.mode=mode;this.gun.visible=mode==='play';if(mode==='play'){this.focus('door');this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');}else{this.unlock();this.keys={};this.flashlight.visible=false;}this.resize();}
  lock(){try{const p=this.canvas.requestPointerLock();p?.catch?.(()=>{});}catch{}}
  unlock(){if(document.pointerLockElement)document.exitPointerLock();this.aim=false;}
  focus(id){const p=HOUSE_VIEWS[id]||HOUSE_VIEWS.door;this.camera.position.set(p[0],p[1],p[2]);this.yaw=p[3];this.pitch=p[4];this.viewingRoom=id!=='door';document.body.classList.toggle('room-view',this.viewingRoom);this.resize();}
  scan(kind){this.scanUntil=this.elapsed+1.2;this.scanKind=kind;this.flashlight.color.set(kind==='uv'?0x8245ff:kind==='thermal'?0xff995c:0xc5fff1);this.flashlight.visible=true;}
  fire(force=false){
    if(this.mode!=='play'||!this.npc||this.dead||this.depart)return false;
    this.camera.updateMatrixWorld();this.ray.setFromCamera(new THREE.Vector2(0,0),this.camera);
    const hit=this.ray.intersectObjects(this.npcMeshes,false).find(visibleVisitorHit);
    if(!force&&!hit)return this.onShoot(false);
    if(this.onShoot(true)===false)return false;
    this.recoil=1;this.muzzleLight.intensity=100;this.muzzleMesh.visible=true;this.dead=true;
    const index=Math.max(0,VISITOR_IDS.indexOf(this.doorPersonId));
    collapseVisitor(this.npc,this.standingAtlases[Math.floor(index/3)],index);this.npcMeshes=[this.npc.userData.body];
    if(this.blood){const pt=hit?.point||this.npc.position.clone().add(new THREE.Vector3(0,1.2,0)),direction=pt.clone().sub(this.camera.position).normalize();this.bloodEffects.impact(pt,direction,this.npc,this.houseRoot);}
    return true;
  }
  leave(action){if(!this.dead)this.depart={action,t:0};if(action==='admit')this.door.rotation.y=-1.75;}
  reset(){this.bloodEffects.reset();this.reflections.reset();this.decals.forEach(p=>{this.scene.remove(p);p.geometry.dispose();});this.decals=[];this.particles.forEach(p=>{this.scene.remove(p.mesh);p.mesh.geometry.dispose();});this.particles=[];this.door.rotation.y=-1.45;}
  resize(){this.camera.aspect=innerWidth/innerHeight;if(this.mode==='play'&&!this.exploring&&!this.viewingRoom&&!document.pointerLockElement)this.camera.setViewOffset(innerWidth,innerHeight,0,innerHeight*.25,innerWidth,innerHeight);else this.camera.clearViewOffset();this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);this.composer.setSize(innerWidth,innerHeight);}
  canWalk(x,z){return inWalkableArea(x,z,this.exploring,this.colliders)&&Math.abs(floorHeight(x,z)-floorHeight(this.camera.position.x,this.camera.position.z))<=.12;}
  animate(){
    requestAnimationFrame(()=>this.animate());const dt=Math.min(this.clock.getDelta(),.05);this.elapsed+=dt;const t=this.elapsed;this.walking=false;
    if(this.mode==='menu'){const [x,z]=planPoint(527,683),[tx,tz]=planPoint(404,575);this.camera.position.set(x+Math.sin(t*.07)*.1,1.5,z);this.camera.lookAt(tx,.9,tz);}
    if(this.mode==='play'&&!this.paused){
      const direction=new THREE.Vector3((this.keys.KeyD?1:0)-(this.keys.KeyA?1:0),0,(this.keys.KeyS?1:0)-(this.keys.KeyW?1:0));
      let moved=0,climbing=false;
      if(direction.length()){
        direction.normalize().applyAxisAngle(UP,this.yaw);const step=moveAlongFloor(this.camera.position.x,this.camera.position.z,direction.x*dt*2.1,direction.z*dt*2.1,this.colliders);
        this.camera.position.x=step.x;this.camera.position.z=step.z;moved=step.distance;climbing=step.climbed>.001;this.walkPhase=(this.walkPhase||0)+moved*11;
        if(moved>.001&&t-(this.lastStep||0)>(climbing?.36:.5)){this.lastStep=t;this.onStep?.();}
      }
      this.walking=moved>.001;
      this.gun.visible=!this.exploring&&(this.aim||this.recoil>0||this.weaponDrawn);
      const bob=this.motion&&moved>.001?Math.sin(this.walkPhase)*(climbing?.03:.015):0;
      this.camera.rotation.set(this.pitch+this.recoil*.04+(this.motion&&climbing?Math.cos(this.walkPhase)*.006:0),this.yaw,0,'YXZ');
      this.camera.position.y=THREE.MathUtils.lerp(this.camera.position.y,1.67+floorHeight(this.camera.position.x,this.camera.position.z)+bob,1-Math.exp(-14*dt));
      this.gun.position.lerp(new THREE.Vector3(this.aim?.01:.23,-.23,-.65+this.recoil*.08),.18);
      this.gun.rotation.set(this.recoil*.24,0,this.motion?Math.sin(t*1.8)*.009:0);
      const dialogueView=!this.exploring&&!this.viewingRoom&&!document.pointerLockElement;
      this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,this.aim?49:dialogueView?48:62,.12);this.camera.updateProjectionMatrix();
      this.ray.setFromCamera(this.mouse,this.camera);let nearest=null,score=.975;
      for(const target of this.targets){
        if(target.explorationOnly&&!this.exploring)continue;if(this.exploring&&target.id==='door')continue;
        const dir=target.pos.clone().sub(this.camera.position),dist=dir.length(),dot=dir.normalize().dot(this.ray.ray.direction);
        if(dot<=score||dist>=6)continue;
        const sight=new THREE.Raycaster(this.camera.position,dir,.04,Math.max(.04,dist-.3));
        if(sight.intersectObject(this.houseRoot,true).some(hit=>hit.object.isMesh&&!hit.object.material.transparent))continue;
        nearest=target;score=dot;
      }
      if(nearest?.id!==this.lookTarget?.id){this.lookTarget=nearest;this.onLook(nearest);}
    }
    this.recoil=Math.max(0,this.recoil-dt*4);if(this.recoil<.8){this.muzzleLight.intensity=0;this.muzzleMesh.visible=false;}
    if(this.npc){
      if(this.dead){updateVisitorFall(this.npc,dt);}
      else{
        animateStandingVisitor(this.npc,this.paused||this.mode!=='play'?0:dt,this.motion);
        if(this.depart){this.depart.t+=dt;const direction=this.depart.action==='admit'?-1:1;this.npc.position.x+=dt*direction*.7;this.npc.position.z+=dt*direction*.7;if(this.depart.t>2.5)this.npc.visible=false;}
        this.npc.rotation.y=Math.atan2(this.camera.position.x-this.npc.position.x,this.camera.position.z-this.npc.position.z);
        this.npc.position.y=VISITOR_POSITION[1];
      }
    }
    for(const [id,g] of this.residents||[]){
      animateStandingVisitor(g,this.paused||this.mode!=='play'||g.position.distanceToSquared(this.camera.position)>144?0:dt,this.motion);
      g.visible=!(this.depart?.action==='admit'&&this.doorPersonId===id&&this.depart.t<=2.5);
      g.rotation.y=Math.atan2(this.camera.position.x-g.position.x,this.camera.position.z-g.position.z);
    }

    if(this.scanUntil<t&&this.scanUntil>0){this.flashlight.color.set(0xe6f5de);this.flashlight.visible=this.torchOn;this.scanUntil=0;}
    if(this.flicker)this.flicker.intensity=Math.sin(t*24)>.98?1:(this.flicker.userData.baseIntensity||12);
    const r=this.rain.geometry.attributes.position;for(let i=0;i<r.count;i++){r.array[i*3+1]-=dt*8;if(r.array[i*3+1]<-2)r.array[i*3+1]=14;}r.needsUpdate=true;
    this.particles=this.particles.filter(p=>{p.life-=dt;p.v.y-=dt*9;p.mesh.position.addScaledVector(p.v,dt);if(p.mesh.position.y<.04){p.mesh.position.y=.04;p.v.set(0,0,0);p.mesh.scale.y=.12;}if(p.life<=0){this.scene.remove(p.mesh);p.mesh.geometry.dispose();return false;}return true;});
    this.bloodEffects.update(dt,this.blood);
    this.reflections.update(dt);
    this.composer.render();
  }
}
