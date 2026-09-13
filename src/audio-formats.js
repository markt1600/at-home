export const AUDIO_FORMATS={mp3:'audio/mpeg',m4a:'audio/mp4',aac:'audio/aac',wav:'audio/wav',ogg:'audio/ogg',oga:'audio/ogg',opus:'audio/ogg',flac:'audio/flac',weba:'audio/webm',webm:'audio/webm'};
export const AUDIO_ACCEPT=Object.keys(AUDIO_FORMATS).map(ext=>'.'+ext).join(',');
export const audioExtension=name=>String(name).toLowerCase().split('.').pop();
export const audioContentType=name=>AUDIO_FORMATS[audioExtension(name)];
