const datePattern=/^\d{4}-\d{2}-\d{2}$/;
const validDate=s=>datePattern.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
export function cleanMemoryFilter(input={}){
 const from=String(input.from||''),to=String(input.to||'');
 if((from&&!validDate(from))||(to&&!validDate(to))||(from&&to&&from>to))throw Error('Enter a valid date range with the start before the end.');
 return {from,to,includeUndated:input.includeUndated===true};
}
export function filterMemories(memories,filter={}){
 const {from='',to='',includeUndated=false}=filter;
 if(!from&&!to)return memories;
 return memories.filter(m=>m.date?(!from||m.date>=from)&&(!to||m.date<=to):includeUndated);
}
