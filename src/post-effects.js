import * as THREE from 'three';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {hdrOutput,hdrExposure} from './authored-colour.js';

// Soft lighting: contact shadows where surfaces meet (ambient occlusion) and a
// gentle glow around lamps, candles and the sun. The house is drawn once into
// an HDR image with its depth; occlusion is worked out from that depth at half
// resolution, so no part of the scene is drawn a second time.
const KEY='at-home-soft-lighting';
export const SOFT_LIGHTING_CHOICES=['auto','on','off'];
export function softLightingChoice(storage=globalThis.localStorage){try{const v=storage?.getItem(KEY);return SOFT_LIGHTING_CHOICES.includes(v)?v:'auto';}catch{return 'auto';}}
export function saveSoftLightingChoice(choice,storage=globalThis.localStorage){try{storage?.setItem(KEY,SOFT_LIGHTING_CHOICES.includes(choice)?choice:'auto');}catch{}}
// Automatic: on for computers, off for phones and tablets, and off for the
// rest of the visit once the renderer cannot hold its frame rate with it.
export const softLightingEnabled=(choice,{touch=false,struggling=false}={})=>choice==='on'||choice==='auto'&&!touch&&!struggling;

const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const depthHelpers=`
uniform sampler2D tDepth;uniform float near;uniform float far;uniform vec2 projection;
float linearDepth(vec2 uv){float z=texture2D(tDepth,uv).x*2.-1.;return 2.*near*far/(far+near-z*(far-near));}
vec3 viewPosition(vec2 uv,float depth){return vec3((uv*2.-1.)/projection*depth,-depth);}`;
const occlusionShader={
 uniforms:{tDepth:{value:null},near:{value:.06},far:{value:220},projection:{value:new THREE.Vector2(1,1)},texel:{value:new THREE.Vector2()},aspect:{value:1},radius:{value:.45},intensity:{value:3.6}},
 vertexShader:vertex,
 fragmentShader:`varying vec2 vUv;uniform vec2 texel;uniform float aspect;uniform float radius;uniform float intensity;${depthHelpers}
 float noise(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
 void main(){
  // This pass runs at half resolution, so its pixel centres fall between depth
  // pixels. Work from the centre of one depth pixel to keep neighbours distinct.
  vec2 c=(floor(vUv/texel)+.5)*texel;
  float d=linearDepth(c);
  if(d>45.){gl_FragColor=vec4(1.,d,0.,1.);return;}
  vec3 p=viewPosition(c,d);
  vec2 ox=vec2(texel.x,0.),oy=vec2(0.,texel.y);
  float dl=linearDepth(c-ox),dr=linearDepth(c+ox),dd=linearDepth(c-oy),du=linearDepth(c+oy);
  // On a flat stretch both neighbours are used, which keeps the direction steady;
  // at an edge only the neighbour on this side of it is.
  float even=.004*d;
  vec3 dx=abs(dl+dr-2.*d)<even?(viewPosition(c+ox,dr)-viewPosition(c-ox,dl))*.5:abs(dl-d)<abs(dr-d)?p-viewPosition(c-ox,dl):viewPosition(c+ox,dr)-p;
  vec3 dy=abs(dd+du-2.*d)<even?(viewPosition(c+oy,du)-viewPosition(c-oy,dd))*.5:abs(dd-d)<abs(du-d)?p-viewPosition(c-oy,dd):viewPosition(c+oy,du)-p;
  vec3 n=normalize(cross(dx,dy));
  float reach=min(radius*projection.y*.5/d,.085),start=noise(gl_FragCoord.xy)*6.2831853,occlusion=0.;
  for(int i=0;i<10;i++){
   float t=(float(i)+.5)/10.,angle=start+float(i)*2.39996323;
   vec2 uv=c+vec2(cos(angle)/aspect,sin(angle))*reach*sqrt(t);
   vec3 v=viewPosition(uv,linearDepth(uv))-p;float l=length(v);
   occlusion+=max(0.,dot(n,v)/(l+.0001)-.1)*smoothstep(radius*1.7,radius*.35,l);
  }
  float fade=smoothstep(45.,28.,d);
  gl_FragColor=vec4(clamp(1.-intensity*occlusion/10.*fade,0.,1.),d,0.,1.);
 }`
};
const compositeShader={
 uniforms:{tColor:{value:null},tOcclusion:{value:null},tDepth:{value:null},near:{value:.06},far:{value:220},projection:{value:new THREE.Vector2(1,1)},occlusionTexel:{value:new THREE.Vector2()},strength:{value:.9},debug:{value:0}},
 vertexShader:vertex,
 fragmentShader:`varying vec2 vUv;uniform sampler2D tColor;uniform sampler2D tOcclusion;uniform vec2 occlusionTexel;uniform float strength;uniform float debug;${depthHelpers}
 void main(){
  vec4 color=texture2D(tColor,vUv);float d=linearDepth(vUv),sum=0.,weight=0.;
  // Blur the half-resolution shading without letting it bleed across edges.
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
   vec2 s=texture2D(tOcclusion,vUv+vec2(float(x),float(y))*occlusionTexel*1.5).rg;
   float w=1./(.015+abs(s.g-d)/max(d,.05)*30.);sum+=s.r*w;weight+=w;
  }
  color.rgb*=mix(1.,sum/weight,strength);if(debug>.5)color.rgb=vec3(sum/weight)*.8;gl_FragColor=color;
 }`
};

export class PostEffects{
 constructor(renderer){
  this.renderer=renderer;this.enabled=false;this.size=new THREE.Vector2();
  // Antialiased, HDR, and with a readable depth image for the occlusion pass.
  this.sceneTarget=new THREE.WebGLRenderTarget(4,4,{type:THREE.HalfFloatType,samples:4,depthTexture:new THREE.DepthTexture(4,4)});
  this.occlusionTarget=new THREE.WebGLRenderTarget(2,2,{type:THREE.HalfFloatType,depthBuffer:false});
  this.compositeTarget=new THREE.WebGLRenderTarget(4,4,{type:THREE.HalfFloatType,depthBuffer:false});
  this.occlusion=new FullScreenQuad(new THREE.ShaderMaterial({...occlusionShader,uniforms:THREE.UniformsUtils.clone(occlusionShader.uniforms),depthTest:false,depthWrite:false}));
  this.composite=new FullScreenQuad(new THREE.ShaderMaterial({...compositeShader,uniforms:THREE.UniformsUtils.clone(compositeShader.uniforms),depthTest:false,depthWrite:false}));
  // Only light brighter than white paper in full sun glows: lamps, flames, the sun, the tree lights.
  this.bloom=new UnrealBloomPass(new THREE.Vector2(4,4),.34,.55,1.02);
  this.output=new OutputPass();this.output.renderToScreen=true;
 }
 setSize(width,height){
  if(this.size.x===width&&this.size.y===height)return;this.size.set(width,height);
  const halfWidth=Math.max(1,Math.ceil(width/2)),halfHeight=Math.max(1,Math.ceil(height/2));
  this.sceneTarget.setSize(width,height);this.compositeTarget.setSize(width,height);this.occlusionTarget.setSize(halfWidth,halfHeight);this.bloom.setSize(width,height);
  this.occlusion.material.uniforms.texel.value.set(1/width,1/height);this.composite.material.uniforms.occlusionTexel.value.set(1/halfWidth,1/halfHeight);
 }
 render(scene,camera){
  const renderer=this.renderer,buffer=renderer.getDrawingBufferSize(new THREE.Vector2());this.setSize(buffer.x,buffer.y);
  hdrOutput.value=1;hdrExposure.value=renderer.toneMappingExposure;
  renderer.setRenderTarget(this.sceneTarget);renderer.render(scene,camera);hdrOutput.value=0;
  const e=camera.projectionMatrix.elements;
  for(const material of [this.occlusion.material,this.composite.material]){const u=material.uniforms;u.tDepth.value=this.sceneTarget.depthTexture;u.near.value=camera.near;u.far.value=camera.far;u.projection.value.set(e[0],e[5]);}
  this.occlusion.material.uniforms.aspect.value=camera.aspect;
  renderer.setRenderTarget(this.occlusionTarget);this.occlusion.render(renderer);
  const c=this.composite.material.uniforms;c.tColor.value=this.sceneTarget.texture;c.tOcclusion.value=this.occlusionTarget.texture;
  renderer.setRenderTarget(this.compositeTarget);this.composite.render(renderer);
  this.bloom.render(renderer,null,this.compositeTarget,0,false);
  this.output.render(renderer,null,this.compositeTarget,0,false);
  renderer.setRenderTarget(null);
 }
}
