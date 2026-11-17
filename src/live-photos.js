// A Live Photo exported with its motion arrives as two files sharing a name:
// IMG_1234.HEIC and IMG_1234.MOV. Selected together, the clip becomes the
// photo's motion instead of a separate slide.
const stem=file=>String(file.name||'').replace(/\.[^.]+$/,'').toLowerCase();
const isVideo=file=>/^video\//.test(file.type||'')||/\.(mov|mp4|m4v|webm)$/i.test(file.name||'');
export const MAX_LIVE_MOTION_BYTES=40*1024*1024;
export function pairLivePhotos(files){
 const list=Array.from(files),photos=new Map(),pairs=new Map();
 for(const file of list)if(!isVideo(file)&&stem(file)){if(photos.has(stem(file)))photos.set(stem(file),null);else photos.set(stem(file),file);}
 const claimed=new Set();
 for(const file of list){
  if(!isVideo(file)||file.size>MAX_LIVE_MOTION_BYTES)continue;
  const photo=photos.get(stem(file));
  if(photo&&!claimed.has(photo)){claimed.add(photo);pairs.set(file,photo);}
 }
 return pairs;   // motion clip → its photo
}
