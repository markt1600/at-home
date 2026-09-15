// Preload while the hands prepare the record, keeping music silent until the
// needle is down. A stopped attempt cannot resume after a slow download.
export function waitForMusicBuffer(audio,signal){
 return new Promise((resolve,reject)=>{
  let poll;
  const events=['progress','canplay','canplaythrough','loadeddata','durationchange'];
  const clean=()=>{clearInterval(poll);events.forEach(e=>audio.removeEventListener(e,check));audio.removeEventListener('error',fail);signal?.removeEventListener('abort',cancel);};
  const cancel=()=>{clean();resolve(false);};
  const fail=()=>{clean();reject(new Error('Track could not load'));};
  const check=()=>{
   if(signal?.aborted){cancel();return;}
   const time=audio.currentTime||0,needed=Math.min(5,Number.isFinite(audio.duration)?Math.max(0,audio.duration-time):5);
   let ahead=0;for(let i=0;i<(audio.buffered?.length||0);i++)if(audio.buffered.start(i)<=time+.05)ahead=Math.max(ahead,audio.buffered.end(i)-time);
   // HAVE_ENOUGH_DATA also covers browsers that finish preloading without
   // reporting a continuous range until playback begins.
   if(audio.readyState>=3&&(ahead>=needed||audio.readyState>=4)){clean();resolve(true);}
  };
  events.forEach(e=>audio.addEventListener(e,check));audio.addEventListener('error',fail);signal?.addEventListener('abort',cancel,{once:true});poll=setInterval(check,250);check();
 });
}

export class RecordPlayer{
 constructor(sound,{onChange=()=>{},onMessage=()=>{},onStart=()=>{},beforePlay=async()=>true,onStop=()=>{},audio=new Audio(),random=Math.random,load=async()=>{const r=await fetch('/api/music');if(!r.ok)return [];const data=await r.json();return Array.isArray(data)?data:[];}}={}){
  Object.assign(this,{sound,onChange,onMessage,onStart,beforePlay,onStop,audio,random,load,enabled:false,suspended:false,tracks:[],index:0,version:0});audio.preload='auto';this.setVolume(sound.volume??.65);
  for(const event of ['playing','pause','waiting','ended'])audio.addEventListener(event,()=>this.changed());
  audio.addEventListener('ended',()=>{if(this.enabled&&!this.suspended&&!this.loading&&this.tracks.length){let next=this.index+1;if(next===this.tracks.length){this.tracks=this.shuffle(this.tracks);next=0;}this.playTrack(next);}});
  audio.addEventListener('error',()=>{if(this.enabled){this.stop();this.onMessage('This track could not play. You can try the turntable again.');}});
 }
 get spinning(){return this.enabled&&!this.suspended&&!this.loading&&(this.tracks.length?!this.audio.paused&&!this.audio.ended&&this.audio.readyState>=3:this.sound.music);}
 changed(){this.onChange(this.spinning);}
 shuffle(tracks){
  // Every song gets a turn before a fresh shuffle. Avoid an immediate repeat
  // across a playlist boundary or a new start when another song is available.
  const shuffled=[...tracks];
  for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  if(shuffled.length>1&&shuffled[0].src===this.lastPlayedSrc){const j=1+Math.floor(this.random()*(shuffled.length-1));[shuffled[0],shuffled[j]]=[shuffled[j],shuffled[0]];}
  return shuffled;
 }
 async toggle(){if(this.enabled){this.stop();this.onMessage('The needle lifts and the record comes to rest.');return;}await this.start();}
 async start(){
  const version=++this.version;this.abort?.abort();this.abort=new AbortController();
  this.enabled=true;this.suspended=false;this.loading=true;this.trackLoaded=false;this.sound.music=false;if(this.onStart()===false){this.enabled=false;this.loading=false;this.changed();return;}this.changed();
  try{
   // Both requests begin during the gesture, before any animation wait.
   const tracksPromise=this.load().catch(()=>[]);await this.sound.start();const tracks=await tracksPromise;
   if(version!==this.version)return;this.tracks=this.shuffle(tracks);
   if(tracks.length&&!await this.loadTrack(0))return;
   if(version!==this.version||!this.enabled)return;
   if(await this.beforePlay()===false||version!==this.version||!this.enabled)return;
   this.loading=false;if(!this.suspended)await this.playLoaded();
  }catch{if(version===this.version){this.stop();this.onMessage('Music could not start. Try the turntable again.');}}
 }
 async loadTrack(index){
  const version=this.version;this.index=index;this.audio.src=this.tracks[index].src;this.trackLoaded=true;this.audio.load?.();
  const buffered=await waitForMusicBuffer(this.audio,this.abort.signal);return buffered&&version===this.version&&this.enabled;
 }
 async playLoaded(){
  if(!this.enabled||this.suspended||this.loading)return;const version=this.version;
  if(!this.tracks.length){this.sound.music=true;this.changed();this.onMessage('A gentle house melody fills the room.');return;}
  try{
   await this.audio.play();if(version!==this.version)return;if(this.suspended||!this.enabled){this.audio.pause();return;}
   this.lastPlayedSrc=this.tracks[this.index].src;this.changed();this.onMessage(`On the turntable: ${this.tracks[this.index].title}`);
  }catch{if(version===this.version&&!this.suspended){this.stop();this.onMessage('Music could not start. Try the turntable again.');}}
 }
 async playTrack(index){
  if(!this.enabled||this.suspended||!this.tracks.length)return;const version=this.version;this.loading=true;
  try{if(!await this.loadTrack(index))return;this.loading=false;await this.playLoaded();}
  catch{if(version===this.version){this.stop();this.onMessage('This track could not play. You can try the turntable again.');}}
 }
 stop(){this.version++;this.abort?.abort();this.enabled=false;this.loading=false;this.sound.music=false;this.onStop();this.audio.pause();this.changed();}
 suspend(){this.suspended=true;this.sound.music=false;this.audio.pause();this.changed();}
 resume(){if(!this.suspended)return;this.suspended=false;if(!this.enabled||this.loading)return;this.playLoaded();}
 setVolume(v){this.audio.volume=Math.max(0,Math.min(1,v*.65));}
}
