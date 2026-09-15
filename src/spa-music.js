// An original, quiet pad-and-bell piece, generated locally with no download.
export class SpaMusic{
 constructor(sound){this.sound=sound;this.nodes=[];this.version=0;}
 async prepare(){await this.sound.start();}
 async play(){
  const version=++this.version;await this.prepare().catch(()=>{});if(version!==this.version||!this.sound.ctx)return;
  const ctx=this.sound.ctx,bus=ctx.createGain();this.bus=bus;bus.gain.value=.65;bus.connect(this.sound.master);const start=ctx.currentTime;
  const note=(hz,at,length,volume)=>{
   const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=hz;
   g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(volume,at+1.1);g.gain.exponentialRampToValueAtTime(.0001,at+length);
   o.connect(g);g.connect(bus);o.start(at);o.stop(at+length+.02);this.nodes.push(o);o.onended=()=>{o.disconnect();g.disconnect();};
  };
  const chords=[[130.813,164.814,195.998,246.942],[110,130.813,164.814,195.998],[87.307,130.813,164.814,220],[97.999,146.832,195.998,246.942]];
  chords.forEach((chord,i)=>{chord.forEach(f=>{note(f,start+i*7.5,9,.029);note(f*2,start+i*7.5,9,.006);});note(chord[2]*4,start+i*7.5+2.1,4.2,.012);note(chord[1]*4,start+i*7.5+5,3.8,.008);});
 }
 stop(){
  this.version++;const ctx=this.sound.ctx,bus=this.bus,nodes=this.nodes;this.bus=null;this.nodes=[];if(!ctx||!bus)return;
  const end=ctx.currentTime+.45;bus.gain.cancelScheduledValues(ctx.currentTime);bus.gain.setTargetAtTime(0,ctx.currentTime,.10);
  for(const node of nodes){try{node.stop(end);}catch{}}
  setTimeout(()=>bus.disconnect(),600);
 }
}
