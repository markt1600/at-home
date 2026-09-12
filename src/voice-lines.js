import {PEOPLE,ODD_ANSWERS} from './content.js';
export const NAME_CALLS=[
 name=>`${name}… are you still there?`,
 name=>`Don't answer the next voice, ${name}.`,
 name=>`${name}… I thought someone was sitting on the orange sofa.`,
 name=>`${name}… did you remember to close the front door?`,
 name=>`Was that you calling from the bedroom, ${name}?`,
 name=>`${name}… did you hear a doorbell, or was that just me?`,
 name=>`${name}… don't turn around. Look at the mirror.`,
];
export function cleanName(value){return [...String(value??'').normalize('NFKC').replace(/[^\p{L}\p{M}\p{N} '\u2019-]/gu,'').replace(/\s+/g,' ').trim()].slice(0,28).join('')||'Resident';}
export function resolveVoiceRequest(body){
 if(!body||typeof body!=='object')return null;
 if(body.kind==='whisper'&&Number.isInteger(body.cue)&&body.cue>=0&&body.cue<NAME_CALLS.length){return {text:NAME_CALLS[body.cue](cleanName(body.name)),whisper:true,speaker:'intercom'};}
 if(body.kind==='dialogue'&&typeof body.text==='string'){
  const p=PEOPLE.find(p=>p.id===body.personId);if(!p)return null;
  if(![p.opening,p.alibi,p.memory,p.humanClue,...ODD_ANSWERS].includes(body.text))return null;
  return {text:body.text,whisper:false,speaker:['aisha','kavitha','siti','goh','farah','mei'].includes(p.id)?'female':'male'};
 }
 return null;
}
