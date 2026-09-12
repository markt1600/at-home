// Gentle environmental sound and original synthesized music; spoken words use
// the server voice endpoint exclusively. Audio starts on a player gesture.
export class HomeSound {
 constructor(){this.volume=.65;this.music=false;this.elapsed=0;this.nextBird=4;this.nextNote=0;}
 async start(){
  if(this.ctx){await this.ctx.resume();return;}
  this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=this.volume;this.master.connect(this.ctx.destination);
  const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate*6,this.ctx.sampleRate),samples=buffer.getChannelData(0);let last=0;
  for(let i=0;i<samples.length;i++){last=(last+(Math.random()*2-1)*.02)/1.02;samples[i]=last*3;}
  const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=700;this.breeze=this.ctx.createGain();this.breeze.gain.value=.12;source.connect(filter);filter.connect(this.breeze);this.breeze.connect(this.master);source.start();await this.ctx.resume();
 }
 setVolume(v){this.volume=v;this.master?.gain.setTargetAtTime(v,this.ctx.currentTime,.15);}
 tone(frequency,duration=.3,volume=.08,delay=0,end=frequency){if(!this.ctx)return;const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(end,t+duration);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.025);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();};}
 chime(){this.tone(659,.7,.09);this.tone(523,.9,.07,.28);}
 care(){this.tone(523,.35,.04);this.tone(784,.5,.035,.12);}
 step(){this.tone(90,.07,.018,0,58);}
 update(dt,hours,balcony=false){if(!this.ctx||this.volume<=0)return;this.elapsed+=dt;const h=hours%24,day=h>=6&&h<19;this.breeze.gain.setTargetAtTime(balcony?.18:.07,this.ctx.currentTime,.8);
  if(day&&this.elapsed>this.nextBird){this.nextBird=this.elapsed+12+Math.random()*16;const f=1800+Math.random()*600,v=balcony?.018:.005;this.tone(f,.15,v,0,f*1.4);this.tone(f*1.2,.17,v,.24,f*.9);}
  if(this.music&&this.elapsed>this.nextNote){this.nextNote=this.elapsed+1.25;const notes=[261.63,329.63,392,493.88,523.25,659.25];this.tone(notes[Math.floor(Math.random()*notes.length)],2,.026);}
 }
}
