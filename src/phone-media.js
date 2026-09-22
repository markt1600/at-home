import {prepareMemoryPhotos} from './photo-import.js';
export const PHONE_MEDIA_ACCEPT='image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif,video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm';
export const MAX_PHONE_VIDEO_BYTES=1_000_000_000;
const types={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',heic:'image/heic',heif:'image/heif',mp4:'video/mp4',m4v:'video/mp4',mov:'video/quicktime',webm:'video/webm'};
export function normalizePhoneFile(file){
 const extension=file.name?.split('.').at(-1).toLowerCase(),type=types[extension]||file.type;
 if(!Object.values(types).includes(type))throw Error('Choose a photo (HEIC, JPG, PNG or WebP) or a video (MOV, MP4 or WebM).');
 if(!file.size)throw Error('This file is empty. Download it from iCloud Photos and try again.');
 if(file.size>(type.startsWith('video/')?MAX_PHONE_VIDEO_BYTES:250*1024*1024))throw Error(type.startsWith('video/')?'Choose a video smaller than 1 GB. You can shorten it in Photos first.':'Choose a photo smaller than 250 MB.');
 return file.type===type?file:new File([file],file.name,{type,lastModified:file.lastModified});
}
export async function preparePhoneMedia(file,{signal,onProgress=()=>{},photo=prepareMemoryPhotos,video}={}){
 file=normalizePhoneFile(file);signal?.throwIfAborted();
 if(file.type.startsWith('image/')){
  const [ready]=await photo([file],{normalize:true,signal,onProgress:text=>onProgress({text,percentage:null})});
  return {file:ready,note:'JPEG · 1 MB or less'};
 }
 const convert=video||(await import('./phone-video.js')).preparePhoneVideo;
 return convert(file,{signal,onProgress});
}
