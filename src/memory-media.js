export const MAX_MEMORY_ITEMS=30;
export const memoryMedia=m=>m.media?.length?m.media:[{id:'original',type:m.type,src:m.src,poster:m.poster}];
export const memoryHasAudio=m=>!!m&&(!!m.soundtrack?.src||memoryMedia(m).some(a=>a.type==='video'));
export const memoryAppearance=m=>memoryMedia(m).some(a=>a.type==='video')
 ?{kind:'video',label:'Video memory',symbol:'▷',color:0xc58a35,css:'#c58a35'}
 :{kind:'image',label:memoryMedia(m).length>1?'Photo slideshow':'Photo memory',symbol:'▧',color:0x4d97c5,css:'#4d97c5'};
export function releaseMemoryUrls(m){for(const src of new Set([m.src,m.soundtrack?.src,...(m.media||[]).map(a=>a.src)]))if(src?.startsWith('blob:'))URL.revokeObjectURL(src);}
export function validateMemoryFiles(files,{photosOnly=false,existing=0}={}){
 const list=Array.from(files||[]);if(!list.length)throw Error('Choose a photo or video first.');
 if(existing+list.length>MAX_MEMORY_ITEMS)throw Error(`A memory can hold up to ${MAX_MEMORY_ITEMS} photos and videos.`);
 for(const file of list){
  if(!file.size||file.size>250*1024*1024||!/^(image\/(jpeg|png|webp)|video\/(mp4|webm|quicktime))$/.test(file.type))throw Error('Choose JPG, PNG, WebP, MP4, WebM or MOV files, up to 250 MB each.');
  if(photosOnly&&!file.type.startsWith('image/'))throw Error('Choose photos to add to this memory.');
 }
 return list;
}
