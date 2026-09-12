import * as THREE from 'three';
import {timeOfDay} from './life.js';
export function solarState(hours){const angle=(timeOfDay(hours)-6)/24*Math.PI*2,y=Math.sin(angle);return {direction:[-.8*Math.abs(Math.cos(angle)),y,.6*Math.cos(angle)],daylight:THREE.MathUtils.smoothstep(y,-.12,.35),gold:Math.max(0,1-Math.abs(y)/.32)};}
export class Daylight{
 constructor(world){
  this.world=world;this.sky=new THREE.Mesh(new THREE.SphereGeometry(80,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{sun:{value:new THREE.Vector3()},day:{value:1},gold:{value:0}},vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 v;uniform vec3 sun;uniform float day;uniform float gold;void main(){vec3 d=normalize(v);float h=smoothstep(-.1,.7,d.y);vec3 horizon=mix(vec3(.025,.045,.085),mix(vec3(.78,.87,.89),vec3(1.,.57,.32),gold),day);vec3 zenith=mix(vec3(.015,.028,.07),vec3(.24,.56,.81),day);vec3 c=mix(horizon,zenith,h);float disk=smoothstep(.9995,.99985,dot(d,sun));c+=vec3(1.,.8,.47)*disk*2.;float stars=step(.9987,fract(sin(dot(floor(d.xz*800.),vec2(127.1,311.7)))*43758.5453));c+=stars*(1.-day)*smoothstep(0.,.4,d.y)*.6;gl_FragColor=vec4(c,1.);}` }));world.scene.add(this.sky);
  this.sun=new THREE.DirectionalLight(0xfff0d5,2);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:.5,far:80});this.sun.shadow.bias=-.00015;this.sun.shadow.normalBias=.025;world.scene.add(this.sun,this.sun.target);
  this.fill=new THREE.HemisphereLight(0xc6e4ff,0xc4ab85,1);world.scene.add(this.fill);
  // A deliberately imagined, low distant neighborhood keeps the changing sky
  // visible. It does not reproduce or identify the home's real surroundings.
  this.outside=new THREE.Group();this.outside.name='Distant garden neighborhood';world.scene.add(this.outside);
  const building=new THREE.MeshStandardMaterial({color:0xb3b7a2,roughness:.95}),leaves=new THREE.MeshStandardMaterial({color:0x657c57,roughness:1});
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(130,180),new THREE.MeshStandardMaterial({color:0x859273,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set(-50,-14,-10);this.outside.add(ground);
  for(let i=0;i<14;i++){const h=3+i%4*1.7,m=new THREE.Mesh(new THREE.BoxGeometry(5,h,5),building);m.position.set(-52-(i%3)*8,-14+h/2,-60+i*8);this.outside.add(m);}
  for(let i=0;i<24;i++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(2+(i%3)*.4,1),leaves);m.position.set(-31-(i%4)*4,-10-(i%3)*.5,-48+i*4);m.scale.set(1,1.2,.9);this.outside.add(m);}
  this.lights=[];world.houseRoot.traverse(o=>{if(o.isPointLight)this.lights.push([o,o.intensity]);if(o.isHemisphereLight)o.intensity=.25;if(o.isMesh&&o.material.transparent)o.castShadow=false;});
  world.rain.visible=false;this.update(7.25);
 }
 update(hours){const s=solarState(hours),dir=new THREE.Vector3(...s.direction);this.sky.position.copy(this.world.camera.position);this.sky.material.uniforms.sun.value.copy(dir);this.sky.material.uniforms.day.value=s.daylight;this.sky.material.uniforms.gold.value=s.gold;this.sun.position.copy(dir).multiplyScalar(35).add(new THREE.Vector3(-8,0,-7));this.sun.target.position.set(-8,0,-7);this.sun.intensity=s.daylight*2.4;this.sun.color.set(s.gold>.4?0xffc28d:0xfff5df);this.fill.intensity=.38+s.daylight*1.05;this.fill.color.set(s.daylight>.4?0xc8e6ff:0x7d9bbb);this.lights.forEach(([l,p])=>l.intensity=p*(1.05-s.daylight*.55));this.world.scene.fog.color.set(s.daylight>.4?0xc9dce6:0x182b40);this.world.renderer.toneMappingExposure=1.05;}
}
