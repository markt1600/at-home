import * as THREE from 'three';
import {petDirection} from './pet-direction.js';

// Each action shares a reference animal. Foot calibration anchors paws to treads.
export function createActor(id,height,f,motionFraming={}){
 const g=new THREE.Group();g.name=id;
 const asset=f.asset||id,actionAsset=id==='sunny'?'leo':id;
 const poster=new THREE.TextureLoader().load(`/art/friends/${asset}.webp`);poster.colorSpace=THREE.SRGBColorSpace;
 const mat=new THREE.MeshBasicMaterial({map:poster,transparent:true,alphaTest:.08,depthWrite:false,side:THREE.DoubleSide});
 mat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
 vec4 sampledDiffuseColor=texture2D(map,vMapUv);
 float spill=min(sampledDiffuseColor.r,sampledDiffuseColor.b)-sampledDiffuseColor.g;
 float alpha=1.-smoothstep(.08,.35,spill);sampledDiffuseColor.a*=alpha;
 if(alpha<1.){sampledDiffuseColor.r=min(sampledDiffuseColor.r,sampledDiffuseColor.g+.05);sampledDiffuseColor.b=min(sampledDiffuseColor.b,sampledDiffuseColor.g+.05);}
 #ifdef DECODE_VIDEO_TEXTURE
 sampledDiffuseColor=sRGBTransferEOTF(sampledDiffuseColor);
 #endif
 diffuseColor*=sampledDiffuseColor;
 #endif`);};
 const geometry=new THREE.PlaneGeometry(height*f.width/f.bodyHeight,height*f.height/f.bodyHeight);
 const body=new THREE.Mesh(geometry,mat);g.add(body);
 const contact=new THREE.Mesh(new THREE.CircleGeometry(height*.33,32),new THREE.MeshBasicMaterial({color:0x354439,transparent:true,opacity:.14,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.scale.y=.48;contact.position.y=.002;g.add(contact);
 const films=new Map();let current='idle',gait=0,flip=1,view='front';
 for(const mode of ['idle','walk','walk-front','walk-back',...(id==='pebble'?[]:['sleep'])]){
  const name=mode==='idle'?asset:`${actionAsset}-${mode}`,video=document.createElement('video');
  video.loop=mode!=='sleep';video.muted=true;video.playsInline=true;video.preload='auto';
  const film={video,name,loaded:false,pending:false,failed:false,retryAt:0,texture:null};films.set(mode,film);
  video.addEventListener('error',()=>{film.failed=true;film.retryAt=gait+15;});
 }
 g.userData.canWalk=()=>['walk','walk-front','walk-back'].every(mode=>films.get(mode).video.readyState>=2&&!films.get(mode).failed);
 g.userData.films=films;
 g.userData.update=(dt,enabled,near)=>{
  gait+=dt;const play=dt>0&&enabled&&near&&!document.hidden;
  if(near&&enabled)for(const film of films.values())if(!film.loaded||film.failed&&gait>=film.retryAt){film.loaded=true;film.failed=false;film.video.src=`/art/motion/${film.name}.mp4`;film.video.load();}
  const walking=g.userData.activity==='walk',sleeping=g.userData.activity==='sleep'&&films.has('sleep');
  const direction=petDirection(g.userData.vx||0,g.userData.vz||0,g.userData.cameraX||0,g.userData.cameraZ||0,view);view=direction.view;
  const wanted=sleeping?'sleep':view==='side'?(walking?'walk':'idle'):`walk-${view}`;
  if(wanted!==current&&films.get(wanted).video.readyState>=2){films.get(current).video.pause();current=wanted;if(current==='sleep')films.get(current).video.currentTime=0;}
  const film=films.get(current),video=film.video;
  for(const other of films.values())if(other!==film)other.video.pause();
  if(view==='side'&&direction.side){const original=id==='sunny'?1:-1;flip=Math.sign(direction.side)*original;}else if(view!=='side')flip=1;
  const walkingFilm=current.startsWith('walk'),animateFilm=play&&(!walkingFilm||walking);
  video.playbackRate=walkingFilm?THREE.MathUtils.clamp((g.userData.speed||.1)/(id==='pebble'?.075:id==='sunny'?.42:.34),.65,1.5):1;
  if(animateFilm&&!film.failed&&video.paused&&!video.ended&&!film.pending){film.pending=true;video.play().catch(()=>{}).finally(()=>film.pending=false);}else if(!animateFilm)video.pause();
  g.userData.view=view;g.userData.currentFilm=current;
  if(!film.failed&&video.readyState>=2){film.texture??=new THREE.VideoTexture(video);film.texture.colorSpace=THREE.SRGBColorSpace;if(mat.map!==film.texture){mat.map=film.texture;mat.needsUpdate=true;}}
  const calibration=motionFraming[film.name],index=calibration?Math.min(calibration.bottoms.length-1,Math.floor(video.currentTime*calibration.fps)):0;
  const bottom=mat.map===film.texture&&calibration?Math.min(calibration.bottoms[index],calibration.bottoms[Math.min(index+1,calibration.bottoms.length-1)]):f.bottom;
  const frameHeight=mat.map===film.texture&&calibration?calibration.bodyHeight:f.bodyHeight,scale=f.bodyHeight/frameHeight;
  body.position.y=height*(f.height/2-bottom)/frameHeight;body.scale.x=flip*scale;
  body.rotation.z=play&&walking?Math.sin(gait*(id==='pebble'?2:6))*(id==='pebble'?.012:.006):0;
  body.scale.y=scale*(current==='sleep'&&video.ended?1+Math.sin(gait*1.5)*.004:1);
  contact.material.opacity=g.userData.hopping?.07:.14;
 };
 g.userData.dispose=()=>{for(const film of films.values()){film.video.pause();film.video.removeAttribute('src');film.video.load();film.texture?.dispose();}poster.dispose();geometry.dispose();mat.dispose();contact.geometry.dispose();contact.material.dispose();};
 return g;
}
