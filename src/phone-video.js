// Loaded only in the upload page when a video is selected; never by the game.
export const MAX_PREPARED_VIDEO_BYTES=250*1024*1024;
export function videoDimensions(width,height){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<2||height<2)throw Error('This video has invalid dimensions.');
 const scale=Math.min(1,1280/Math.max(width,height),720/Math.min(width,height));
 return {width:Math.max(2,Math.floor(width*scale/2)*2),height:Math.max(2,Math.floor(height*scale/2)*2)};
}
export async function preparePhoneVideo(file,{signal,onProgress=()=>{},load=()=>import('mediabunny')}={}){
 const {Input,BlobSource,ALL_FORMATS,Output,Mp4OutputFormat,StreamTarget,Conversion,Quality,canEncodeVideo}=await load();
 signal?.throwIfAborted();onProgress({text:'Reading video…',percentage:0});
 const input=new Input({source:new BlobSource(file),formats:ALL_FORMATS});let conversion,output;
 const abort=()=>{conversion?.cancel().catch(()=>{});};signal?.addEventListener('abort',abort,{once:true});
 try{
  const track=await input.getPrimaryVideoTrack();if(!track)throw Error('No video track was found in this file.');
  const width=await track.getDisplayWidth(),height=await track.getDisplayHeight(),size=videoDimensions(width,height);
  const duration=await input.computeDuration();if(!Number.isFinite(duration)||duration<=0)throw Error('Could not read this video’s length.');
  if(duration>20*60)throw Error('Choose a clip up to 20 minutes. Shorten this video in Photos first.');
  const codec=await track.getCodec(),audio=await input.getPrimaryAudioTrack(),audioCodec=audio?await audio.getCodec():null;
  const encode=await canEncodeVideo('avc',{...size,frameRate:30});
  // Older Safari can still repackage existing H.264/AAC without a video encoder.
  // Never silently upload HEVC or drop a soundtrack when conversion is unavailable.
  const copy=!encode&&codec==='avc'&&(!audio||audioCodec==='aac');
  if(!encode&&!copy)throw Error('This browser cannot convert this video. Open this page in an updated Safari on your iPhone, or export an H.264 MP4 and try again.');
  let length=0;const chunks=[];
  const target=new StreamTarget(new WritableStream({write({data,position}){
   signal?.throwIfAborted();
   if(position!==length)throw Error('Could not prepare this video for streaming.');
   length+=data.byteLength;if(length>MAX_PREPARED_VIDEO_BYTES)throw Error('The prepared video is over 250 MB. Shorten the clip in Photos and retry.');
   chunks.push(new Blob([data]));
  }}),{chunked:true,chunkSize:1024*1024});
  // Fragmented MP4 writes metadata first and flushes bounded chunks, avoiding a
  // second full-size ArrayBuffer on memory-constrained phones.
  output=new Output({format:new Mp4OutputFormat({fastStart:'fragmented',minimumFragmentDuration:2}),target});
  signal?.throwIfAborted();
  conversion=await Conversion.init({input,output,tracks:'primary',tags:{},showWarnings:false,
   video:copy?{codec:'avc'}:{codec:'avc',...size,fit:'contain',frameRate:30,quality:new Quality({bitrate:1_500_000}),keyFrameInterval:2,forceTranscode:true,allowTransformationMetadata:false},
   audio:audioCodec==='aac'?{codec:'aac'}:{codec:'aac',quality:new Quality({bitrate:128_000}),numberOfChannels:2,sampleRate:48000},
  });
  if(!conversion.isValid||conversion.discardedTracks.some(t=>t.track===track||t.track===audio))throw Error('This browser cannot convert every track in this video. Try an updated Safari or an H.264 MP4 copy. Your original file is unchanged.');
  conversion.onProgress=p=>onProgress({text:copy?'Preparing MP4 for playback…':'Converting video to a smaller MP4…',percentage:Math.min(99,Math.round(p*100))});
  signal?.throwIfAborted();await conversion.execute();signal?.throwIfAborted();
  const ready=new File(chunks,file.name.replace(/\.[^.]+$/,'')+'.mp4',{type:'video/mp4',lastModified:file.lastModified});
  if(!ready.size)throw Error('The video could not be prepared.');
  return {file:ready,note:copy?'MP4 · original resolution (compression unavailable on this browser)':`MP4 · ${size.width} × ${size.height}${audio?' · sound preserved':''}`};
 }finally{
  signal?.removeEventListener('abort',abort);await conversion?.cancel().catch(()=>{});input.dispose();
  if(output?.state==='pending')await output.cancel().catch(()=>{});
 }
}
