export class Sound {
  constructor(){this.ctx=null;this.master=null;this.volume=.5;this.voices=false;this.ambience=[];}
  start(){
    if(this.ctx){this.ctx.resume();return;}
    this.ctx=new (window.AudioContext||window.webkitAudioContext)();
    this.master=this.ctx.createGain();this.master.gain.value=this.volume;this.master.connect(this.ctx.destination);
    const n=this.noise(4); const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1000;
    const g=this.ctx.createGain();g.gain.value=.075;n.loop=true;n.connect(filter);filter.connect(g);g.connect(this.master);n.start();
    const hum=this.ctx.createOscillator();hum.frequency.value=60;const hg=this.ctx.createGain();hg.gain.value=.022;hum.connect(hg);hg.connect(this.master);hum.start();
  }
  setVolume(v){this.volume=v;if(this.master)this.master.gain.setTargetAtTime(v,this.ctx.currentTime,.05);}
  noise(duration){const b=this.ctx.createBuffer(1,this.ctx.sampleRate*duration,this.ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const s=this.ctx.createBufferSource();s.buffer=b;return s;}
  tone(freq,duration,volume=.1,type='sine',delay=0){if(!this.ctx)return;const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration);}
  burst(duration,volume,cutoff=1500){if(!this.ctx)return;const s=this.noise(duration),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain(),t=this.ctx.currentTime;f.type='lowpass';f.frequency.value=cutoff;g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);s.connect(f);f.connect(g);g.connect(this.master);s.start();}
  knock(){for(let i=0;i<3;i++)this.tone(105,.17,.45,'triangle',i*.23);}
  shot(){this.burst(.85,.9,5600);this.tone(58,.5,.55,'sawtooth');this.tone(1500,.045,.2,'square');}
  scan(){this.tone(920,.15,.07);this.tone(1480,.25,.06,'sine',.18);}
  click(){this.tone(440,.07,.035,'triangle');}
  step(){this.burst(.1,.06,400);}
  bell(){[523,659,784].forEach((f,i)=>{this.tone(f,2,.12,'sine',i*.32);this.tone(f*2.01,1,.03,'sine',i*.32);});}
  dread(){this.tone(41,3,.17,'sawtooth');this.tone(43,3,.08);}
  speak(text){if(!this.voices||!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-SG';u.rate=.88;u.pitch=.82;u.volume=this.volume;window.speechSynthesis.speak(u);}
  hush(){window.speechSynthesis?.cancel();}
}
