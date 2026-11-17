import * as THREE from 'three';
import {timeOfDay} from './life.js';
import {Neighborhood} from './neighborhood.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {Weather} from './weather.js';
import {hdrOutput,hdrExposure,AUTHORED_COLOUR_GLSL} from './authored-colour.js';
export function solarState(hours){const angle=(timeOfDay(hours)-6)/24*Math.PI*2,y=Math.sin(angle);return {direction:[-.8*Math.abs(Math.cos(angle)),y,.6*Math.cos(angle)],height:y,daylight:THREE.MathUtils.smoothstep(y,-.12,.35),gold:Math.max(0,1-Math.abs(y)/.32)};}
const blend=(stops,t)=>{const c=new THREE.Color();for(let i=1;i<stops.length;i++)if(t<=stops[i][0]||i===stops.length-1){const [t0,a]=stops[i-1],[t1,b]=stops[i];return c.set(a).lerp(new THREE.Color(b),THREE.MathUtils.clamp((t-t0)/(t1-t0),0,1));}return c;};
// Everything the hour and the weather decide about the light, as plain numbers
// and colours: a low warm sun at each end of the day, a cool moon at night,
// lamps that matter after dark, and a grey, softer day under rain.
export function lightingState(hours,rain=0){
 const s=solarState(hours),y=s.height,night=1-s.daylight,clear=1-rain*.8;
 const sun=THREE.MathUtils.smoothstep(y,-.05,.1)*(1.55+.85*THREE.MathUtils.smoothstep(y,.08,.5))*clear;
 const moon=THREE.MathUtils.smoothstep(-y,.12,.3)*.3*clear;
 return {...s,sun,moon,
  sunColor:blend([[0,0xff8a4c],[.14,0xffb072],[.4,0xfff0d8],[1,0xfff5e2]],Math.max(0,y)).lerp(new THREE.Color(0xdfe6ea),rain*.7),
  fill:(.2+1.2*s.daylight)*(1-rain*.22),
  fillColor:blend([[0,0x5c78a8],[.35,0xe9c9a6],[.7,0xc8e6ff],[1,0xc8e6ff]],s.daylight).lerp(new THREE.Color(0xb9c4cc),rain*.6),
  groundColor:blend([[0,0x2a2f3a],[.4,0xb58d62],[1,0xc4ab85]],s.daylight),
  lamps:1.18-.7*s.daylight+rain*.25*s.daylight,glow:.75+.6*night+rain*.25*s.daylight,
  fogColor:blend([[0,0x131f30],[.35,0xd8b79a],[.7,0xc9dce6],[1,0xc9dce6]],s.daylight).lerp(new THREE.Color(0x9aa5ab),rain*.75*s.daylight),
  fogDensity:.002+rain*.0045,exposure:1.05-.13*night+.06*s.gold*s.daylight,environment:.1+.3*s.daylight*(1-rain*.4),cloud:rain};
}
export class Daylight{
 constructor(world){
  this.world=world;this.sky=new THREE.Mesh(new THREE.SphereGeometry(200,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{sun:{value:new THREE.Vector3()},day:{value:1},gold:{value:0},cloud:{value:0},uHdrOutput:hdrOutput,uHdrExposure:hdrExposure},vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`${AUTHORED_COLOUR_GLSL}
varying vec3 v;uniform vec3 sun;uniform float day;uniform float gold;uniform float cloud;void main(){vec3 d=normalize(v);float h=smoothstep(-.1,.7,d.y);vec3 horizon=mix(vec3(.025,.045,.085),mix(vec3(.78,.87,.89),vec3(1.,.57,.32),gold),day);vec3 zenith=mix(vec3(.015,.028,.07),vec3(.24,.56,.81),day);vec3 c=mix(horizon,zenith,h);c=mix(c,mix(vec3(.03,.04,.055),vec3(.62,.66,.69),day),cloud*.9);float disk=smoothstep(.9995,.99985,dot(d,sun));c+=vec3(1.,.8,.47)*disk*2.*(1.-cloud);float halo=pow(max(dot(d,sun),0.),24.);c+=vec3(1.,.62,.34)*halo*gold*day*.35*(1.-cloud);float moon=smoothstep(.99955,.9998,dot(d,-sun));c+=vec3(.86,.9,1.)*moon*(1.-day)*1.4*(1.-cloud);float stars=step(.9987,fract(sin(dot(floor(d.xz*800.),vec2(127.1,311.7)))*43758.5453));c+=stars*(1.-day)*smoothstep(0.,.4,d.y)*.6*(1.-cloud);if(uHdrOutput>.5)c=authoredToScene(pow(max(c,0.),vec3(2.2)));gl_FragColor=vec4(c,1.);}` }));world.scene.add(this.sky);
  this.sun=new THREE.DirectionalLight(0xfff0d5,2);this.sun.castShadow=true;const shadowSize=globalThis.matchMedia?.('(pointer:coarse)').matches?1024:2048;this.sun.shadow.mapSize.set(shadowSize,shadowSize);Object.assign(this.sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:.5,far:80});this.sun.shadow.autoUpdate=false;this.sun.shadow.needsUpdate=true;this.shadowInterval=shadowSize===1024?500:180;this.lastShadow=-Infinity;this.sun.shadow.bias=-.00015;this.sun.shadow.normalBias=.025;world.scene.add(this.sun,this.sun.target);
  this.fill=new THREE.HemisphereLight(0xc6e4ff,0xc4ab85,1);world.scene.add(this.fill);
  this.neighborhood=new Neighborhood(world);
  this.lights=[];const glowing=new Map(),selfLit=o=>{for(let p=o;p;p=p.parent)if(p.userData.dynamic)return true;return false;};   // candles, the stove and the tree lights animate their own glow
  world.houseRoot.traverse(o=>{if(o.isPointLight)this.lights.push([o,o.intensity]);if(o.isHemisphereLight)o.intensity=.25;if(o.isMesh&&o.material.transparent)o.castShadow=false;if(o.isMesh&&o.material.isMeshStandardMaterial&&o.material.emissive.getHex()!==0&&!o.material.emissiveMap&&!selfLit(o))glowing.set(o.material,o.material.emissiveIntensity);});this.glowing=[...glowing];
  installReflections(world);this.weather=new Weather(world);
  world.rain.visible=false;this.update(7.25);
 }
 update(hours,dt=0){const now=performance.now();if(now-this.lastShadow>=this.shadowInterval){this.sun.shadow.needsUpdate=true;this.lastShadow=now;}this.sky.position.copy(this.world.camera.position);this.weather.update(dt,hours);if(this.lastLight!==undefined&&now-this.lastLight<100)return;this.lastLight=now;
  const s=lightingState(hours,this.weather.amount),dir=new THREE.Vector3(...s.direction),uniforms=this.sky.material.uniforms,centre=new THREE.Vector3(-8,0,-7);
  uniforms.sun.value.copy(dir);uniforms.day.value=s.daylight;uniforms.gold.value=s.gold;uniforms.cloud.value=s.cloud;
  // One shadow-casting light serves as the sun by day and the moon by night.
  const moonlit=s.moon>0&&s.sun<=0;
  this.sun.position.copy(dir).multiplyScalar(moonlit?-35:35).add(centre);this.sun.target.position.copy(centre);
  this.sun.intensity=moonlit?s.moon:s.sun;this.sun.color.copy(moonlit?new THREE.Color(0x9db4e0):s.sunColor);
  this.fill.intensity=s.fill;this.fill.color.copy(s.fillColor);this.fill.groundColor.copy(s.groundColor);
  this.lights.forEach(([l,p])=>l.intensity=p*s.lamps);for(const [material,base] of this.glowing)material.emissiveIntensity=base*s.glow;
  const scene=this.world.scene;scene.fog.color.copy(s.fogColor);scene.fog.density=s.fogDensity;scene.environmentIntensity=s.environment;this.world.renderer.toneMappingExposure=s.exposure;}
}
// A soft, neutral room for polished surfaces to reflect: marble, steel, glass
// and the timber floor pick up highlights without a mirror pass per surface.
function installReflections(world){
 if(typeof document==='undefined')return;
 const generator=new THREE.PMREMGenerator(world.renderer),room=new RoomEnvironment();
 world.scene.environment=generator.fromScene(room,.04).texture;world.scene.environmentIntensity=.3;
 room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});generator.dispose();
}
