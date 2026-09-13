import {MAX_MEMORY_ITEMS,validateMemoryFiles} from './memory-media.js';
export const PHOTO_ACCEPT='image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';
export const isHeicFile=file=>/\.(heic|heif)$/i.test(file.name||'')||/^image\/hei[cf](?:-sequence)?$/i.test(file.type||'');

async function convertHeic(file){
 // Modern Safari may decode these natively. Otherwise libheif does the decoding
 // in its worker; the library is not downloaded by the game or for JPEG uploads.
 let bitmap;
 try{bitmap=await createImageBitmap(file);}catch{
  const {heicTo}=await import('heic-to/next');bitmap=await heicTo({blob:file,type:'bitmap'});
 }
 try{
  const scale=Math.min(1,2560/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not encode photo')),'image/jpeg',.9));
 }finally{bitmap?.close();}
}

export async function prepareMemoryPhotos(input,{photosOnly=false,existing=0,onProgress=()=>{},convert=convertHeic}={}){
 const files=Array.from(input||[]);if(!files.length)throw Error('Choose a photo or video first.');
 if(files.length+existing>MAX_MEMORY_ITEMS)throw Error(`A memory can hold up to ${MAX_MEMORY_ITEMS} photos and videos.`);
 // Validate the entire selection before spending time converting anything.
 for(const file of files){if(isHeicFile(file)){if(!file.size||file.size>250*1024*1024)throw Error('Choose HEIC photos up to 250 MB each.');}else validateMemoryFiles([file],{photosOnly});}
 const ready=[];
 for(let i=0;i<files.length;i++){
  const file=files[i];if(!isHeicFile(file)){ready.push(file);continue;}
  onProgress(`Preparing iPhone photo ${i+1} of ${files.length}: ${file.name}…`);
  try{const blob=await convert(file);if(!blob?.size||blob.type!=='image/jpeg')throw Error('No image');
   ready.push(new File([blob],(file.name||'iPhone photo').replace(/\.(heic|heif)$/i,'')+'.jpg',{type:'image/jpeg',lastModified:file.lastModified}));
  }catch{throw Error(`Could not convert “${file.name}”. Try exporting this photo as JPEG from Photos and adding it again. Your existing memory has not changed.`);}
 }
 return validateMemoryFiles(ready,{photosOnly,existing});
}
