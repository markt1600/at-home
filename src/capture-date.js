// Reads the day a photo or video was taken from the file itself, before it is
// re-encoded for the house (which drops this information). Only the calendar
// date is used; no location is read.
const validDay=(y,m,d)=>{const date=new Date(Date.UTC(y,m-1,d));return y>=1900&&y<=2200&&date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d;};
const day=(y,m,d)=>validDay(+y,+m,+d)?`${y}-${m}-${d}`:null;
const localDay=ms=>{const d=new Date(ms);return Number.isFinite(ms)&&ms>0?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:null;};

// EXIF is a small TIFF file. JPEG, HEIC and WebP all carry it after "Exif\0\0".
export function exifDate(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 for(let i=0;i+14<bytes.length;i++){
  if(bytes[i]!==0x45||bytes[i+1]!==0x78||bytes[i+2]!==0x69||bytes[i+3]!==0x66||bytes[i+4]||bytes[i+5])continue;
  const tiff=i+6,little=bytes[tiff]===0x49&&bytes[tiff+1]===0x49,big=bytes[tiff]===0x4d&&bytes[tiff+1]===0x4d;
  if(!little&&!big||view.getUint16(tiff+2,little)!==42)continue;
  const text=offset=>{let s='';for(let n=0;n<19&&tiff+offset+n<bytes.length;n++)s+=String.fromCharCode(bytes[tiff+offset+n]);const m=s.match(/^(\d{4}):(\d{2}):(\d{2})/);return m?day(m[1],m[2],m[3]):null;};
  const entries=offset=>{const found=new Map();if(tiff+offset+2>bytes.length)return found;const count=view.getUint16(tiff+offset,little);for(let n=0;n<count&&tiff+offset+14+n*12<=bytes.length;n++){const at=tiff+offset+2+n*12;found.set(view.getUint16(at,little),view.getUint32(at+8,little));}return found;};
  try{
   const main=entries(view.getUint32(tiff+4,little)),exif=main.has(0x8769)?entries(main.get(0x8769)):new Map();
   const date=(exif.has(0x9003)&&text(exif.get(0x9003)))||(exif.has(0x9004)&&text(exif.get(0x9004)))||(main.has(0x0132)&&text(main.get(0x0132)));
   if(date)return date;
  }catch{/* Malformed block: keep looking. */}
 }
 return null;
}

// MOV/MP4: iPhones write the local capture time as text; otherwise the movie
// header holds a UTC creation time counted from 1904.
export function movieDate(moov){
 const text=new TextDecoder('latin1').decode(moov),apple=text.match(/(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}[+-]\d{2}:?\d{2}/);
 if(apple&&day(apple[1],apple[2],apple[3]))return day(apple[1],apple[2],apple[3]);
 const at=text.indexOf('mvhd');if(at<0||at+16>moov.length)return null;
 const view=new DataView(moov.buffer,moov.byteOffset,moov.byteLength),version=moov[at+4];
 const seconds=version===1?Number(view.getBigUint64(at+8)):view.getUint32(at+8);
 return seconds>2082844800?localDay((seconds-2082844800)*1000):null;
}
async function readMoov(file){
 let offset=0;
 for(let guard=0;guard<64&&offset+8<=file.size;guard++){
  const head=new DataView(await file.slice(offset,offset+16).arrayBuffer());if(head.byteLength<8)return null;
  let size=head.getUint32(0);const type=String.fromCharCode(head.getUint8(4),head.getUint8(5),head.getUint8(6),head.getUint8(7));
  if(size===1&&head.byteLength>=16)size=Number(head.getBigUint64(8));else if(size===0)size=file.size-offset;
  if(size<8)return null;
  if(type==='moov')return new Uint8Array(await file.slice(offset,offset+Math.min(size,8*1024*1024)).arrayBuffer());
  offset+=size;
 }
 return null;
}
const isVideo=file=>/^video\//.test(file.type||'')||/\.(mov|mp4|m4v|webm)$/i.test(file.name||'');
export async function captureDate(file,{now=Date.now()}={}){
 try{
  if(isVideo(file)){const moov=await readMoov(file),date=moov&&movieDate(moov);if(date)return {date,source:'video'};}
  else{const date=exifDate(new Uint8Array(await file.slice(0,512*1024).arrayBuffer()));if(date)return {date,source:'photo'};}
 }catch{/* Fall through to the file's own date. */}
 // A file changed in the last day was most likely just exported or converted.
 const modified=file.lastModified;
 if(Number.isFinite(modified)&&modified>0&&now-modified>24*3600000){const date=localDay(modified);if(date)return {date,source:'file'};}
 return null;
}
// For an album, the day it began.
export async function earliestCaptureDate(files,options){
 let best=null;
 for(const file of files){const found=await captureDate(file,options);if(found&&(!best||(found.source!=='file')>(best.source!=='file')||(found.source!=='file')===(best.source!=='file')&&found.date<best.date))best=found;}
 return best;
}
export const captureDateNote=found=>!found?'':found.source==='file'?'Date suggested from the file’s own date. Check it before saving.':`Date filled in from the ${found.source}. Change it if it is not right.`;
