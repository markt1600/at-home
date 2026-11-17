// Which memories the house brings forward: ones from this day in earlier
// years, ones from this time of year, and ones not opened for a while.
const DAY=86400000;
const parts=date=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date||'');return m?{year:+m[1],month:+m[2],day:+m[3]}:null;};
// Days between a memory's month-and-day and today's, around the year's end too.
function dayDistance(p,today){
 const year=today.getFullYear(),now=Date.UTC(year,today.getMonth(),today.getDate());
 return Math.min(...[-1,0,1].map(shift=>Math.abs(Date.UTC(year+shift,p.month-1,p.day)-now)))/DAY;
}
export function anniversaries(memories,today=new Date(),window=3){
 const found=[];
 for(const memory of memories){
  const p=parts(memory.date);if(!p)continue;
  const distance=dayDistance(p,today),years=today.getFullYear()-p.year;
  // "On this day" is a calendar match, so a 29 February memory waits for a leap year (or shows as "this week").
  const exact=p.month===today.getMonth()+1&&p.day===today.getDate();
  if(years>=1&&(exact||distance<=window)&&!(years===1&&!exact&&new Date(p.year,p.month-1,p.day)>new Date(today.getFullYear()-1,today.getMonth(),today.getDate()+window)))found.push({memory,years,exact});
 }
 return found.sort((a,b)=>b.exact-a.exact||a.years-b.years||String(a.memory.id).localeCompare(String(b.memory.id)));
}
export const yearsAgo=n=>n===1?'a year ago':`${n} years ago`;
// A bonus subtracted from a memory's random rank for the visit: larger comes first.
export function visitWeight(memory,{today=new Date(),seen={},now=today.getTime()}={}){
 let weight=0;const p=parts(memory.date);
 if(p&&today.getFullYear()>p.year){
  const distance=dayDistance(p,today);
  if(p.month===today.getMonth()+1&&p.day===today.getDate())weight+=3;else if(distance<=3)weight+=2;else if(distance<=45)weight+=.3;   // the same season
 }
 const opened=seen[memory.id];
 weight+=Number.isFinite(opened)?Math.min(.5,Math.max(0,now-opened)/(120*DAY)*.5):.5;   // never opened counts as long ago
 return weight;
}
const KEY='at-home-memories-opened';
export function loadSeen(storage=globalThis.localStorage){try{const data=JSON.parse(storage.getItem(KEY)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch{return {};}}
export function markSeen(id,{storage=globalThis.localStorage,now=Date.now()}={}){
 const seen=loadSeen(storage);seen[id]=now;
 // Keep the newest 2000 so the record cannot grow without limit.
 const kept=Object.fromEntries(Object.entries(seen).sort((a,b)=>b[1]-a[1]).slice(0,2000));
 try{storage.setItem(KEY,JSON.stringify(kept));}catch{}
 return kept;
}
// Newest first, grouped by year, with undated memories gathered at the end.
export function timeline(memories){
 const groups=new Map();
 for(const memory of [...memories].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(a.title||'').localeCompare(String(b.title||'')))){
  const year=parts(memory.date)?.year||null;if(!groups.has(year))groups.set(year,[]);groups.get(year).push(memory);
 }
 return [...groups].sort((a,b)=>(b[0]??-Infinity)-(a[0]??-Infinity)).map(([year,items])=>({year,items}));
}
