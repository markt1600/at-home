export const MAX_PHOTO_BYTES=1_000_000;

// Try progressively lighter JPEGs, then smaller dimensions. Always check the
// actual encoded size; quality settings alone cannot guarantee a byte limit.
export async function fitPhotoToLimit({width,height,encode,maxBytes=MAX_PHOTO_BYTES}){
 if(!(width>0&&height>0&&maxBytes>0))throw Error('This photo has invalid dimensions.');
 let scale=Math.min(1,2560/Math.max(width,height));
 for(let pass=0;pass<16;pass++){
  const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
  for(const quality of [.90,.82,.74,.66,.58]){
   const blob=await encode(w,h,quality);
   if(!blob?.size||blob.type!=='image/jpeg')throw Error('The browser could not encode this photo.');
   if(blob.size<=maxBytes)return blob;
  }
  if(w===1&&h===1)break;scale*=.78;
 }
 throw Error('This photo could not be reduced to 1 MB. Try another copy of the photo.');
}

async function decodePhoto(file){
 try{return await createImageBitmap(file);}catch{
  const url=URL.createObjectURL(file),image=new Image();
  try{image.src=url;await image.decode();return {width:image.naturalWidth,height:image.naturalHeight,image,close:()=>URL.revokeObjectURL(url)};}
  catch{URL.revokeObjectURL(url);throw Error('The browser could not read this photo.');}
 }
}

export async function compressPhoto(file,{maxBytes=MAX_PHOTO_BYTES,decode=decodePhoto}={}){
 if(!/^image\/(jpeg|png|webp)$/.test(file.type||''))throw Error('Choose a JPG, PNG or WebP photo.');
 if(!file.size)throw Error('This photo is empty.');
 if(file.size<=maxBytes)return file;
 const bitmap=await decode(file);
 try{
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw Error('Photo compression is unavailable in this browser.');
  const blob=await fitPhotoToLimit({width:bitmap.width,height:bitmap.height,maxBytes,encode:async(w,h,quality)=>{
   canvas.width=w;canvas.height=h;ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(bitmap.image||bitmap,0,0,w,h);
   return new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
  }});
  return new File([blob],(file.name||'photo').replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg',lastModified:file.lastModified||Date.now()});
 }finally{bitmap.close?.();}
}

export async function preparePhotoReplacements(media,{read=async a=>{if(a.file)return a.file;const response=await fetch(a.src);if(!response.ok)throw Error('Could not download a photo. Please try again.');return response.blob();},compress=compressPhoto,onProgress=()=>{}}={}){
 const replacements=[],photos=media.filter(a=>a.type==='image');
 for(let i=0;i<photos.length;i++){
  const a=photos[i];if((a.file?.size??a.size)>0&&(a.file?.size??a.size)<=MAX_PHOTO_BYTES)continue;
  onProgress(`Compressing photo ${i+1} of ${photos.length}…`);
  const original=await read(a);if(original.size<=MAX_PHOTO_BYTES)continue;
  const file=await compress(original);if(file.size>MAX_PHOTO_BYTES||!file.size)throw Error('A photo could not be reduced to 1 MB. No changes have been saved.');
  replacements.push({id:a.id,file,previousSize:original.size});
 }
 return replacements;
}
