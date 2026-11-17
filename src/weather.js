import * as THREE from 'three';
import {HOUSE_ROOMS,pointInPolygon} from './house-layout.js';
import {reflectionSurfaces} from './house-reflections.js';

// Occasional showers. Each day of the game has its own fixed weather, so the
// same saved day always looks the same and rain never flickers on and off.
const fraction=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export function dayShower(day){
 if(day<2||fraction(day)>.3)return null;   // the first day is always clear; about three days in ten see rain
 const start=5+fraction(day+.37)*14,length=1.5+fraction(day+.71)*3.5;
 return {start,end:start+length,strength:.55+fraction(day+.13)*.45};
}
// 0 (dry) to 1 (steady rain), easing in and out over about half an hour of the game's day.
export function rainAmount(hours){
 const day=Math.floor(hours/24)+1,time=((hours%24)+24)%24;let amount=0;
 for(const [d,offset] of [[day,0],[day-1,24]]){   // a late shower can run past midnight
  const shower=dayShower(d);if(!shower)continue;const t=time+offset;
  amount=Math.max(amount,shower.strength*Math.min(THREE.MathUtils.smoothstep(t,shower.start,shower.start+.5),1-THREE.MathUtils.smoothstep(t,shower.end-.5,shower.end)));
 }
 return Math.max(0,amount);
}
export const weatherLabel=amount=>amount>.6?'Rain':amount>.08?'Light rain':'';

// Fixed streak positions in a band around the house, never under its roof.
export function rainColumns(count=3600,{reach=13,random=fraction}={}){
 const xs=HOUSE_ROOMS.flatMap(r=>r.polygon.map(p=>p[0])),zs=HOUSE_ROOMS.flatMap(r=>r.polygon.map(p=>p[1]));
 const minX=Math.min(...xs)-reach,maxX=Math.max(...xs)+reach,minZ=Math.min(...zs)-reach,maxZ=Math.max(...zs)+reach,columns=[];
 for(let i=0;columns.length<count&&i<count*8;i++){
  const x=minX+random(i*2+1)*(maxX-minX),z=minZ+random(i*2+2)*(maxZ-minZ);
  if(!HOUSE_ROOMS.some(r=>pointInPolygon(x,z,r.polygon)))columns.push([x,z,random(i+.5)]);
 }
 return columns;
}

export class Weather{
 constructor(world){
  this.world=world;this.amount=0;this.time=0;
  const columns=rainColumns(),position=new Float32Array(columns.length*6),phase=new Float32Array(columns.length*4);
  columns.forEach(([x,z,p],i)=>{position.set([x,0,z,x,1,z],i*6);phase.set([p,0,p,1],i*4);});
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(position,3));geometry.setAttribute('drop',new THREE.BufferAttribute(phase,2));
  // Each streak falls through an 18 m column and starts again at the top.
  this.streaks=new THREE.LineSegments(geometry,new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},amount:{value:0}},
   vertexShader:'attribute vec2 drop;uniform float time;varying float fade;void main(){float fall=fract(drop.x*7.+time*(.85+drop.x*.3));vec3 p=position;p.y=17.-fall*18.+drop.y*.8;p.x+=drop.y*.05;fade=drop.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
   fragmentShader:'uniform float amount;varying float fade;void main(){gl_FragColor=vec4(.74,.82,.9,amount*.55*(.35+fade*.65));}'}));
  this.streaks.frustumCulled=false;this.streaks.visible=false;this.streaks.name='Rain';world.scene.add(this.streaks);
  // Drops running down the outside of the fixed window glass.
  this.glassMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0},amount:{value:0},size:{value:new THREE.Vector2(1,1)}},
   vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:`varying vec2 vUv;uniform float time;uniform float amount;uniform vec2 size;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   void main(){
    vec2 m=vUv*size;float alpha=0.;
    for(int layer=0;layer<2;layer++){
     float scale=layer==0?9.:15.;vec2 g=vec2(m.x*scale,m.y*scale*.32);float column=floor(g.x),seed=hash(vec2(column,float(layer)*7.));
     if(seed>amount*.9+.05)continue;
     float speed=.09+seed*.22,y=fract(g.y*.16+time*speed+seed*9.),x=fract(g.x)-.5+sin(m.y*9.+seed*40.)*.12;
     float head=smoothstep(.2,.0,length(vec2(x,(y-.94)*3.2))),trail=smoothstep(.09,.0,abs(x))*smoothstep(.2,.94,y)*step(y,.94)*.4;
     alpha=max(alpha,head+trail);
    }
    float beads=step(.985-amount*.02,hash(floor(m*42.)))*.35;
    gl_FragColor=vec4(.82,.9,.96,(alpha*.5+beads)*smoothstep(.02,.2,amount));
   }`});
  this.glass=new THREE.Group();this.glass.name='Rain on the windows';this.glass.visible=false;world.scene.add(this.glass);
  for(const pane of reflectionSurfaces().filter(p=>p.glass)){
   const material=this.glassMaterial.clone();material.uniforms.size.value.set(pane.width,pane.height);
   const mesh=new THREE.Mesh(new THREE.PlaneGeometry(pane.width,pane.height),material);
   mesh.position.set(...pane.position).addScaledVector(new THREE.Vector3(Math.sin(pane.yaw),0,Math.cos(pane.yaw)),pane.offset+.012);mesh.rotation.y=pane.yaw;mesh.renderOrder=3;this.glass.add(mesh);
  }
 }
 update(dt,hours){
  this.time+=dt;this.amount=this.override??rainAmount(hours);const raining=this.amount>.01;
  this.streaks.visible=this.glass.visible=raining;if(!raining)return;
  this.streaks.material.uniforms.time.value=this.time;this.streaks.material.uniforms.amount.value=this.amount;
  for(const mesh of this.glass.children){mesh.material.uniforms.time.value=this.time;mesh.material.uniforms.amount.value=this.amount;}
 }
}
