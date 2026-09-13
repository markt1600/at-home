export const cleanName=value=>[...String(value??'').normalize('NFKC').replace(/[^\p{L}\p{M}\p{N} '\u2019-]/gu,'').replace(/\s+/g,' ').trim()].slice(0,28).join('')||'friend';
export const HOME_LINES=[
 name=>`Welcome home, ${name}. There is no hurry. Make yourself comfortable.`,
 name=>`It is good to have a little time for yourself, ${name}.`,
 name=>`Take a slow breath, ${name}. You can enjoy this moment just as it is.`,
 name=>`The day is yours, ${name}. A small, happy thing is enough.`,
];
export function resolveVoiceRequest(body){
 if(!body||typeof body!=='object')return null;
 if(body.kind==='home'&&Number.isInteger(body.cue)&&body.cue>=0&&body.cue<HOME_LINES.length)return {text:HOME_LINES[body.cue](cleanName(body.name)),speaker:'companion'};
 return null;
}
