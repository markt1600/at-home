// Adjust only the WebGL drawing buffer. CSS dimensions, aiming coordinates,
// menus and touch controls retain their full viewport resolution.
export class AdaptiveResolution{
 constructor(maxRatio){this.max=maxRatio;this.min=Math.min(maxRatio,Math.max(.8,maxRatio*.65));this.ratio=maxRatio;this.reset();}
 reset(){this.seconds=0;this.frames=0;this.goodWindows=0;this.settle=3;}
 update(dt,active=true){
  if(!active||!Number.isFinite(dt)||dt<=0||dt>.25){this.reset();return;}
  if(this.settle>0){this.settle-=dt;return;}
  this.seconds+=dt;this.frames++;
  if(this.seconds<2)return;
  const average=this.seconds/this.frames;this.seconds=0;this.frames=0;
  let next=this.ratio;
  if(average>1/44){this.goodWindows=0;next=Math.max(this.min,this.ratio*.90);}
  else if(average<1/57){if(++this.goodWindows>=4){next=Math.min(this.max,this.ratio+.08);this.goodWindows=0;}}
  else this.goodWindows=0;
  next=Math.round(next*1000)/1000;
  if(Math.abs(next-this.ratio)<.005)return;
  this.ratio=next;this.settle=2;return next;
 }
}
