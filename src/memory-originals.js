// The untouched file as it left the phone or camera, kept beside the smaller
// copy the house plays. Shared by the uploaders and the server.
export const ORIGINAL_TYPES={heic:'image/heic',heif:'image/heif',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',mov:'video/quicktime',mp4:'video/mp4',m4v:'video/mp4',webm:'video/webm'};
export const MAX_ORIGINAL_SIZE=1_000_000_000;
export const originalExtension=file=>{const ext=String(file?.name||'').split('.').at(-1).toLowerCase();return Object.hasOwn(ORIGINAL_TYPES,ext)?ext:null;};
// Worth keeping only when the house copy is a different, reduced file.
export const keepableOriginal=(original,prepared)=>!!original&&original!==prepared&&!!originalExtension(original)&&original.size>0&&original.size<=MAX_ORIGINAL_SIZE;
export const originalUpload=(original,memoryId)=>{const ext=originalExtension(original);return {path:`originals/${memoryId}/${crypto.randomUUID()}.${ext}`,contentType:ORIGINAL_TYPES[ext]};};
const KEY='at-home-keep-originals';
export const keepOriginalsPreference=()=>{try{return localStorage.getItem(KEY)!=='off';}catch{return true;}};
export const saveKeepOriginalsPreference=on=>{try{localStorage.setItem(KEY,on?'on':'off');}catch{}};
