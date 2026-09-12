import * as THREE from 'three';

const CLIPS=new Set(['tan','aisha','lim','kavitha','wei','siti','raj','goh','ben','farah','chan','mei']);

// MiniMax frames have 32px above/below a 704px body in a 384x768 image.
// Keep that body's scale and foot position identical to the still photograph.
export function attachVisitorVideo(body,id,height,animation='idle'){
 if(!CLIPS.has(id)||typeof document==='undefined')return null;
 const variant=animation==='reflection'&&['farah','mei'].includes(id)?'reflection':'idle';
 const src=`/art/motion/${id}-${variant}.mp4`;
 const material=body.material,poster=material.map,stillGeometry=body.geometry;
 const movieGeometry=new THREE.PlaneGeometry(height*384/704,height*768/704);
 const video=document.createElement('video');video.muted=true;video.loop=true;video.playsInline=true;video.preload='none';
 const texture=new THREE.VideoTexture(video);texture.colorSpace=THREE.SRGBColorSpace;
 const sample=document.createElement('canvas');sample.width=192;sample.height=384;
 const ctx=sample.getContext('2d',{willReadFrequently:true});
 texture.userData.sampleAlpha=uv=>{
  if(video.readyState<2)return false;
  ctx.drawImage(video,0,0,sample.width,sample.height);
  const x=Math.min(sample.width-1,Math.max(0,Math.floor(uv.x*sample.width)));
  const y=Math.min(sample.height-1,Math.max(0,Math.floor((1-uv.y)*sample.height)));
  const [r,g,b]=ctx.getImageData(x,y,1,1).data;
  return Math.min(r,b)-g<100;
 };
 const compile=material.onBeforeCompile;
 material.onBeforeCompile=shader=>{
  compile(shader);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
   #ifdef USE_MAP
    vec4 sampledDiffuseColor=texture2D(map,vMapUv);
    #ifdef DECODE_VIDEO_TEXTURE
     float spill=min(sampledDiffuseColor.r,sampledDiffuseColor.b)-sampledDiffuseColor.g;
     float keyAlpha=1.0-smoothstep(.14,.48,spill);
     sampledDiffuseColor.a*=keyAlpha;
     if(keyAlpha<1.0){
      sampledDiffuseColor.r=min(sampledDiffuseColor.r,sampledDiffuseColor.g+.14);
      sampledDiffuseColor.b=min(sampledDiffuseColor.b,sampledDiffuseColor.g+.14);
     }
     sampledDiffuseColor=sRGBTransferEOTF(sampledDiffuseColor);
    #endif
    diffuseColor*=sampledDiffuseColor;
   #endif
  `);
 };
 let loaded=false,failed=false,playPending=false,disposed=false,shouldPlay=false;
 const state={active:false,update};
 function pause(){video.pause();}
 function fail(){failed=true;pause();}
 video.addEventListener('error',fail);
 const visibility=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',visibility);
 function update(moving,enabled){
  if(disposed)return;
  const play=moving&&enabled&&!document.hidden&&!failed;shouldPlay=play;
  if(play&&!loaded){loaded=true;video.src=src;video.load();}
  if(play&&video.paused&&!playPending){
   playPending=true;
   video.play().catch(fail).finally(()=>{playPending=false;if(disposed||!shouldPlay||document.hidden)pause();});
  }else if(!play)pause();
  const active=enabled&&!failed&&video.readyState>=2;
  if(active!==state.active){
   state.active=active;material.map=active?texture:poster;
   body.geometry=active?movieGeometry:stillGeometry;material.needsUpdate=true;
  }
 }
 material.addEventListener('dispose',()=>{
  disposed=true;pause();video.removeEventListener('error',fail);document.removeEventListener('visibilitychange',visibility);
  video.removeAttribute('src');video.load();texture.dispose();poster.dispose();stillGeometry.dispose();movieGeometry.dispose();
 });
 return state;
}
