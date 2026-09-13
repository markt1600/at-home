import {cleanMemoryMetadata} from '../src/memory-metadata.js';
import {HOUSE_ROOMS,pointInPolygon,floorHeight} from '../src/house-layout.js';
export const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const MEDIA_PATH=/^media\/([a-f0-9-]{36})\/(image\.(jpg|png|webp)|video\.(mp4|webm|mov))$/;
export const CONTENT_TYPES=['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'];
export const MAX_SIZE=250*1024*1024;
export function validMediaPath(path){const m=typeof path==='string'&&path.match(MEDIA_PATH);return !!m&&UUID.test(m[1]);}
export function validateRecord(input,existing){
 if(!UUID.test(input.id||''))throw Error('Invalid memory ID');
 const metadata=cleanMemoryMetadata(input);
 if(!Array.isArray(input.position)||input.position.length!==3||!input.position.every(Number.isFinite))throw Error('Choose a location in the house');
 const [x,,z]=input.position;
 if(!HOUSE_ROOMS.some(r=>r.walkable!==false&&pointInPolygon(x,z,r.polygon)))throw Error('Choose a location inside the house');
 const mediaPath=existing?.mediaPath||input.mediaPath;
 if(!validMediaPath(mediaPath)||mediaPath.split('/')[1]!==input.id)throw Error('Upload media for this memory first');
 return {id:input.id,...metadata,position:[x,floorHeight(x,z),z],mediaPath,type:mediaPath.includes('/video.')?'video':'image',published:input.published===true,updatedAt:new Date().toISOString(),createdAt:existing?.createdAt||new Date().toISOString()};
}
export function publicRecord(r){const {mediaPath,...safe}=r;return {...safe,cloud:true,src:`/api/memories?action=media&id=${encodeURIComponent(r.id)}`};}
