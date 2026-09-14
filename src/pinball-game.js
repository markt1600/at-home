import * as THREE from 'three';

export const PINBALL_BUMPERS=[[-.35,.52],[.34,.62],[0,.99]];
const clamp=THREE.MathUtils.clamp;
export class PinballGame{
 constructor(machine,visual={}){this.machine=machine;this.visual=visual;this.active=false;this.keys=new Set();this.reset();}
 reset(){this.score=0;this.ballNumber=1;this.keys.clear();this.ready();}
 ready(){this.phase='ready';this.ball={x:.80,y:2.07,vx:0,vy:0};this.left=this.right=0;this.paint();this.onChange?.();}
 launch(){if(!this.active||this.phase==='playing')return false;if(this.phase==='over'){this.reset();}this.phase='playing';this.ball={x:.80,y:2.07,vx:-.10,vy:-3.65};this.onChange?.();return true;}
 get status(){return this.phase==='over'?'Game over — play again?':this.phase==='ready'?'Launch the ball when you’re ready.':'Keep the ball in play. Hit the bumpers to score!';}
 segment(ax,ay,bx,by,bounce=.78,kick=false){
  const b=this.ball,dx=bx-ax,dy=by-ay,t=clamp(((b.x-ax)*dx+(b.y-ay)*dy)/(dx*dx+dy*dy),0,1),px=ax+dx*t,py=ay+dy*t,nx=b.x-px,ny=b.y-py,d=Math.hypot(nx,ny),radius=.064;
  if(d>=radius)return;const ux=d>1e-6?nx/d:0,uy=d>1e-6?ny/d:-1;b.x=px+ux*radius;b.y=py+uy*radius;
  const dot=b.vx*ux+b.vy*uy;if(dot<0){b.vx-=(1+bounce)*dot*ux;b.vy-=(1+bounce)*dot*uy;}
  if(kick&&b.y<2.12){b.vy=-3.1;b.vx=(ax<0?.7:-.7)+b.x*.35;}
 }
 update(dt){
  if(!this.active||dt<=0)return;dt=Math.min(dt,.05);const n=Math.ceil(dt*240),step=dt/n;
  for(let j=0;j<n;j++){
   this.left=THREE.MathUtils.damp(this.left,this.keys.has('left')?1:0,36,step);this.right=THREE.MathUtils.damp(this.right,this.keys.has('right')?1:0,36,step);
   if(this.phase!=='playing')continue;const b=this.ball;b.vy+=1.65*step;b.x+=b.vx*step;b.y+=b.vy*step;
   for(const [ax,ay,bx,by] of [[-.92,0,-.92,2.32],[.92,0,.92,2.32],[-.92,0,.92,0],[.68,.62,.68,2.32],[-.92,1.42,-.52,1.93],[.67,1.48,.5,1.93]])this.segment(ax,ay,bx,by);
   if(b.y<.30&&b.x>.45&&b.vy<0)b.vx-=step*5.5;
   for(const [x,y] of PINBALL_BUMPERS){const dx=b.x-x,dy=b.y-y,d=Math.hypot(dx,dy);if(d<.182){const nx=d?dx/d:1,ny=d?dy/d:0;b.x=x+nx*.183;b.y=y+ny*.183;b.vx=nx*2.3;b.vy=ny*2.3;this.score+=100;this.onChange?.();}}
   for(const [x,value,sign] of [[-.5,this.left,1],[.5,this.right,-1]]){const a=.35-value*.96;this.segment(x,1.96,x+sign*.37*Math.cos(a),1.96+.37*Math.sin(a),.65,value>.35);}
   const speed=Math.hypot(b.vx,b.vy);if(speed>4.3){b.vx*=4.3/speed;b.vy*=4.3/speed;}
   if(b.y>2.43){if(this.ballNumber===3){this.phase='over';this.onChange?.();}else{this.ballNumber++;this.ready();}}
  }this.paint();
 }
 paint(){const {ball,flippers}=this.visual;if(ball){ball.visible=this.phase!=='over';ball.position.set(this.ball.x*.29,.045,(this.ball.y-1.17)*.47);}
  if(flippers)for(const [i,value] of [this.left,this.right].entries()){const a=.35-value*.96,dx=Math.cos(a)*.29,dz=Math.sin(a)*.47;flippers[i].rotation.y=i?Math.PI+Math.atan2(dz,dx):-Math.atan2(dz,dx);flippers[i].scale.x=Math.hypot(dx,dz)/.29;}
 }
 enter(world){if(this.active)return;this.active=true;this.world=world;this.keys.clear();this.saved={position:world.camera.position.clone(),yaw:world.yaw,pitch:world.pitch,feet:{...world.feet},eyeHeight:world.eyeHeight};this.viewAspect=null;this.resizeView();this.onChange?.();}
 resizeView(){if(!this.active||this.viewAspect===this.world.camera.aspect)return;const w=this.world;this.viewAspect=w.camera.aspect;this.machine.updateWorldMatrix(true,true);const distance=Math.max(1.48,.60/Math.max(.35,w.camera.aspect));w.camera.position.copy(this.machine.localToWorld(new THREE.Vector3(0,2.45,distance)));w.camera.lookAt(this.machine.localToWorld(new THREE.Vector3(0,1.03,.02)));const e=new THREE.Euler().setFromQuaternion(w.camera.quaternion,'YXZ');w.yaw=e.y;w.pitch=e.x;}
 leave(){if(!this.active)return;this.active=false;this.keys.clear();const w=this.world;w.camera.position.copy(this.saved.position);Object.assign(w,{yaw:this.saved.yaw,pitch:this.saved.pitch,feet:this.saved.feet,eyeHeight:this.saved.eyeHeight});w.camera.rotation.set(w.pitch,w.yaw,0,'YXZ');}
}

export function pinballControlsHTML(touch){return `<h2>Deadpool pinball</h2><p id="pinball-score" aria-live="polite"></p><p id="pinball-status"></p><p class="fine">${touch?'Hold the flipper buttons.':'← / A and → / D for flippers · Space to launch.'} Three balls. Hit the bumpers and keep it rolling.</p><div class="pinball-controls"><button data-flipper="left">Left flipper</button><button id="pinball-launch" class="primary">Launch</button><button data-flipper="right">Right flipper</button></div>`;}
export function mountPinballControls(element,game){
 const cleanup=[],on=(el,type,fn)=>{el.addEventListener(type,fn);cleanup.push(()=>el.removeEventListener(type,fn));};
 const update=()=>{element.querySelector('#pinball-score').textContent=`${game.score.toLocaleString()} points · Ball ${game.ballNumber} / 3`;element.querySelector('#pinball-status').textContent=game.status;const launch=element.querySelector('#pinball-launch');launch.disabled=game.phase==='playing';launch.textContent=game.phase==='over'?'Play again':'Launch';};
 for(const b of element.querySelectorAll('[data-flipper]')){on(b,'pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);game.keys.add(b.dataset.flipper);});for(const type of ['pointerup','pointercancel','lostpointercapture'])on(b,type,()=>game.keys.delete(b.dataset.flipper));}
 const keys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
 on(document,'keydown',e=>{if(keys[e.code]){e.preventDefault();game.keys.add(keys[e.code]);}else if(e.code==='Space'){e.preventDefault();if(!e.repeat)game.launch();}});on(document,'keyup',e=>{if(keys[e.code])game.keys.delete(keys[e.code]);});
 for(const type of ['blur','resize','orientationchange'])on(window,type,()=>game.keys.clear());on(document,'visibilitychange',()=>{if(document.hidden)game.keys.clear();});on(element.querySelector('#pinball-launch'),'click',()=>game.launch());game.onChange=update;update();return()=>{game.keys.clear();game.onChange=null;cleanup.forEach(fn=>fn());};
}
