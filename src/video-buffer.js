// Buffer seconds of playable media, rather than guessing from downloaded bytes.
export function bufferedAhead(video){
 const t=video.currentTime||0;
 for(let i=0;i<video.buffered.length;i++)if(video.buffered.start(i)<=t+.08&&video.buffered.end(i)>t)return video.buffered.end(i)-t;
 return 0;
}
export function manageVideoBuffer(video,{slow=false,onStatus=()=>{},onBlocked=()=>{}}={}){
 let target=slow?15:6,waiting=true,wanted=false,disposed=false,starting=false;
 const listeners=[],listen=(name,fn)=>{video.addEventListener(name,fn);listeners.push([name,fn]);};
 function ready(){const remaining=Number.isFinite(video.duration)?Math.max(0,video.duration-video.currentTime):Infinity;return video.readyState>=2&&bufferedAhead(video)>=Math.min(target,Math.max(.01,remaining-.12));}
 function check(){
  if(disposed||!wanted)return;
  if(waiting&&!ready()){onStatus(`Loading a little ahead… ${Math.min(100,Math.round(bufferedAhead(video)/Math.min(target,video.duration||target)*100))}%`);return;}
  waiting=false;onStatus('');if(!video.paused||starting||video.ended)return;
  starting=true;Promise.resolve(video.play()).then(()=>{if(disposed||!wanted)video.pause();}).catch(()=>{if(!disposed&&wanted){wanted=false;onBlocked();}}).finally(()=>{starting=false;});
 }
 listen('waiting',()=>{if(!wanted||disposed)return;target=Math.min(24,target+6);waiting=true;video.pause();check();});
 listen('seeking',()=>{waiting=true;video.pause();check();});
 listen('error',()=>{wanted=false;});
 for(const event of ['progress','loadedmetadata','loadeddata','canplay','canplaythrough','seeked'])listen(event,check);
 // Some browsers stop preloading while paused; do not deadlock after enough
 // data for a safe start has arrived and the browser has gone idle.
 listen('suspend',()=>{if(waiting&&bufferedAhead(video)>=2){target=Math.min(target,bufferedAhead(video));check();}});
 const timer=setInterval(check,400);
 return {
  resume(){wanted=true;check();},
  pause(){wanted=false;video.pause();onStatus('');},
  bufferMore(){target=20;waiting=true;video.pause();check();},
  dispose(){disposed=true;wanted=false;clearInterval(timer);for(const [event,fn] of listeners)video.removeEventListener(event,fn);video.pause();video.removeAttribute('src');video.load();},
 };
}
