// A reflection is a scare, never evidence of a character's hidden identity.
export const REFLECTION_TIMING=Object.freeze({duration:5.3,limit:Infinity,cooldown:12,variation:10,initialDelay:4});
export class MirrorHaunting {
 constructor(random=Math.random,{duration=2.2,limit=4,cooldown=65,variation=40,initialDelay=12}={}){this.random=random;this.duration=duration;this.limit=limit;this.interval=cooldown;this.variation=variation;this.initialDelay=initialDelay;this.reset();}
 reset(){this.cooldown=this.initialDelay;this.remaining=0;this.count=0;this.wasNear=false;}
 tick(dt,{active,near,moving=false}){
  if(!active)return null;
  if(this.remaining>0){this.remaining=Math.max(0,this.remaining-dt);if(!this.remaining)return {type:'hide'};return null;}
  this.cooldown=Math.max(0,this.cooldown-dt);
  const entered=near&&!this.wasNear;this.wasNear=near;
  // Walking past glass can trigger after a cooldown even when the player
  // entered its vicinity earlier. Standing still never queues repeat scares.
  if(!near||(!entered&&!moving)||this.cooldown>0||this.count>=this.limit)return null;
  this.count++;this.remaining=this.duration;this.cooldown=this.interval+this.random()*this.variation;
  return {type:'show',portrait:Math.floor(this.random()*12)};
 }
}
