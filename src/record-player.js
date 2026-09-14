export class RecordPlayer{
 constructor(sound,{onChange=()=>{},onMessage=()=>{},audio=new Audio(),load=async()=>{const r=await fetch('/api/music');if(!r.ok)return [];const data=await r.json();return Array.isArray(data)?data:[];}}={}){
  Object.assign(this,{sound,onChange,onMessage,audio,load,enabled:false,suspended:false,tracks:[],index:0,version:0});audio.preload='none';this.setVolume(sound.volume??.65);
  for(const event of ['playing','pause','waiting','ended'])audio.addEventListener(event,()=>this.changed());
  audio.addEventListener('ended',()=>{if(this.enabled&&!this.suspended)this.playTrack((this.index+1)%this.tracks.length);});
  audio.addEventListener('error',()=>{if(this.enabled){this.stop();this.onMessage('This track could not play. You can try the turntable again.');}});
 }
 get spinning(){return this.enabled&&!this.suspended&&(this.tracks.length?!this.audio.paused&&!this.audio.ended&&this.audio.readyState>=3:this.sound.music);}
 changed(){this.onChange(this.spinning);}
 async toggle(){if(this.enabled){this.stop();this.onMessage('The record comes to rest.');return;}await this.start();}
 async start(){const version=++this.version;this.enabled=true;this.suspended=false;this.loading=true;this.trackLoaded=false;this.sound.music=false;await this.sound.start();const tracks=await this.load().catch(()=>[]);if(version!==this.version)return;this.loading=false;this.tracks=tracks;if(this.suspended)return;
  if(this.tracks.length)await this.playTrack(0);else{this.sound.music=true;this.changed();this.onMessage('A gentle house melody fills the room.');}
 }
 async playTrack(index){if(!this.enabled||this.suspended||!this.tracks.length)return;const version=this.version;this.index=index;this.audio.src=this.tracks[index].src;this.trackLoaded=true;
  try{await this.audio.play();if(version!==this.version||!this.enabled||this.suspended){this.audio.pause();return;}this.changed();this.onMessage(`On the turntable: ${this.tracks[index].title}`);}catch{if(version===this.version&&!this.suspended){this.stop();this.onMessage('Music could not start. Try the turntable again.');}}
 }
 stop(){this.version++;this.enabled=false;this.sound.music=false;this.audio.pause();this.changed();}
 suspend(){this.suspended=true;this.sound.music=false;this.audio.pause();this.changed();}
 resume(){if(!this.suspended)return;this.suspended=false;if(!this.enabled||this.loading)return;if(this.tracks.length){if(!this.trackLoaded)this.playTrack(0);else this.audio.play().then(()=>this.changed()).catch(()=>this.stop());}else{this.sound.music=true;this.changed();}}
 setVolume(v){this.audio.volume=Math.max(0,Math.min(1,v*.65));}
}
