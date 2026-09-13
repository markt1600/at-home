// Small range requests can be retried without restarting an entire large video.
export async function downloadVideo(url,{signal,onProgress=()=>{},fetcher=fetch,chunkSize=4*1024*1024,maxBytes=Infinity}={}){
 let offset=0,total=null,type='video/mp4';const parts=[];
 while(total===null||offset<total){
  signal?.throwIfAborted();let result;
  for(let attempt=0;attempt<3;attempt++){
   try{
    const end=total===null?chunkSize-1:Math.min(offset+chunkSize,total)-1;
    const response=await fetcher(url,{signal,headers:{Range:`bytes=${offset}-${end}`}});
    if(!response.ok)throw new Error(`Video download returned ${response.status}`);
    const range=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('content-range')||'');
    if(response.status===206&&(!range||Number(range[1])!==offset))throw new Error('Unexpected video range');
    const expected=range?Number(range[2])-Number(range[1])+1:Number(response.headers.get('content-length'))||null;
    const size=range?Number(range[3]):expected;
    if(size>maxBytes){await response.body.cancel();throw new Error('Full download needs confirmation');}
    const chunks=[];let received=0;const reader=response.body.getReader();
    try{while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);received+=value.byteLength;if(offset+received>maxBytes){await reader.cancel();throw new Error('Full download needs confirmation');}onProgress(response.status===206?offset+received:received,size);}}
    finally{reader.releaseLock();}
    if(expected!==null&&received!==expected)throw new Error('Video download ended early');
    if(!received)throw new Error('Empty video download');
    result={blob:new Blob(chunks),range,size,received,type:response.headers.get('content-type')||type};break;
   }catch(error){if(signal?.aborted||attempt===2||error.message==='Full download needs confirmation')throw error;}
  }
  type=result.type;
  if(!result.range)return new Blob([result.blob],{type}); // Server sent the complete file.
  if(total!==null&&result.size!==total)throw new Error('Video changed during download. Please retry.');
  total=result.size;parts.push(result.blob);offset+=result.received;
 }
 return new Blob(parts,{type});
}
