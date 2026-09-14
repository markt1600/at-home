import * as THREE from 'three';

const messages={aiming:'Aim over a toy, then drop the claw.',lowering:'Lowering the claw…',closing:'Grabbing…',raising:'Lifting…',returning:'Returning to the prize chute…',releasing:'Dropping your prize…',won:'You caught a toy!',missed:'Just missed. Try lining up with another toy.'};
export class ClawGame{
 constructor(machine,claw,cable,fingers,prizes){Object.assign(this,{machine,claw,cable,fingers,prizes,active:false,score:0,keys:new Set()});this.reset();}
 reset(){this.keys.clear();this.score=0;for(const p of this.prizes){this.machine.add(p.group);p.group.position.copy(p.start);p.group.visible=true;p.won=false;}this.nextRound();}
 nextRound(){this.phase='aiming';this.time=0;this.held=null;this.x=0;this.z=0;this.y=1.52;this.paint();this.onChange?.();}
 get status(){return messages[this.phase];}
 grab(){
  if(!this.active||this.phase!=='aiming')return false;
  this.target=this.prizes.filter(p=>!p.won).sort((a,b)=>Math.hypot(a.start.x-this.x,a.start.z-this.z)-Math.hypot(b.start.x-this.x,b.start.z-this.z))[0];
  if(this.target&&Math.hypot(this.target.start.x-this.x,this.target.start.z-this.z)>.09)this.target=null;
  this.lowerY=this.target?this.target.start.y+.09:1.19;this.transition('lowering');return true;
 }
 transition(phase){this.phase=phase;this.time=0;this.onChange?.();}
 update(dt){
  if(!this.active||dt<=0)return;dt=Math.min(.1,dt);this.time+=dt;
  if(this.phase==='aiming'){
   this.x=THREE.MathUtils.clamp(this.x+((this.keys.has('right')?1:0)-(this.keys.has('left')?1:0))*dt*.25,-.30,.30);
   this.z=THREE.MathUtils.clamp(this.z+((this.keys.has('down')?1:0)-(this.keys.has('up')?1:0))*dt*.25,-.20,.20);
  }else if(this.phase==='lowering'){this.y=THREE.MathUtils.lerp(1.52,this.lowerY,Math.min(1,this.time));if(this.time>=1)this.transition('closing');}
  else if(this.phase==='closing'&&this.time>=.5){if(this.target){this.held=this.target;this.claw.add(this.held.group);this.held.group.position.set(0,-.08,0);}this.transition('raising');}
  else if(this.phase==='raising'){this.y=THREE.MathUtils.lerp(this.lowerY,1.52,Math.min(1,this.time));if(this.time>=1){this.returnFrom=[this.x,this.z];this.transition('returning');}}
  else if(this.phase==='returning'){const t=Math.min(1,this.time);this.x=THREE.MathUtils.lerp(this.returnFrom[0],-.29,t);this.z=THREE.MathUtils.lerp(this.returnFrom[1],.20,t);if(t===1){if(this.held){this.machine.add(this.held.group);this.held.group.position.set(-.29,1.44,.20);}this.transition('releasing');}}
  else if(this.phase==='releasing'){
   if(this.held){const t=Math.min(1,this.time/.7);this.held.group.position.set(-.29,THREE.MathUtils.lerp(1.44,.25,t*t),THREE.MathUtils.lerp(.20,.43,t));}
   if(this.time>=.7){if(this.held){for(const p of this.prizes)if(p.won)p.group.visible=false;this.held.won=true;this.score++;}this.transition(this.held?'won':'missed');}
  }
  this.paint();
 }
 paint(){this.claw.position.set(this.x,this.y,this.z);this.cable.position.set(this.x,(1.7+this.y)/2,this.z);this.cable.scale.y=Math.max(.01,1.7-this.y);
  const closed=['raising','returning'].includes(this.phase)?1:this.phase==='closing'?Math.min(1,this.time/.5):0;for(const finger of this.fingers)finger.scale.set(1-closed*.6,1,1-closed*.6);
 }
 enter(world){
  if(this.active)return;this.active=true;this.world=world;this.keys.clear();this.saved={position:world.camera.position.clone(),yaw:world.yaw,pitch:world.pitch,feet:{...world.feet},eyeHeight:world.eyeHeight};
  this.viewAspect=null;this.resizeView();this.onChange?.();
 }
 resizeView(){if(!this.active||this.viewAspect===this.world.camera.aspect)return;const w=this.world;this.viewAspect=w.camera.aspect;this.machine.updateWorldMatrix(true,true);
  const distance=Math.max(1.32,.53/(Math.tan(THREE.MathUtils.degToRad(w.camera.fov/2))*w.camera.aspect));
  w.camera.position.copy(this.machine.localToWorld(new THREE.Vector3(0,1.62,distance)));w.camera.lookAt(this.machine.localToWorld(new THREE.Vector3(0,1.40,0)));
  const e=new THREE.Euler().setFromQuaternion(w.camera.quaternion,'YXZ');w.yaw=e.y;w.pitch=e.x;
 }
 leave(){if(!this.active)return;this.active=false;this.keys.clear();const w=this.world;w.camera.position.copy(this.saved.position);Object.assign(w,{yaw:this.saved.yaw,pitch:this.saved.pitch,feet:this.saved.feet,eyeHeight:this.saved.eyeHeight});w.camera.rotation.set(w.pitch,w.yaw,0,'YXZ');}
}

export function clawControlsHTML(touch){return `<h2>A little lucky grab</h2><p id="claw-status" role="status"></p><p class="fine">${touch?'Hold the arrows to aim.':'Arrow keys to aim · Space to drop.'} Line up the claw above a toy.</p><div class="claw-controls"><div class="claw-pad">${[['up','↑'],['left','←'],['down','↓'],['right','→']].map(([id,label])=>`<button data-claw-direction="${id}" aria-label="Move claw ${id}">${label}</button>`).join('')}</div><button id="claw-drop" class="primary">Drop claw</button></div><p class="fine" id="claw-score"></p>`;}
export function mountClawControls(element,game){
 const cleanup=[],on=(el,type,fn,opts)=>{el.addEventListener(type,fn,opts);cleanup.push(()=>el.removeEventListener(type,fn,opts));};
 const update=()=>{element.querySelector('#claw-status').textContent=game.status;const done=['won','missed'].includes(game.phase),button=element.querySelector('#claw-drop');button.disabled=game.phase!=='aiming'&&!done;button.textContent=done?'Play again':'Drop claw';element.querySelector('#claw-score').textContent=`Toys won: ${game.score}`;};
 const drop=()=>{if(['won','missed'].includes(game.phase)){if(game.prizes.every(p=>p.won))game.reset();else game.nextRound();}else game.grab();};
 for(const button of element.querySelectorAll('[data-claw-direction]')){
  const direction=button.dataset.clawDirection;on(button,'pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);game.keys.add(direction);});for(const type of ['pointerup','pointercancel','lostpointercapture'])on(button,type,()=>game.keys.delete(direction));
 }
 const directions={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
 on(document,'keydown',e=>{if(directions[e.code]){e.preventDefault();game.keys.add(directions[e.code]);}else if(['Space','KeyE'].includes(e.code)){e.preventDefault();if(!e.repeat)drop();}});
 on(document,'keyup',e=>{if(directions[e.code])game.keys.delete(directions[e.code]);});
 for(const type of ['blur','orientationchange','resize'])on(window,type,()=>game.keys.clear());
 on(document,'visibilitychange',()=>{if(document.hidden)game.keys.clear();});on(element.querySelector('#claw-drop'),'click',drop);game.onChange=update;update();
 return ()=>{game.keys.clear();game.onChange=null;cleanup.forEach(fn=>fn());};
}
