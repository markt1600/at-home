import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const UP=new THREE.Vector3(0,1,0);
export class School {
  constructor(canvas,onInteract,onShoot,onLook){
    this.canvas=canvas;this.onInteract=onInteract;this.onShoot=onShoot;this.onLook=onLook;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x101d1e);this.scene.fog=new THREE.FogExp2(0x142527,.024);
    this.camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.06,100);this.scene.add(this.camera);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;
    this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.3,.6,.85);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
    this.clock=new THREE.Clock();this.mode='menu';this.keys={};this.yaw=0;this.pitch=0;this.aim=false;this.recoil=0;this.blood=true;this.motion=true;this.particles=[];this.decals=[];this.targets=[];this.dead=false;this.elapsed=0;this.scanUntil=0;this.npc=null;this.depart=null;
    this.materials={};this.colliders=[];this.build();this.buildGun();
    this.ray=new THREE.Raycaster();this.mouse=new THREE.Vector2(0,0);
    window.addEventListener('resize',()=>this.resize());
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
  build(){
    const concrete=this.mat(0x8e9986),green=this.mat(0x34544b),dark=this.mat(0x27342e),steel=this.mat(0x536460,.43,.65),wood=this.mat(0x665847);
    // Small procedural surface maps add worn paint, aggregate and grain without downloads.
    const surface=(size,grain)=>{const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');ctx.fillStyle='#aaaaaa';ctx.fillRect(0,0,size,size);for(let i=0;i<size*size*.7;i++){const v=80+Math.floor(Math.random()*100);ctx.fillStyle=`rgba(${v},${v},${v},${Math.random()*.25})`;ctx.fillRect(Math.random()*size,Math.random()*size,grain?1:2,grain?35:2);}const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(2,2);return tex;};
    const wear=surface(128,false);concrete.map=wear;concrete.bumpMap=wear;concrete.bumpScale=.055;green.map=wear;green.bumpMap=wear;green.bumpScale=.025;wood.map=surface(128,true);wood.bumpMap=wood.map;wood.bumpScale=.015;
    const hemi=new THREE.HemisphereLight(0x99c5be,0x302a20,1.5);this.scene.add(hemi);
    this.box(42,.2,17,0,-.15,-1,0x343e39);
    // Terrazzo tiles: individual joints, scattered polished patches.
    for(let type=0;type<2;type++){const coordinates=[];for(let x=-19;x<=19;x++)for(let z=-9;z<=6;z++)if(((x+z)%3===0?0:1)===type)coordinates.push([x,z]);const material=this.mat(type===0?0x788076:0x68756c,.34,.12);material.map=wear;material.bumpMap=wear;material.bumpScale=.016;const tiles=new THREE.InstancedMesh(new THREE.BoxGeometry(.988,.022,.988),material,coordinates.length);const transform=new THREE.Object3D();coordinates.forEach(([x,z],i)=>{transform.position.set(x,0,z);transform.updateMatrix();tiles.setMatrixAt(i,transform.matrix);});tiles.receiveShadow=true;this.scene.add(tiles);}
    this.box(40,.2,4,0,3.6,-5.4,concrete);
    this.box(10,.22,10,0,3.5,1,concrete);
    // Room, transom windows and the narrow doorway.
    for(const x of [-3.25,3.25]){
      this.box(4.5,1.22,.2,x,.61,-3.4,green);this.box(4.5,1.28,.2,x,2.96,-3.4,concrete);
      this.box(4.5,.08,.27,x,1.26,-3.38,steel);
      for(let k=0;k<6;k++){const xx=x-1.9+k*.76;this.box(.045,1.05,.08,xx,1.83,-3.4,steel);}
      const glass=new THREE.MeshStandardMaterial({color:0x9cbdad,transparent:true,opacity:.15,roughness:.18,metalness:.3});this.box(4.4,1.1,.035,x,1.82,-3.4,glass);
    }
    this.box(2.04,.44,.22,0,3.27,-3.4,concrete);
    [-1.03,1.03].forEach(x=>this.box(.1,3.1,.3,x,1.55,-3.35,steel));
    this.box(2.16,.08,.32,0,3.07,-3.35,steel);
    this.door=new THREE.Group();this.door.position.set(-1,0,-3.4);this.scene.add(this.door);
    this.box(1.9,1.12,.07,.95,.57,0,0x384940,this.door);this.box(1.9,.18,.07,.95,2.84,0,0x384940,this.door);
    [.06,1.84].forEach(x=>this.box(.1,1.7,.07,x,1.95,0,steel,this.door));
    // Wire mesh leaves visitors visible, but physically outside.
    for(let x=.13;x<1.9;x+=.15)this.box(.009,1.62,.01,x,1.95,0,steel,this.door);
    for(let y=1.2;y<2.75;y+=.16)this.box(1.78,.009,.01,.95,y,0,steel,this.door);
    this.box(.06,.25,.12,1.73,1.12,.07,0xa7a79b,this.door);
    this.door.rotation.y=-.16;
    this.label('B L O C K   B    /    0 4 – 0 7',0,3.29,-3.25,1.88,.29,{size:70,bg:'#253c35'});
    this.label('04—07',0,3.28,-3.55,1.6,.3,{bg:'#253c35'}).rotation.y=Math.PI;
    this.box(.2,3.5,10,-5,1.75,1,concrete);this.box(.2,3.5,10,5,1.75,1,concrete);this.box(10,3.5,.2,0,1.75,6,concrete);
    [-4.87,4.87].forEach(x=>this.box(.04,1.2,9.8,x,.6,1,green));
    const board=this.box(3.4,1.55,.07,4.84,2,.1,0x122d27);board.rotation.y=-Math.PI/2;
    this.label('NO ONE LEAVES\nUNTIL FIRST LIGHT',4.79,2,.1,3.1,1.35,{bg:'#142e29',color:'#b5c4a5',font:'monospace',size:80}).rotation.y=-Math.PI/2;
    // Desks, chairs and papers with a path through the centre.
    for(const x of [-3.6,-2.1,2.3,3.7])for(const z of [.2,2,3.8]){
      this.colliders.push({x,z:z+.25,w:1.2,d:1.3});
      this.box(1.1,.08,.65,x,.78,z,wood);this.box(.94,.08,.55,x,.6,z,steel);
      for(const dx of [-.43,.43])for(const dz of [-.22,.22])this.box(.035,.73,.035,x+dx,.365,z+dz,steel);
      this.box(.55,.05,.52,x,.44,z+.6,0x577064);this.box(.55,.43,.045,x,.68,z+.86,0x577064);
      for(const dx of [-.23,.23])for(const dz of [.4,.83])this.box(.026,.45,.026,x+dx,.23,z+dz,steel);
      const paper=this.box(.26,.005,.36,x+.1,.826,z,0xc4c4ae);paper.rotation.y=x*.7+z;
    }
    // Clock, security radio and records cabinet are real world interaction targets.
    const clock=this.cyl(.23,.23,.065,2.5,2.85,5.85,0xd5d5be);clock.rotation.x=Math.PI/2;
    this.box(.017,.16,.025,2.5,2.9,5.79,0x25362b);this.box(.14,.015,.025,2.55,2.85,5.79,0x25362b);
    this.box(1.25,1.7,.52,-4.25,.86,-1.95,0x64736a);
    this.colliders.push({x:-4.25,z:-1.95,w:1.25,d:.52},{x:3.8,z:-2,w:1.2,d:.7});
    for(let y=.25;y<1.7;y+=.4){this.box(1.17,.37,.02,-4.25,y,-1.67,0x707c70);this.box(.24,.026,.05,-4.25,y,-1.63,steel);}
    this.label('AFTER-HOURS\nREGISTER',-4.25,1.5,-1.625,.5,.23,{bg:'#c1c1a7',color:'#2c3931',size:90});
    this.targets.push({id:'records',pos:new THREE.Vector3(-4.25,1.2,-1.65),name:'Records cabinet'});
    this.box(1.2,.09,.7,3.8,.95,-2,wood);for(const x of [3.3,4.3])this.box(.06,.95,.5,x,.475,-2,steel);
    this.box(.46,.23,.26,3.8,1.11,-2,0x293c35);this.box(.12,.065,.01,3.83,1.14,-1.86,new THREE.MeshStandardMaterial({color:0x84c9a9,emissive:0x487e67,emissiveIntensity:.7}));
    this.cyl(.009,.009,.45,3.98,1.43,-2,steel);this.targets.push({id:'radio',pos:new THREE.Vector3(3.8,1.25,-2),name:'Emergency radio'});
    this.box(.04,1.05,1.5,-4.86,2,1.8,0x775e3b);const note=this.label('17 APRIL\nREMEMBER THE DATE',-4.82,2,1.8,1.2,.7,{bg:'#c1bca0',color:'#473b2d',size:84});note.rotation.y=Math.PI/2;
    this.targets.push({id:'board',pos:new THREE.Vector3(-4.7,2,1.8),name:'Noticeboard'});
    this.targets.push({id:'door',pos:new THREE.Vector3(0,1.6,-3.35),name:'Return to the door'});
    // Long open-air Singapore school corridor, concrete balustrades, drainpipes.
    this.box(40,1.12,.2,0,.56,-7.25,green);this.box(40,.07,.32,0,1.14,-7.25,concrete);
    for(let x=-19;x<=19;x+=3.8){
      this.box(.33,3.6,.37,x,1.8,-7.25,concrete);this.box(.34,.33,4,x,3.4,-5.4,concrete);
      if(Math.abs(x)>5){this.box(3.4,3.3,.22,x,1.65,-3.4,concrete);this.box(1.25,2.65,.05,x,1.325,-3.55,green);this.box(.85,.8,.04,x,2,-3.6,0x203c33);this.label('CLASSROOM',x,2.88,-3.57,1.35,.23,{size:85}).rotation.y=Math.PI;}
    }
    this.box(.075,3.45,.075,-6.3,1.72,-7.02,steel);
    for(let x=-17;x<=17;x+=5.5){
      this.box(1.25,.075,.18,x,3.39,-5.4,steel);
      this.box(1.12,.023,.08,x,3.34,-5.4,new THREE.MeshStandardMaterial({color:0xf0f3c4,emissive:0xe8edbd,emissiveIntensity:3}));
      const light=new THREE.PointLight(0xc2d9b0,22,8,2);light.position.set(x,3.15,-5.4);this.scene.add(light);if(Math.abs(x)<1)this.flicker=light;
    }
    const roomLight=new THREE.PointLight(0xe4c78e,36,11,2);roomLight.position.set(0,3.15,1);roomLight.castShadow=true;roomLight.shadow.mapSize.set(1024,1024);roomLight.shadow.bias=-.001;this.scene.add(roomLight);
    this.box(1.65,.03,.2,0,3.31,1,new THREE.MeshStandardMaterial({color:0xffe9bb,emissive:0xffdfa0,emissiveIntensity:2}));
    const doorLight=new THREE.SpotLight(0xe6d6ad,65,13,.7,.65,2);doorLight.position.set(.6,3.15,-2.5);doorLight.target.position.set(0,1.2,-5);this.scene.add(doorLight,doorLight.target);
    this.label('EXIT   →',-8,2.85,-5.2,1.1,.38,{bg:'#184c35',color:'#e1ead0'});
    this.box(.52,.8,.14,6.2,1.35,-3.65,0x822f21);this.label('FIRE',6.2,1.35,-3.74,.3,.14,{bg:'#812e23',size:95}).rotation.y=Math.PI;
    // Distant HDB blocks and windows, glimpsed across the wet quadrangle.
    for(let x=-30;x<35;x+=9){this.box(6,12,3,x,3,-24,0x233a3b);for(let y=0;y<10;y+=1.2)for(let dx=-2;dx<3;dx+=1){if(Math.random()>.32)this.box(.43,.58,.04,x+dx,y,-22.45,new THREE.MeshBasicMaterial({color:Math.random()>.5?0x586961:0x839070}));}}
    // Rain streaks sit beyond the parapet.
    const rain=new Float32Array(1800*3);for(let i=0;i<rain.length;i+=3){rain[i]=(Math.random()-.5)*65;rain[i+1]=Math.random()*15;rain[i+2]=-8-Math.random()*15;}
    this.rain=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(rain,3)),new THREE.PointsMaterial({color:0xa5c9c2,size:.025,transparent:true,opacity:.45}));this.scene.add(this.rain);
    this.flashlight=new THREE.SpotLight(0xe6f5de,35,18,.28,.65,2);this.camera.add(this.flashlight);this.flashlight.position.set(.15,-.13,0);this.flashlight.target.position.set(0,0,-7);this.camera.add(this.flashlight.target);this.flashlight.visible=false;
    this.camera.position.set(4,1.7,-5.7);this.camera.lookAt(-12,1.4,-5.1);
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
  showPerson(p){
    if(this.npc){this.scene.remove(this.npc);this.npc.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
    this.dead=false;this.depart=null;if(!p){this.npc=null;return;}
    const g=new THREE.Group();this.scene.add(g);g.position.set(0,0,-4.55);this.npc=g;this.npcMeshes=[];
    const cloth=this.mat(p.color),skin=this.mat(p.skin,.75),hair=this.mat(p.hair),pants=this.mat(0x333e38),shoe=this.mat(0x1c2522,.4);
    for(const x of [-.115,.115]){this.box(.16,.67,.19,x,.43,0,pants,g);this.box(.19,.10,.32,x,.085,.06,shoe,g);}
    const torso=this.cyl(.23,.19,.6,0,1.04,0,cloth,g,16);torso.scale.z=.65;
    this.cyl(.062,.068,.12,0,1.41,0,skin,g,16);
    const head=this.sphere(.155,0,1.59,0,skin,g,.82,1.25,.87);
    this.sphere(.157,0,1.66,-.021,hair,g,.85,.83,.88);
    this.sphere(.022,0,1.575,.137,skin,g,.6,1.25,1.2);
    for(const x of [-.052,.052]){
      this.sphere(.024,x,1.615,.116,0xc4c3a8,g,1,.46,.4);this.sphere(.009,x,1.615,.126,0x1c241c,g,.7,1,.4);
      this.box(.052,.009,.009,x,1.647,.116,hair,g);
      this.sphere(.03,x<0?-.13:.13,1.58,0,skin,g,.5,1,.7);
      if(p.glasses){const rim=new THREE.Mesh(new THREE.TorusGeometry(.035,.0035,6,18),this.mat(0x233830,.3,.6));rim.scale.y=.72;rim.position.set(x,1.615,.145);g.add(rim);}
    }
    this.box(.05,.009,.005,0,1.517,.122,0x704c3e,g);
    for(const x of [-.28,.28]){
      const arm=this.cyl(.066,.054,.49,x,1.04,0,cloth,g);arm.rotation.z=x<0?-.12:.12;
      this.cyl(.047,.043,.24,x*1.13,.69,.012,skin,g);this.sphere(.052,x*1.13,.55,.025,skin,g,.7,1.3,.6);
    }
    // Collar, lanyard, ID badge and shirt buttons.
    for(const x of [-.07,.07]){this.box(.075,.09,.015,x,1.31,.135,0xc9c9b0,g).rotation.z=x>0?.4:-.4;this.box(.009,.31,.018,x*.65,1.2,.151,0x4c7770,g).rotation.z=x>0?-.12:.12;}
    this.box(.085,.115,.018,0,1.025,.159,0xd7d8c0,g);this.box(.035,.044,.019,-.015,1.04,.17,0x53756c,g);
    for(let y=.84;y<1.3;y+=.1)this.sphere(.008,0,y,.149,0xc9c8b2,g);
    g.traverse(o=>{if(o.isMesh)this.npcMeshes.push(o);});
  }
  setMode(mode){this.mode=mode;this.gun.visible=mode==='play';if(mode==='play'){this.camera.position.set(0,1.67,-.9);this.yaw=0;this.pitch=-.015;this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');}else{this.unlock();this.keys={};this.flashlight.visible=false;}this.resize();}
  lock(){try{const p=this.canvas.requestPointerLock();p?.catch?.(()=>{});}catch{}}
  unlock(){if(document.pointerLockElement)document.exitPointerLock();this.aim=false;}
  focus(id){const map={door:[0,1.67,-.9,0,-.015],records:[-2.8,1.67,-.3,1.05,-.15],radio:[2.35,1.67,-.4,-.83,-.16],board:[-3,1.67,2.1,1.5,.1]};const p=map[id]||map.door;this.camera.position.set(p[0],p[1],p[2]);this.yaw=p[3];this.pitch=p[4];}
  scan(kind){this.scanUntil=this.elapsed+1.2;this.scanKind=kind;this.flashlight.color.set(kind==='uv'?0x8245ff:kind==='thermal'?0xff995c:0xc5fff1);this.flashlight.visible=true;}
  fire(force=false){
    if(this.mode!=='play'||!this.npc||this.dead||this.depart)return false;
    this.camera.updateMatrixWorld();this.ray.setFromCamera(new THREE.Vector2(0,0),this.camera);
    const hit=this.ray.intersectObjects(this.npcMeshes,false)[0];
    if(!force&&!hit)return this.onShoot(false);
    if(this.onShoot(true)===false)return false;
    this.recoil=1;this.muzzleLight.intensity=100;this.muzzleMesh.visible=true;this.dead=true;
    if(this.blood){const pt=hit?.point||new THREE.Vector3(0,1.2,-4.4);for(let i=0;i<42;i++){const mesh=this.sphere(.012+Math.random()*.021,pt.x,pt.y,pt.z,this.mat(i%3?0x721e17:0xa92e23,.23));const v=new THREE.Vector3((Math.random()-.5)*3,Math.random()*3,(Math.random()-.2)*3);this.particles.push({mesh,v,life:1.2+Math.random()});}
      const pool=new THREE.Mesh(new THREE.CircleGeometry(.42,20),this.mat(0x591812,.2));pool.rotation.x=-Math.PI/2;pool.position.set(0,.027,-4.5);pool.scale.set(1,.65,1);this.scene.add(pool);this.decals.push(pool);
    }
    return true;
  }
  leave(action){if(!this.dead)this.depart={action,t:0};if(action==='admit')this.door.rotation.y=-1.2;}
  reset(){this.decals.forEach(p=>{this.scene.remove(p);p.geometry.dispose();});this.decals=[];this.particles.forEach(p=>{this.scene.remove(p.mesh);p.mesh.geometry.dispose();});this.particles=[];this.door.rotation.y=-.16;}
  resize(){this.camera.aspect=innerWidth/innerHeight;if(innerWidth<=760&&this.mode==='play')this.camera.setViewOffset(innerWidth,innerHeight,0,Math.max(0,innerHeight/2-190),innerWidth,innerHeight);else this.camera.clearViewOffset();this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);this.composer.setSize(innerWidth,innerHeight);}
  canWalk(x,z){return !this.colliders.some(c=>Math.abs(x-c.x)<c.w/2+.16&&Math.abs(z-c.z)<c.d/2+.16);}
  animate(){
    requestAnimationFrame(()=>this.animate());const dt=Math.min(this.clock.getDelta(),.05);this.elapsed+=dt;const t=this.elapsed;
    if(this.mode==='menu'){this.camera.position.set(4+Math.sin(t*.07)*.35,1.73,-5.6);this.camera.lookAt(-12,1.7,-5.25);}
    if(this.mode==='play'&&!this.paused){
      const direction=new THREE.Vector3((this.keys.KeyD?1:0)-(this.keys.KeyA?1:0),0,(this.keys.KeyS?1:0)-(this.keys.KeyW?1:0));
      if(direction.length()){direction.normalize().applyAxisAngle(UP,this.yaw);const nx=THREE.MathUtils.clamp(this.camera.position.x+direction.x*dt*2.1,-4.45,4.45),nz=THREE.MathUtils.clamp(this.camera.position.z+direction.z*dt*2.1,-2.5,5.2);if(this.canWalk(nx,this.camera.position.z))this.camera.position.x=nx;if(this.canWalk(this.camera.position.x,nz))this.camera.position.z=nz;}
      this.camera.rotation.set(this.pitch+this.recoil*.04,this.yaw,0,'YXZ');
      this.camera.position.y=1.67+(this.motion&&direction.length()?Math.sin(t*10)*.018:0);
      this.gun.position.lerp(new THREE.Vector3(this.aim?.01:.23,-.23,-.65+this.recoil*.08),.18);
      this.gun.rotation.set(this.recoil*.24,0,this.motion?Math.sin(t*1.8)*.009:0);
      this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,this.aim?49:62,.12);this.camera.updateProjectionMatrix();
      this.ray.setFromCamera(this.mouse,this.camera);let nearest=null,score=.975;
      for(const target of this.targets){const dir=target.pos.clone().sub(this.camera.position);const dist=dir.length();const dot=dir.normalize().dot(this.ray.ray.direction);if(dot>score&&dist<6){nearest=target;score=dot;}}
      if(nearest?.id!==this.lookTarget?.id){this.lookTarget=nearest;this.onLook(nearest);}
    }
    this.recoil=Math.max(0,this.recoil-dt*4);if(this.recoil<.8){this.muzzleLight.intensity=0;this.muzzleMesh.visible=false;}
    if(this.npc){if(this.dead){this.npc.rotation.x=THREE.MathUtils.lerp(this.npc.rotation.x,-Math.PI/2,.09);this.npc.position.y=THREE.MathUtils.lerp(this.npc.position.y,.15,.08);}else if(this.depart){this.depart.t+=dt;this.npc.position.x+=dt*(this.depart.action==='admit'?-1.3:1.8);this.npc.rotation.y=this.depart.action==='admit'?-Math.PI/2:Math.PI/2;if(this.depart.t>2.5)this.npc.visible=false;}else{this.npc.position.y=Math.sin(t*1.6)*.005;this.npc.rotation.y=Math.sin(t*.5)*.024;}}
    if(this.scanUntil<t&&this.scanUntil>0){this.flashlight.color.set(0xe6f5de);this.flashlight.visible=false;this.scanUntil=0;}
    if(this.flicker)this.flicker.intensity=Math.sin(t*24)>.98?4:22;
    const r=this.rain.geometry.attributes.position;for(let i=0;i<r.count;i++){r.array[i*3+1]-=dt*8;if(r.array[i*3+1]<-2)r.array[i*3+1]=14;}r.needsUpdate=true;
    this.particles=this.particles.filter(p=>{p.life-=dt;p.v.y-=dt*9;p.mesh.position.addScaledVector(p.v,dt);if(p.mesh.position.y<.04){p.mesh.position.y=.04;p.v.set(0,0,0);p.mesh.scale.y=.12;}if(p.life<=0){this.scene.remove(p.mesh);p.mesh.geometry.dispose();return false;}return true;});
    this.composer.render();
  }
}
