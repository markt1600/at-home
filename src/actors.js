import * as THREE from 'three';
import {petFilmUrl,petActivityFilms,petCarryFilms} from './pet-media.js';
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
 const films=new Map();let current='idle',gait=0,flip=1,view='front',overhead=false,priming=null;
 for(const mode of ['idle','walk','walk-front','walk-back','overhead','overhead-idle',...(id==='pebble'?[]:['sleep']),...(petActivityFilms[id]||[]),...(id==='sunny'?petCarryFilms:[])]){
  const name=mode==='idle'?asset:`${actionAsset}-${mode}`,video=document.createElement('video');
  video.loop=mode!=='sleep';video.muted=true;video.playsInline=true;video.preload='metadata';
  const still=mode.includes('overhead')||mode.startsWith('carry')||petActivityFilms[id]?.includes(mode)?new THREE.TextureLoader().load(`/art/motion/compact/${name}.webp`):null;if(still)still.colorSpace=THREE.SRGBColorSpace;
  const film={video,name,loaded:false,pending:false,failed:false,retryAt:0,texture:null,poster:still};films.set(mode,film);
  video.addEventListener('error',()=>{film.failed=true;film.retryAt=gait+15;});
 }
 g.userData.canWalk=()=>true; // Movement never waits for a decoder or a network transfer.
 g.userData.films=films;
 g.userData.update=(dt,enabled,near)=>{
  gait+=dt;const play=dt>0&&enabled&&near&&!document.hidden;
  const walking=g.userData.activity==='walk',sleeping=g.userData.activity==='sleep'&&films.has('sleep'),paired=g.userData.activity==='play'&&films.has('play');
  const direction=petDirection(paired?Math.sin(g.userData.heading||0):g.userData.vx||0,paired?Math.cos(g.userData.heading||0):g.userData.vz||0,g.userData.cameraX||0,g.userData.cameraZ||0,view);view=direction.view;
  const horizontal=Math.hypot(g.userData.cameraX||0,g.userData.cameraZ||0);
  overhead=Math.atan2(g.userData.cameraY||0,horizontal)>(overhead?.78:.94);
  const activity=!walking&&petActivityFilms[id]?.includes(g.userData.activity)?g.userData.activity:null;
  const carrying=id==='sunny'&&g.userData.carryingBone;
  const wanted=carrying?(overhead?'carry-overhead':view==='side'?'carry':`carry-${view}`):paired?(overhead?'play-overhead':view==='side'?'play':`play-${view}`):activity?activity+(overhead?'-overhead':''):overhead?(walking?'overhead':'overhead-idle'):sleeping?'sleep':view==='side'?(walking?'walk':'idle'):`walk-${view}`;
  // Prime just the requested film. iOS may not decode preload=auto until play().
  const candidate=films.get(wanted);
  if(play&&(!candidate.failed||gait>=candidate.retryAt)){
   if(!candidate.loaded||candidate.failed){candidate.loaded=true;candidate.failed=false;candidate.video.src=petFilmUrl(candidate.name);candidate.video.load();}
   if(candidate.video.readyState<2&&!candidate.pending){candidate.pending=true;priming=candidate;candidate.video.play().catch(()=>{}).finally(()=>{candidate.pending=false;if(priming===candidate)priming=null;});}
  }
  if(wanted!==current&&(candidate.video.readyState>=2||candidate.poster?.image)){films.get(current).video.pause();current=wanted;if(current==='sleep')films.get(current).video.currentTime=0;}
  const film=films.get(current),video=film.video;
  for(const other of films.values())if(other!==film&&other!==priming&&!other.video.paused)other.video.pause();
  const displayedView=current.endsWith('-front')?'front':current.endsWith('-back')?'back':'side';
  if(displayedView==='side'&&view==='side'&&direction.side){const original=id==='sunny'?1:-1;flip=Math.sign(direction.side)*original;}else if(displayedView!=='side')flip=1;
  const fromAbove=current.includes('overhead'),walkingFilm=current.startsWith('walk')||current==='overhead'||current.startsWith('carry'),activityFilm=petActivityFilms[id]?.includes(current);
  if(activityFilm&&!current.startsWith('play'))flip=1;
  body.visible=true;g.userData.volumetric=false;g.userData.overhead=fromAbove;
  g.userData.playReady=paired&&current===wanted&&!film.failed&&video.readyState>=2;
  // Both pets start together. A newly decoded viewing angle joins the same
  // point in the shared gesture instead of restarting one animal's response.
  if(paired&&current===wanted&&video.readyState>=2&&Number.isFinite(video.duration)&&video.duration>0){const t=Math.max(0,g.userData.socialTime||0)%video.duration;if(Math.abs(video.currentTime-t)>.25)video.currentTime=t;}
  const animateFilm=play&&(!walkingFilm||walking)&&(!paired||g.userData.socialTime>=0);
  video.playbackRate=walkingFilm?THREE.MathUtils.clamp((g.userData.speed||.1)/(id==='pebble'?.075:id==='sunny'?.42:.34),.65,1.5):1;
  if(animateFilm&&film.loaded&&!film.failed&&video.paused&&!video.ended&&!film.pending){film.pending=true;video.play().catch(()=>{}).finally(()=>film.pending=false);}else if(!animateFilm&&film!==priming&&!video.paused)video.pause();
  g.userData.view=displayedView;g.userData.waitingForFilm=video!==candidate.video&&candidate.video.readyState<2;g.userData.currentFilm=current;
  if(!film.failed&&video.readyState>=2){if(!film.texture){film.texture=new THREE.VideoTexture(video);film.texture.colorSpace=THREE.SRGBColorSpace;film.texture.needsUpdate=true;}if(mat.map!==film.texture){mat.map=film.texture;mat.needsUpdate=true;}}
  if(!film.texture&&film.poster?.image&&mat.map!==film.poster){mat.map=film.poster;mat.needsUpdate=true;}
  const calibration=motionFraming[film.name],index=calibration?Math.min(calibration.bottoms.length-1,Math.floor(video.currentTime*calibration.fps)):0;
  const calibrated=calibration&&(mat.map===film.texture||mat.map===film.poster);
  const bottom=calibrated?Math.min(calibration.bottoms[index],calibration.bottoms[Math.min(index+1,calibration.bottoms.length-1)]):f.bottom;
  const frameHeight=calibrated?calibration.bodyHeight:f.bodyHeight,poseScale=calibration?.poseScale||1,scale=f.bodyHeight/frameHeight*poseScale;
  if(fromAbove){
   // These are real overhead films, laid along the pet's travel direction.
   // Match the apparent size of the upright views when the camera tips down.
   const length=calibration?.physicalLength||height*(id==='sunny'?2.3:id==='miso'?2.0:2.1)*.8,occupied=calibration?.height?calibration.bodyHeight/calibration.height:.9;
   const size=length/(height*f.height/f.bodyHeight*occupied);body.scale.set(size,size,1);body.position.set(0,height*.36,0);
   const heading=(g.userData.heading||0)-g.rotation.y;
   // The sitting silhouette includes a raised head behind its centre. Shift
   // its overhead projection forward so the wall cannot cut through the ears.
   if(current==='lounge-overhead')body.position.set(Math.sin(heading)*.18,height*.36,Math.cos(heading)*.18);
   body.rotation.set(-Math.PI/2,heading,0,'YXZ');
  }else{
   body.position.set(0,height*poseScale*(f.height/2-bottom)/frameHeight,0);body.scale.set(flip*scale,scale*(current==='sleep'&&video.ended?1+Math.sin(gait*1.5)*.004:1),1);
   body.rotation.set(0,0,play&&walking?Math.sin(gait*(id==='pebble'?2:6))*(id==='pebble'?.012:.006):0,'YXZ');
  }
  contact.material.opacity=g.userData.hopping?.07:.14;
 };
 g.userData.dispose=()=>{for(const film of films.values()){film.video.pause();film.video.removeAttribute('src');film.video.load();film.texture?.dispose();film.poster?.dispose();}poster.dispose();geometry.dispose();mat.dispose();contact.geometry.dispose();contact.material.dispose();};
 return g;
}
