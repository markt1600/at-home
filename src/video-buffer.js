// Buffer seconds of playable media, rather than guessing from downloaded bytes.
export function bufferedAhead(video){
 const t=video.currentTime||0;
 for(let i=0;i<video.buffered.length;i++)if(video.buffered.start(i)<=t+.08&&video.buffered.end(i)>t)return video.buffered.end(i)-t;
 return 0;
}
export function manageVideoBuffer(video,{slow=false,onStatus=()=>{},onBlocked=()=>{},onPreloadLimited=()=>{},retryDelay=1500}={}){
 let target=slow?30:12,waiting=true,wanted=false,disposed=false,starting=false,retries=0,retryTimer=null,restoreTime=null,failed=false,limitedTimer=null,offeredDownload=false,generation=0;
 const listeners=[],listen=(name,fn)=>{video.addEventListener(name,fn);listeners.push([name,fn]);};
 function ready(){const remaining=Number.isFinite(video.duration)?Math.max(0,video.duration-video.currentTime):Infinity;return video.readyState>=2&&bufferedAhead(video)>=Math.min(target,Math.max(.01,remaining-.12));}
 function check(){
  if(disposed||!wanted||retryTimer||restoreTime!==null||failed)return;
  if(waiting&&!ready()){onStatus(`Loading a little ahead… ${Math.min(100,Math.round(bufferedAhead(video)/Math.min(target,video.duration||target)*100))}%`);return;}
  waiting=false;onStatus('');if(!video.paused||starting||video.ended)return;
  starting=true;const attempt=++generation;Promise.resolve(video.play()).then(()=>{if(attempt===generation&&(disposed||!wanted))video.pause();}).catch(error=>{if(attempt===generation&&!disposed&&wanted&&error.name==='NotAllowedError'){wanted=false;onBlocked();}}).finally(()=>{if(attempt===generation)starting=false;});
 }
 function retry(){
  if(disposed)return;clearTimeout(retryTimer);retryTimer=null;failed=false;restoreTime=video.currentTime||restoreTime||0;target=Math.min(60,target+12);waiting=true;video.pause();video.load();
 }
 listen('loadedmetadata',()=>{if(restoreTime!==null){const t=restoreTime;restoreTime=null;if(t>0)video.currentTime=Math.min(t,Number.isFinite(video.duration)?Math.max(0,video.duration-.1):t);}});
 listen('emptied',()=>{generation++;starting=false;});
 listen('waiting',()=>{if(!wanted||disposed)return;target=Math.min(60,target+12);waiting=true;video.pause();check();});
 listen('seeking',()=>{waiting=true;video.pause();check();});
 listen('error',()=>{if(disposed)return;failed=true;video.pause();const code=video.error?.code;
  if((code===1||code===2)&&wanted&&retries<3){retries++;onStatus(`Connection interrupted. Reconnecting… (${retries}/3)`);retryTimer=setTimeout(retry,retryDelay*retries);}
  else onStatus(code===3||code===4?'This video format could not be played. Try loading the full video, or use an MP4 version.':'The download was interrupted. Tap Retry, or Load video first to play after it finishes downloading.');
 });
 for(const event of ['progress','loadedmetadata','loadeddata','canplay','canplaythrough','seeked'])listen(event,check);
 // Browsers can cap paused preloading. Keep the larger target and offer an
 // explicit full download instead of silently starting with two seconds.
 listen('suspend',()=>{if(wanted&&waiting&&!ready()){
  onStatus('Buffering before playback…');clearTimeout(limitedTimer);
  limitedTimer=setTimeout(()=>{if(!disposed&&wanted&&waiting&&!ready()&&video.networkState===1&&!offeredDownload){offeredDownload=true;onPreloadLimited();}},4000);
 }});
 const timer=setInterval(check,400);
 return {
  resume(){wanted=true;if(failed&&!retryTimer)retry();check();},
  retry(){retries=0;wanted=true;retry();},
  pause(){wanted=false;generation++;starting=false;clearTimeout(retryTimer);retryTimer=null;video.pause();onStatus('');},
  bufferMore(){target=Math.min(60,target+20);waiting=true;video.pause();check();},
  dispose(){disposed=true;wanted=false;clearTimeout(limitedTimer);clearTimeout(retryTimer);clearInterval(timer);for(const [event,fn] of listeners)video.removeEventListener(event,fn);video.pause();video.removeAttribute('src');video.load();},
 };
}
