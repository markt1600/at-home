// "Download everything": one ordinary .zip holding every memory's story, its
// prepared photos and videos, the untouched originals and any soundtrack.
// Files are stored uncompressed (photos and videos do not shrink further) and
// written one at a time, so the library never has to fit in memory.
const CRC_TABLE=new Uint32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
export function crc32(bytes,crc=0){crc=~crc>>>0;for(let i=0;i<bytes.length;i++)crc=CRC_TABLE[(crc^bytes[i])&255]^(crc>>>8);return ~crc>>>0;}
async function blobCrc(blob){
 let crc=0;const reader=blob.stream().getReader();
 for(;;){const {done,value}=await reader.read();if(done)break;crc=crc32(value,crc);}
 return crc;
}
const LIMIT=0xffffffff;
export function createZipWriter(write,{now=new Date()}={}){
 const entries=[],encoder=new TextEncoder();let offset=0;
 const time=((now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1))&0xffff,date=(((Math.max(1980,now.getFullYear())-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate())&0xffff;
 const emit=async part=>{await write(part);offset+=part.size??part.byteLength;};
 return {
  async add(name,content){
   const blob=content instanceof Blob?content:new Blob([content]);
   if(blob.size>=LIMIT)throw Error('A single file is too large to export.');
   const bytes=encoder.encode(name),crc=await blobCrc(blob),head=new DataView(new ArrayBuffer(30));
   head.setUint32(0,0x04034b50,true);head.setUint16(4,20,true);head.setUint16(6,0x0800,true);head.setUint16(10,time,true);head.setUint16(12,date,true);
   head.setUint32(14,crc,true);head.setUint32(18,blob.size,true);head.setUint32(22,blob.size,true);head.setUint16(26,bytes.length,true);
   entries.push({bytes,crc,size:blob.size,offset});
   await emit(new Uint8Array(head.buffer));await emit(bytes);if(blob.size)await emit(blob);
  },
  async finish(){
   const start=offset;
   for(const e of entries){
    const far=e.offset>=LIMIT,head=new DataView(new ArrayBuffer(46+(far?12:0)));
    head.setUint32(0,0x02014b50,true);head.setUint16(4,far?45:20,true);head.setUint16(6,far?45:20,true);head.setUint16(8,0x0800,true);head.setUint16(12,time,true);head.setUint16(14,date,true);
    head.setUint32(16,e.crc,true);head.setUint32(20,e.size,true);head.setUint32(24,e.size,true);head.setUint16(28,e.bytes.length,true);head.setUint16(30,far?12:0,true);
    head.setUint32(42,far?LIMIT:e.offset,true);
    if(far){head.setUint16(46,1,true);head.setUint16(48,8,true);head.setBigUint64(50,BigInt(e.offset),true);}
    // The name sits between the fixed fields and the extra field.
    await emit(new Uint8Array(head.buffer,0,46));await emit(e.bytes);if(far)await emit(new Uint8Array(head.buffer,46,12));
   }
   const size=offset-start,count=entries.length,big=count>0xffff||start>=LIMIT||size>=LIMIT;
   if(big){
    const record=new DataView(new ArrayBuffer(56));record.setUint32(0,0x06064b50,true);record.setBigUint64(4,44n,true);record.setUint16(12,45,true);record.setUint16(14,45,true);
    record.setBigUint64(24,BigInt(count),true);record.setBigUint64(32,BigInt(count),true);record.setBigUint64(40,BigInt(size),true);record.setBigUint64(48,BigInt(start),true);
    const locator=new DataView(new ArrayBuffer(20));locator.setUint32(0,0x07064b50,true);locator.setBigUint64(8,BigInt(offset),true);locator.setUint32(16,1,true);
    await emit(new Uint8Array(record.buffer));await emit(new Uint8Array(locator.buffer));
   }
   const end=new DataView(new ArrayBuffer(22));end.setUint32(0,0x06054b50,true);end.setUint16(8,Math.min(count,0xffff),true);end.setUint16(10,Math.min(count,0xffff),true);end.setUint32(12,Math.min(size,LIMIT),true);end.setUint32(16,Math.min(start,LIMIT),true);
   await emit(new Uint8Array(end.buffer));return offset;
  }
 };
}
const safeName=text=>String(text||'').replace(/[\\/:*?"<>|\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().replace(/^\.+|\.+$/g,'').slice(0,80);
const extension=name=>(String(name).match(/\.([a-z0-9]{1,5})$/i)?.[1]||'bin').toLowerCase();
export function exportPlan(memories){
 const files=[],folders=new Set();
 for(const m of memories){
  let folder=`${m.date||'undated'} ${safeName(m.title)||'Memory'}`;if(folders.has(folder.toLowerCase()))folder+=` [${String(m.id).slice(0,8)}]`;folders.add(folder.toLowerCase());
  if(m.deletedAt)folder='Recently deleted/'+folder;
  const used=new Set();
  (m.media||[]).forEach((a,i)=>{
   const number=String(i+1).padStart(2,'0');
   files.push({path:`${folder}/${number}.${extension(a.id)}`,src:a.src,size:a.size});
   if(a.live)files.push({path:`${folder}/${number} live.mp4`,src:a.live});
   if(a.original){let name=safeName(a.original.name)||`${number}.${extension(a.original.name)}`;if(used.has(name.toLowerCase()))name=`${number} ${name}`;used.add(name.toLowerCase());files.push({path:`${folder}/originals/${name}`,src:a.original.src,size:a.original.size});}
  });
  if(m.soundtrack)files.push({path:`${folder}/soundtrack ${safeName(m.soundtrack.title)||'song'}.${extension(new URL(m.soundtrack.src,'http://x').searchParams.get('asset')||'')}`,src:m.soundtrack.src,size:m.soundtrack.size});
  const {etag,src,...story}=m;
  files.push({path:`${folder}/memory.json`,text:JSON.stringify({...story,media:(m.media||[]).map(a=>({id:a.id,type:a.type,original:a.original?.name||null,live:!!a.live}))},null,1)});
 }
 return files;
}
export async function exportLibrary(memories,{write,read=async src=>{const r=await fetch(src,{credentials:'same-origin'});if(!r.ok)throw Error('A file could not be downloaded');return r.blob();},onProgress=()=>{},signal}={}){
 const zip=createZipWriter(write),plan=exportPlan(memories),missing=[];
 for(let i=0;i<plan.length;i++){
  signal?.throwIfAborted();const file=plan[i];onProgress({done:i,total:plan.length,path:file.path});
  if(file.text!==undefined){await zip.add(file.path,new Blob([file.text]));continue;}
  // One unreadable file must not cost the rest of the archive: note it and go on.
  let blob;try{blob=await read(file.src);}catch{try{blob=await read(file.src);}catch{missing.push(file.path);continue;}}
  await zip.add(file.path,blob);
 }
 await zip.add('library.json',new Blob([JSON.stringify({exportedAt:new Date().toISOString(),memories:memories.length,missing},null,1)]));
 if(missing.length)await zip.add('MISSING FILES.txt',new Blob([`These files could not be downloaded and are not in this archive:\n\n${missing.join('\n')}\n`]));
 const bytes=await zip.finish();onProgress({done:plan.length,total:plan.length});
 return {bytes,files:plan.length-missing.length,missing};
}
// Where the archive goes: straight to disk where the browser can, otherwise it
// is assembled as a browser-managed file and handed over as a download.
export async function openExportTarget(filename){
 if(globalThis.showSaveFilePicker){
  const handle=await showSaveFilePicker({suggestedName:filename,types:[{description:'Zip archive',accept:{'application/zip':['.zip']}}]}),stream=await handle.createWritable();
  return {write:part=>stream.write(part),close:()=>stream.close(),abort:()=>stream.abort().catch(()=>{})};
 }
 const parts=[];
 return {write:async part=>{parts.push(part);},abort:async()=>{parts.length=0;},close:async()=>{
  const url=URL.createObjectURL(new Blob(parts,{type:'application/zip'})),link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }};
}
