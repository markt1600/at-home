export class RenderedVoice {
 constructor(sound){this.sound=sound;this.generation=0;this.source=null;this.pending=false;this.controller=null;this.cache=new Map();this.unavailableUntil=0;}
 get speaking(){return !!this.source||this.pending;}
 stop(){++this.generation;this.controller?.abort();this.controller=null;this.pending=false;try{this.source?.stop();}catch{}this.source=null;}
 async play(request,{quiet=false,isCurrent=()=>true}={}){
  if(!this.sound.ctx||this.sound.volume<=0||Date.now()<this.unavailableUntil)return false;
  this.stop();const generation=this.generation;this.pending=true;this.controller=new AbortController();
  try{
   const key=JSON.stringify(request);let buffer=this.cache.get(key);
   if(!buffer){const res=await fetch('/api/voice',{method:'POST',headers:{'Content-Type':'application/json'},body:key,signal:this.controller.signal});if(!res.ok)throw new Error(`voice:${res.status}`);buffer=await this.sound.ctx.decodeAudioData(await res.arrayBuffer());if(this.cache.size>=64)this.cache.delete(this.cache.keys().next().value);this.cache.set(key,buffer);}
   if(generation!==this.generation||!isCurrent()||this.sound.volume<=0||document.hidden)return false;
   const source=this.sound.ctx.createBufferSource(),gain=this.sound.ctx.createGain();source.buffer=buffer;gain.gain.value=quiet?.58:.85;source.connect(gain);
   if(quiet){const panner=this.sound.ctx.createStereoPanner();panner.pan.value=Math.random()<.5?-.65:.65;gain.connect(panner);panner.connect(this.sound.master);}else gain.connect(this.sound.master);
   this.source=source;source.onended=()=>{if(this.source===source)this.source=null;gain.disconnect();};source.start();return true;
  }catch(error){if(error.name!=='AbortError'){this.unavailableUntil=Date.now()+60000;this.sound.onVoiceUnavailable?.();}return false;}
  finally{if(generation===this.generation)this.pending=false;}
 }
}
