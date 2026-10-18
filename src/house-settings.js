// The game asks the server for the house switches before building the house,
// and remembers the last answer so a slow or offline load still gets it right.
const KEY='athome_house_settings';
export const DEFAULT_HOUSE_SETTINGS={christmas:false};
export function cachedHouseSettings(storage=globalThis.localStorage){try{const v=storage?.getItem(KEY);return v?{...DEFAULT_HOUSE_SETTINGS,...JSON.parse(v)}:{...DEFAULT_HOUSE_SETTINGS};}catch{return {...DEFAULT_HOUSE_SETTINGS};}}
export function rememberHouseSettings(settings,storage=globalThis.localStorage){try{storage?.setItem(KEY,JSON.stringify({christmas:!!settings.christmas}));}catch{}}
export async function loadHouseSettings({fetch:f=globalThis.fetch,timeout=2500,storage=globalThis.localStorage}={}){
 const fallback=cachedHouseSettings(storage);
 try{
  const r=await f('/api/house-settings',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(timeout)});
  if(!r.ok)return fallback;const data=await r.json();if(!data||typeof data!=='object')return fallback;
  const settings={...DEFAULT_HOUSE_SETTINGS,christmas:!!data.christmas};rememberHouseSettings(settings,storage);return settings;
 }catch{return fallback;}
}
