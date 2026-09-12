import * as THREE from 'three';
export const VISITOR_IDS=['tan','aisha','lim','kavitha','wei','siti','raj','goh','ben','farah','chan','mei'];
const HEIGHTS=[1.75,1.67,1.78,1.66,1.73,1.65,1.8,1.64,1.76,1.68,1.75,1.63];
// Runtime chroma key preserves dark hair, trousers and the gaps between limbs.
export function keyStandingAtlas(data,width,height){
 const counts=new Uint32Array(width);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,r=data[i],g=data[i+1],b=data[i+2],spill=Math.min(r,b)-g;
  const alpha=1-Math.max(0,Math.min(1,(spill-35)/85));data[i+3]=Math.round(data[i+3]*alpha);
  if(alpha<1&&alpha>0){data[i]=Math.min(r,g+35);data[i+2]=Math.min(b,g+35);}
  if(data[i+3]>160)counts[x]++;
 }
 const edges=[0];
 for(let k=1;k<3;k++){
  let best=Math.round(width*k/3),score=Infinity;
  for(let x=Math.floor(width*(k/3-.05));x<width*(k/3+.05);x++){
   const cost=counts[x]+Math.abs(x-width*k/3)*.0001;if(cost<score){score=cost;best=x;}
  }edges.push(best);
 }edges.push(width);
 return edges.slice(0,3).map((start,k)=>{
  let x0=edges[k+1],x1=start,y0=height,y1=0;
  for(let y=0;y<height;y++)for(let x=start;x<edges[k+1];x++)if(data[(y*width+x)*4+3]>160){x0=Math.min(x0,x);x1=Math.max(x1,x+1);y0=Math.min(y0,y);y1=Math.max(y1,y+1);}
  return{x0:Math.max(start,x0-1),x1:Math.min(edges[k+1],x1+1),y0:Math.max(0,y0-1),y1:Math.min(height,y1+1)};
 });
}
export function standingTexture(atlas,index){
 const map=new THREE.Texture(),image=atlas.image,frame=atlas.userData.frames[index%3];
 map.source=atlas.source;map.colorSpace=atlas.colorSpace;map.userData.pixels=atlas.userData.pixels;
 map.repeat.set((frame.x1-frame.x0)/image.width,(frame.y1-frame.y0)/image.height);
 map.offset.set(frame.x0/image.width,1-frame.y1/image.height);map.needsUpdate=true;return map;
}
export function createStandingVisitor(atlas,index,{height=HEIGHTS[index],shadow=true}={}){
 const g=new THREE.Group(),map=standingTexture(atlas,index),frame=atlas.userData.frames[index%3];
 const width=height*(frame.x1-frame.x0)/(frame.y1-frame.y0);
 const m=new THREE.MeshBasicMaterial({map,color:0xc2c6bb,transparent:true,alphaTest:.18,side:THREE.DoubleSide});
 const idle={time:{value:index*2.713},strength:{value:1},height:{value:height}};
 m.onBeforeCompile=shader=>{
  shader.uniforms.visitorTime=idle.time;shader.uniforms.visitorMotion=idle.strength;shader.uniforms.visitorHeight=idle.height;
  shader.vertexShader='uniform float visitorTime; uniform float visitorMotion; uniform float visitorHeight;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float h=(position.y+visitorHeight*.5)/visitorHeight;
   float breath=sin(visitorTime*1.15);
   float chest=smoothstep(.43,.56,h)*(1.0-smoothstep(.72,.83,h));
   transformed.x*=1.0+visitorMotion*breath*.012*chest;
   transformed.y+=visitorMotion*breath*.004*smoothstep(.48,.78,h);
   transformed.z+=visitorMotion*breath*.009*chest;
   transformed.x+=visitorMotion*sin(visitorTime*.43)*.006*h*h;
   float phase=clamp((mod(visitorTime,27.0)-21.0)/5.0,0.0,1.0);
   float tilt=visitorMotion*.055*pow(sin(phase*3.14159265),2.0)*smoothstep(.77,.9,h);
   float neck=visitorHeight*.32;
   vec2 head=vec2(transformed.x,transformed.y-neck);
   transformed.xy=mat2(cos(tilt),sin(tilt),-sin(tilt),cos(tilt))*head+vec2(0.0,neck);
  `);
 };
 const body=new THREE.Mesh(new THREE.PlaneGeometry(width,height,18,48),m);body.name='Complete visitor';body.position.y=height/2;g.add(body);g.userData.body=body;g.userData.height=height;g.userData.idle=idle;
 if(shadow){
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{opacity:{value:.36}},vertexShader:'varying vec2 v; void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 v; uniform float opacity; void main(){float a=1.0-smoothstep(0.1,0.5,length(v-0.5));gl_FragColor=vec4(0.0,0.0,0.0,a*opacity);}'});
  const contact=new THREE.Mesh(new THREE.PlaneGeometry(width*1.15,.43),material);contact.rotation.x=-Math.PI/2;contact.position.y=.005;g.add(contact);g.userData.contactShadow=contact;
 }return g;
}
export function animateStandingVisitor(visitor,dt,enabled=true){
 const idle=visitor.userData.idle;if(!idle||visitor.userData.fall)return;
 idle.strength.value=enabled?1:0;if(enabled)idle.time.value+=dt;
}
export function visibleVisitorHit(hit){
 const map=hit.object.material.map,pixels=map?.userData.pixels;if(!pixels||!hit.uv)return true;
 const u=hit.uv.x*map.repeat.x+map.offset.x,v=hit.uv.y*map.repeat.y+map.offset.y;
 const x=Math.min(map.image.width-1,Math.max(0,Math.floor(u*map.image.width))),y=Math.min(map.image.height-1,Math.max(0,Math.floor((1-v)*map.image.height)));
 return pixels[(y*map.image.width+x)*4+3]>=64;
}
