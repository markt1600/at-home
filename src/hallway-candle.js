import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const CANDLE_WICKS=[[0,0],[-.050,-.050],[.050,-.050],[.050,.050],[-.050,.050]];
const durations={uncovering:4.1,lighting:4.5,extinguishing:3.8,covering:4.1};
const mix=THREE.MathUtils.lerp;
const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
const phase=(t,a,b)=>smooth((t-a)/(b-a));

function makeHand(world,parent,side){
 const hand=new THREE.Group();hand.name=side<0?'Left hand lifting candle cover':'Right hand lighting candle';parent.add(hand);
 const skin=world.mat(0xc99470,.9),nails=world.mat(0xd7ab8a,.88),sleeve=world.mat(0xd8d5cc,.96);
 const soft=(w,h,d,x,y,z,material)=>{const o=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.32),material);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;hand.add(o);return o;};
 soft(.065,.025,.081,0,0,0,skin);
 for(let i=0;i<4;i++){const x=(i-1.5)*.015,length=[.046,.058,.055,.043][i];soft(.012,.015,length,x,-.002,-.038-length/2,skin);const tip=soft(.012,.019,.018,x,-.007,-.040-length,skin);tip.rotation.x=-.35;soft(.008,.002,.010,x,.004,-.036-length,nails);}
 soft(.018,.019,.050,-side*.038,-.007,-.025,skin).rotation.y=-side*.65;
 soft(.039,.028,.070,0,-.003,.067,skin);soft(.055,.045,.16,0,-.006,.165,sleeve);
 // Fingers move with the palm, so each hand needs only three material draws.
 for(const material of [skin,nails,sleeve]){const parts=hand.children.filter(o=>o.material===material),geometries=parts.map(o=>{o.updateMatrix();return o.geometry.clone().applyMatrix4(o.matrix);});const joined=new THREE.Mesh(mergeGeometries(geometries),material);joined.castShadow=joined.receiveShadow=true;for(const o of parts){o.removeFromParent();o.geometry.dispose();}for(const geometry of geometries)geometry.dispose();hand.add(joined);}
 return hand;
}

export class HallwayCandle{
 constructor(world,candle,cover,m){
  this.world=world;this.cover=cover;this.root=new THREE.Group();this.root.name='Hallway candle flames, hands and smoke';this.root.userData.dynamic=true;candle.add(this.root);cover.userData.dynamic=true;
  this.park=new THREE.Vector3(.88,0,.05);this.hands=[makeHand(world,this.root,-1),makeHand(world,this.root,1)];
  this.lighter=new THREE.Group();this.lighter.name='Long candle lighter';this.hands[1].add(this.lighter);
  const grip=new THREE.Mesh(new RoundedBoxGeometry(.026,.026,.075,2,.006),m.black);grip.position.set(.006,-.018,-.036);this.lighter.add(grip);
  const path=new THREE.LineCurve3(new THREE.Vector3(.006,-.02,-.075),new THREE.Vector3(-.10,-.10,-.20));
  this.lighter.add(new THREE.Mesh(new THREE.TubeGeometry(path,1,.0045,8,false),m.steel));
  const fire=new THREE.MeshBasicMaterial({color:0xffa52b,transparent:true,opacity:.92,toneMapped:false,depthWrite:false}),core=new THREE.MeshBasicMaterial({color:0xfff2b6,toneMapped:false,transparent:true,depthWrite:false});
  const flameGeo=new THREE.SphereGeometry(1,12,10);
  this.flames=CANDLE_WICKS.map(([x,z])=>{const g=new THREE.Group();g.position.set(x,.356,z);this.root.add(g);const outer=new THREE.Mesh(flameGeo,fire),inner=new THREE.Mesh(flameGeo,core);outer.scale.set(.007,.023,.007);outer.position.y=.021;inner.scale.set(.0035,.010,.0035);inner.position.y=.010;g.add(outer,inner);return g;});
  this.lighterFlame=new THREE.Mesh(flameGeo,core);this.lighterFlame.scale.set(.0035,.011,.0035);this.lighterFlame.position.set(-.10,-.092,-.20);this.lighter.add(this.lighterFlame);
  // A small warm pool on the wax gives candlelight without five scene lights.
  this.glow=new THREE.Mesh(new THREE.CircleGeometry(.124,48),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{strength:{value:0}},vertexShader:'varying vec2 p;void main(){p=uv-.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;uniform float strength;void main(){float a=1.-smoothstep(.1,.5,length(p));gl_FragColor=vec4(1.,.52,.12,a*strength*.28);}'}));this.glow.rotation.x=-Math.PI/2;this.glow.position.y=.346;this.root.add(this.glow);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(60*3),3));geometry.setAttribute('size',new THREE.Float32BufferAttribute(new Float32Array(60),1));geometry.setAttribute('opacity',new THREE.Float32BufferAttribute(new Float32Array(60),1));
  const smokeMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:'attribute float size;attribute float opacity;varying float alpha;void main(){alpha=opacity;vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=min(90.,size*500./max(.1,-p.z));gl_Position=projectionMatrix*p;}',fragmentShader:'varying float alpha;void main(){float r=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.05,1.,r))*alpha;gl_FragColor=vec4(.48,.50,.49,a);}'});
  this.smoke=new THREE.Points(geometry,smokeMaterial);this.smoke.name='Five fading candle smoke trails';this.smoke.frustumCulled=false;this.root.add(this.smoke);this.breath=new THREE.Vector3(0,0,-1);
  candle.updateWorldMatrix(true,true);
  this.item=world.houseInteractions.add({id:'hallway-candle',pos:candle.localToWorld(new THREE.Vector3(0,.43,.03)),touchPoints:[candle.localToWorld(new THREE.Vector3(0,.20,0)),candle.localToWorld(new THREE.Vector3(0,.43,0))],touchRadius:.18,range:2.15,surfaceOffset:.19,label:()=>this.label,activate:()=>this.activate(),update:dt=>this.update(dt)});
  this.reset();
 }
 get busy(){return !['covered','lit'].includes(this.stage);}
 get label(){return {covered:'Light hallway candle',uncovering:'Lifting glass cover…',lighting:'Lighting five wicks…',lit:'Blow out candle',extinguishing:'Candle smoke…',covering:'Replacing glass cover…'}[this.stage];}
 reset(){this.stage='covered';this.time=0;this.elapsed=0;this.litCount=0;this.cover.position.set(0,0,0);this.cover.rotation.set(0,0,0);this.flames.forEach(f=>f.visible=false);this.hands.forEach(h=>h.visible=false);this.lighter.visible=false;this.smoke.visible=false;this.glow.material.uniforms.strength.value=0;}
 enter(stage){this.stage=stage;this.time=0;}
 activate(){
  if(this.busy)return false;
  if(this.stage==='covered'){this.enter('uncovering');return true;}
  const camera=this.root.worldToLocal(this.world.camera.position.clone());this.breath.set(-camera.x,0,-camera.z).normalize();this.enter('extinguishing');return true;
 }
 coverPath(t){
  if(t<.55)return new THREE.Vector3();
  if(t<1.35)return new THREE.Vector3(0,.47*phase(t,.55,1.35),0);
  if(t<2.05)return new THREE.Vector3(.44*phase(t,1.35,2.05),mix(.47,.53,phase(t,1.35,2.05)),.30*phase(t,1.35,2.05));
  if(t<2.8)return new THREE.Vector3(mix(.44,.88,phase(t,2.05,2.8)),mix(.53,.47,phase(t,2.05,2.8)),mix(.30,.05,phase(t,2.05,2.8)));
  return new THREE.Vector3(.88,.47*(1-phase(t,2.8,3.55)),.05);
 }
 gripCover(t){
  const reach=phase(t,0,.55)*(1-phase(t,3.55,4.1));
  this.hands.forEach((h,i)=>{const side=i?1:-1;h.visible=true;h.position.set(this.cover.position.x+side*mix(.31,.188,reach),this.cover.position.y+mix(.14,.30,reach),this.cover.position.z+mix(.40,.012,reach));h.rotation.set(0,0,-side*Math.PI/2*reach);});
 }
 updateSmoke(t){
  const p=this.smoke.geometry.attributes.position,size=this.smoke.geometry.attributes.size,opacity=this.smoke.geometry.attributes.opacity;let visible=false;
  for(let i=0;i<60;i++){
   const wick=i%5,j=Math.floor(i/5),age=t-(.35+wick*.06+j*.029),[x,z]=CANDLE_WICKS[wick];
   const live=age>0&&age<2.65;visible||=live;opacity.setX(i,live?Math.sin(Math.PI*age/2.65)*.21:0);size.setX(i,.012+Math.max(0,age)*.028);
   p.setXYZ(i,x+this.breath.x*Math.max(0,age)*.06+Math.sin(age*4+j)*age*.007,.362+Math.max(0,age)*.12,z+this.breath.z*Math.max(0,age)*.06+Math.cos(age*3+j)*age*.007);
  }
  p.needsUpdate=size.needsUpdate=opacity.needsUpdate=true;this.smoke.visible=visible;
 }
 update(dt){
  if(dt<=0)return;this.time+=dt;this.elapsed+=dt;const t=this.time;this.hands.forEach(h=>h.visible=false);this.lighter.visible=false;
  if(this.stage==='uncovering'||this.stage==='covering'){
   const reverse=this.stage==='covering';this.cover.position.copy(this.coverPath(reverse?4.1-t:t));this.gripCover(t);
   if(t>=4.1){this.cover.position.copy(reverse?new THREE.Vector3():this.park);this.hands.forEach(h=>h.visible=false);this.enter(reverse?'covered':'lighting');}
  }else if(this.stage==='lighting'){
   const index=Math.min(4,Math.max(0,Math.floor((t-.6)/.62))),within=(t-.6-index*.62)/.62;
   this.litCount=Math.min(5,Math.max(0,Math.floor((t-.94)/.62)+1));
   const hand=this.hands[1],previous=CANDLE_WICKS[Math.max(0,index-1)],target=CANDLE_WICKS[index],move=phase(within,0,.35),reach=phase(t,0,.6)*(1-phase(t,3.72,4.5));
   hand.visible=true;hand.rotation.set(0,0,0);hand.position.set(mix(.34,mix(previous[0],target[0],move)+.10,reach),mix(.18,.466,reach),mix(.52,mix(previous[1],target[1],move)+.20,reach));this.lighter.visible=true;this.lighterFlame.visible=t>.55&&t<3.72;
   if(t>=4.5){this.litCount=5;this.hands.forEach(h=>h.visible=false);this.lighter.visible=false;this.enter('lit');}
  }else if(this.stage==='extinguishing'){
   this.litCount=5-CANDLE_WICKS.filter((_,i)=>t>=.35+i*.06).length;this.updateSmoke(t);
   if(t>=durations.extinguishing){this.litCount=0;this.smoke.visible=false;this.enter('covering');}
  }
  const blowing=this.stage==='extinguishing'?phase(t,.05,.34):0;
  this.flames.forEach((f,i)=>{f.visible=this.stage==='extinguishing'?t<.35+i*.06:i<this.litCount;f.scale.set(1,1+Math.sin(this.elapsed*9+i*1.9)*.11+Math.sin(this.elapsed*17+i)*.045,1);f.rotation.set(this.breath.z*blowing*.65+Math.sin(this.elapsed*5+i)*.06,0,-this.breath.x*blowing*.65);});
  this.glow.material.uniforms.strength.value=this.litCount/5*(.94+Math.sin(this.elapsed*9)*.06);
 }
}
