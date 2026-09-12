// A reflection is a scare, never evidence of a character's hidden identity.
export class MirrorHaunting {
 constructor(random=Math.random){this.random=random;this.reset();}
 reset(){this.cooldown=12;this.remaining=0;this.count=0;this.wasNear=false;}
 tick(dt,{active,near}){
  if(!active)return null;
  if(this.remaining>0){this.remaining=Math.max(0,this.remaining-dt);if(!this.remaining)return {type:'hide'};return null;}
  this.cooldown=Math.max(0,this.cooldown-dt);
  const entered=near&&!this.wasNear;this.wasNear=near;
  if(!entered||this.cooldown>0||this.count>=4)return null;
  this.count++;this.remaining=2.2;this.cooldown=65+this.random()*40;
  return {type:'show',portrait:Math.floor(this.random()*12)};
 }
}
