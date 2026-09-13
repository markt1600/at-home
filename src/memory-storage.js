export const validFileSize=value=>Number.isSafeInteger(value)&&value>=0;
export function memoryStorage(memory){
 const assets=memory.media?.length?memory.media:memory.files?.length?memory.files:[{file:memory.file,size:memory.size}];
 const sizes=assets.map(a=>a.file?.size??a.size);
 if(memory.soundtrack||memory.soundtrackFile)sizes.push(memory.soundtrackFile?.size??memory.soundtrack?.file?.size??memory.soundtrack?.size);
 const known=sizes.filter(validFileSize);
 return {bytes:known.reduce((sum,size)=>sum+size,0),known:known.length,files:sizes.length,complete:known.length===sizes.length};
}
export function formatFileSize(bytes){
 if(!validFileSize(bytes))return 'Size unavailable';
 const units=['B','KB','MB','GB','TB'],unit=Math.min(units.length-1,Math.floor(Math.log10(Math.max(1,bytes))/3));
 return `${new Intl.NumberFormat('en',{maximumFractionDigits:unit?1:0}).format(bytes/1000**unit)} ${units[unit]}`;
}
export function memoryStorageLabel(memory){
 const size=memoryStorage(memory);
 return size.complete?`${formatFileSize(size.bytes)} stored`:size.known?`At least ${formatFileSize(size.bytes)} · some sizes unavailable`:'Size unavailable';
}
