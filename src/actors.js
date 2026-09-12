import * as THREE from 'three';
// The still and MiniMax film use identical framing and ground contact.
export function createActor(id,height,f){
 const g=new THREE.Group();g.name=id;
 const poster=new THREE.TextureLoader().load(`/art/friends/${id}.webp`);poster.colorSpace=THREE.SRGBColorSpace;
 const mat=new THREE.MeshBasicMaterial({map:poster,transparent:true,alphaTest:.08,side:THREE.DoubleSide});
 mat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
 vec4 sampledDiffuseColor=texture2D(map,vMapUv);
 float spill=min(sampledDiffuseColor.r,sampledDiffuseColor.b)-sampledDiffuseColor.g;
 float alpha=1.-smoothstep(.14,.48,spill);sampledDiffuseColor.a*=alpha;
 if(alpha<1.){sampledDiffuseColor.r=min(sampledDiffuseColor.r,sampledDiffuseColor.g+.14);sampledDiffuseColor.b=min(sampledDiffuseColor.b,sampledDiffuseColor.g+.14);}
 #ifdef DECODE_VIDEO_TEXTURE
 sampledDiffuseColor=sRGBTransferEOTF(sampledDiffuseColor);
 #endif
 diffuseColor*=sampledDiffuseColor;
 #endif`);};
 const body=new THREE.Mesh(new THREE.PlaneGeometry(height*f.width/f.bodyHeight,height*f.height/f.bodyHeight),mat);body.position.y=height*(f.height/2-f.bottom)/f.bodyHeight;g.add(body);
 const contact=new THREE.Mesh(new THREE.CircleGeometry(height*.33,32),new THREE.MeshBasicMaterial({color:0x354439,transparent:true,opacity:.14,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.scale.y=.48;contact.position.y=.006;g.add(contact);
 const video=document.createElement('video');video.loop=true;video.muted=true;video.playsInline=true;video.preload='none';let texture=null,loaded=false,pending=false,failed=false,hasFrame=false;
 video.addEventListener('error',()=>{failed=true;mat.map=poster;mat.needsUpdate=true;});
 g.userData.update=(dt,enabled,near)=>{const play=dt>0&&enabled&&near&&!document.hidden&&!failed;
  if(play&&!loaded){loaded=true;video.src=`/art/motion/${id}.mp4`;video.load();video.requestVideoFrameCallback?.(()=>hasFrame=true);}
  if(play&&video.paused&&!pending){pending=true;video.play().catch(()=>{failed=true;}).finally(()=>pending=false);}else if(!play)video.pause();
  if(enabled&&!failed&&(hasFrame||!video.requestVideoFrameCallback&&video.currentTime>0)&&video.readyState>=2){texture??=new THREE.VideoTexture(video);texture.colorSpace=THREE.SRGBColorSpace;if(mat.map!==texture){mat.map=texture;mat.needsUpdate=true;}}
  else if(mat.map!==poster){mat.map=poster;mat.needsUpdate=true;}
 };
 g.userData.dispose=()=>{video.pause();video.removeAttribute('src');video.load();texture?.dispose();poster.dispose();g.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});};return g;
}
