import {migrateHouseDialogue} from './house-dialogue.js';
import { PEOPLE, ENDINGS, ODD_ANSWERS } from './content.js';
import { playerName as normalizePlayerName } from './haunting.js';

export const SAVE_KEY = 'last-bell-save-v1';
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a += 0x6D2B79F5; let t = Math.imul(a ^ a >>> 15, a | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function createGame(seed = Math.floor(Math.random() * 0xffffffff), name) {
  const random = rng(seed);
  const order = PEOPLE.map(p => ({p, rank:random()})).sort((a,b) => a.rank-b.rank);
  // Four to six visitors, freshly assigned every run; no character is always safe.
  const count = 4 + Math.floor(random()*3);
  const infectedIndices = order.map((_,i)=>({i,rank:random()})).sort((a,b)=>a.rank-b.rank).slice(0,count).map(x=>x.i);
  const encounters = order.map(({p},i) => {
    const visitor = infectedIndices.includes(i);
    const signs = [0,1,2].map(()=>random() < (visitor ? .76 : .23));
    // At least one useful anomaly for visitors. Humans can have convincing false positives.
    if (visitor && !signs.some(Boolean)) signs[Math.floor(random()*3)] = true;
    return { personId:p.id, visitor, signs, contradiction:random()<(visitor?.73:.13), pulse:Math.floor(random()*18), asked:[], scans:[], decision:null };
  });
  return { version:1, seed, playerName:name===undefined?'':normalizePlayerName(name), encounters, index:0, phase:'arrival', night:1, health:100, ammo:6, trust:50, noise:0, sheltered:[], decisions:[], notes:[], signalOff:false, time:90, ending:null };
}
export function current(state) { const encounter=state.encounters[state.index]; return encounter ? {...PEOPLE.find(p=>p.id===encounter.personId), ...encounter} : null; }
export function examine(state, kind) {
  if(!['thermal','pulse','uv'].includes(kind)) return null;
  const e=state.encounters[state.index];
  if(state.phase!=='arrival'||!e||e.scans.includes(kind)) return null;
  e.scans.push(kind); state.time=Math.max(1,state.time-7);
  const index={thermal:0,pulse:1,uv:2}[kind];
  if(index===undefined) return null;
  const anomaly=e.signs[index];
  return {kind,anomaly,text:kind==='thermal'?(anomaly?'31.4°C — Peripheral temperature is unusually low. Cold exposure and circulation disorders can explain this.':'36.7°C — Surface temperature is within normal range. This alone does not clear them.') : kind==='pulse'?(anomaly?'43 BPM — An irregular beat. A second, fainter rhythm seems to follow the first. Medication can affect this reading.':`${76+e.pulse} BPM — A fast but regular rhythm. Stress can elevate heart rate.`):(anomaly?'FLUORESCENCE — A pale branching residue around the wrists. Some laboratory chemicals react identically.':'NO RESIDUE — No unusual fluorescence. Absence of residue does not prove human identity.')};
}
export function question(state, kind) {
  if(!['alibi','memory','explain'].includes(kind)) return null;
  const e=state.encounters[state.index]; const p=current(state);
  if(state.phase!=='arrival'||!e||e.asked.includes(kind)) return null;
  e.asked.push(kind); state.time=Math.max(1,state.time-5);
  if(kind==='alibi') return e.contradiction ? ODD_ANSWERS[0] : p.alibi;
  if(kind==='memory') return e.visitor && e.signs[1] ? ODD_ANSWERS[1] : p.memory;
  return e.visitor && e.signs[2] ? ODD_ANSWERS[2] : p.humanClue;
}
export function decide(state, action) {
  if(state.phase!=='arrival') return false;
  const e=state.encounters[state.index];
  if(!e||!['admit','reject','shoot'].includes(action)||(action==='shoot'&&state.ammo<1)) return false;
  e.decision=action;
  state.decisions.push({id:e.personId,action,visitor:e.visitor});
  if(action==='admit') {state.sheltered.push(e.personId); state.trust=Math.min(100,state.trust+8);}
  if(action==='reject') state.trust=Math.max(0,state.trust-3);
  if(action==='shoot') { state.ammo--; state.noise+=24; state.trust=Math.max(0,state.trust-16); }
  state.phase='aftermath';
  return true;
}
export function advance(state) {
  if(state.phase!=='aftermath') return null;
  state.index++;
  if(state.index%4===0) {
    const infiltrators=state.decisions.filter(d=>d.action==='admit'&&d.visitor).length;
    const damage=(state.signalOff?0:infiltrators*19) + Math.max(0,state.noise-38)*.35 + (state.sheltered.length ? Math.max(0,25-state.trust)*.25 : 0);
    state.health=Math.max(0,Math.round(state.health-damage));
    state.noise=Math.max(0,state.noise-22);
    if(state.health<=0) return finish(state,'fallen');
    if(state.index>=state.encounters.length) return finish(state);
    state.night++; state.ammo=Math.min(8,state.ammo+2); state.phase='interval';
    return {type:'interval',damage, infiltrators};
  }
  state.phase='arrival'; state.time=state.night===3?70:90;
  return {type:'arrival'};
}
export function nextWatch(state) { if(state.phase==='interval'){state.phase='arrival';state.time=state.night===3?70:90;} }
export function finish(state, forced) {
  const killedHumans=state.decisions.filter(d=>d.action==='shoot'&&!d.visitor).length;
  const infiltrators=state.decisions.filter(d=>d.action==='admit'&&d.visitor).length;
  const saved=state.decisions.filter(d=>d.action==='admit'&&!d.visitor).length;
  const ending=forced || (killedHumans>=3?'blood':state.signalOff?'signal':infiltrators>=1?'breach':saved>=3?'dawn':'alone');
  state.ending=ending;state.phase='ending';
  return {type:'ending',key:ending,...ENDINGS[ending]};
}
export function unlockSignal(state,code) {
  if(!state.notes.includes('incident')||!state.notes.includes('photograph')) return {ok:false,text:'Two pieces are missing. Search the entry notebook and the bedroom mirror.'};
  if(code!=='1704') { state.noise=Math.min(100,state.noise+8); return {ok:false,text:'Override refused. The loudspeaker answers with a breath. Noise increased.'}; }
  state.signalOff=true; return {ok:true,text:'CARRIER DISCONNECTED. For a moment, every fluorescent light burns white. The invitation has ended.'};
}
export function saveGame(state) {try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch{ /* Private browsing may disallow storage. */ }}
export function loadGame() {try {const s=JSON.parse(localStorage.getItem(SAVE_KEY));if(s?.version===1&&s.encounters?.length===12&&s.index>=0&&s.index<=12&&s.phase!=='ending') return migrateHouseDialogue(s);}catch{} return null;}
