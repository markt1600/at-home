// Migrate only authored legacy lines in saved transcripts; preserve decisions.
const replacements=[
 ['Retired mathematics teacher','Accountant · neighbour'],
 ['I was in my flat marking old exam papers. Then every phone in the building rang.','I was in my flat checking invoices. Then every phone in the building rang.'],
 ['The UV residue is from the lab. Check the practical schedule.','The UV residue is from the lab. My work record mentions the chemicals.'],
 ['The bicycles hang up in the utility room. I helped carry one inside.','The washer and dryer are in the yard behind the kitchen. I helped carry the laundry inside.'],
 ['PERFECT ATTENDANCE','NOBODY CAME HOME'],
 ['THE SCHOOL SETTLES. SOMETHING ELSE DOES NOT.','THE HOUSE SETTLES. SOMETHING ELSE DOES NOT.']
];
export function houseDialogue(text){let out=text;for(const [old,current] of replacements)out=out.replaceAll(old,current);return out;}
export function migrateHouseDialogue(state){
 if(typeof state.lastReply==='string')state.lastReply=houseDialogue(state.lastReply);
 if(typeof state.lastEvent==='string')state.lastEvent=houseDialogue(state.lastEvent);
 if(Array.isArray(state.log))state.log=state.log.map(entry=>({...entry,text:typeof entry.text==='string'?houseDialogue(entry.text):entry.text}));
 return state;
}
