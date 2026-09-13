import {UUID} from './memory-record.js';
import {audioContentType} from '../src/audio-formats.js';
export const MAX_MUSIC_SIZE=100*1024*1024;
export const musicPath=id=>`music/${id}.mp3`;
export const validMusicPath=path=>typeof path==='string'&&!!audioContentType(path)&&/^music\/[a-f0-9-]+\.[a-z0-9]+$/i.test(path)&&UUID.test(path.slice(6,path.lastIndexOf('.')));
export const trackPath=record=>record.path||musicPath(record.id);
export function cleanTrack(input){
 if(!UUID.test(input.id||''))throw Error('Invalid track ID');
 const title=String(input.title||'').replace(/[\p{C}]/gu,'').trim();
 if(!title||title.length>100)throw Error('Enter a track title of up to 100 characters');
 return {id:input.id,title,enabled:input.enabled!==false,updatedAt:new Date().toISOString()};
}
export const publicTrack=({path,...r})=>({...r,src:`/api/music?action=audio&id=${r.id}`});
