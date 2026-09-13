import {audioContentType} from './audio-formats.js';
export const MAX_SOUNDTRACK_SIZE=100*1024*1024;
export function validateSoundtrack(file){
 if(!file||!audioContentType(file.name)||!file.size||file.size>MAX_SOUNDTRACK_SIZE)throw Error('Choose MP3, M4A/AAC, WAV, Ogg/Opus, FLAC or WebM audio, up to 100 MB.');
 return file;
}
