const files={sunny:['leo','leo-walk','leo-walk-front','leo-walk-back','leo-sleep','leo-overhead','leo-overhead-idle'],miso:['miso-orange','miso-walk','miso-walk-front','miso-walk-back','miso-sleep','miso-overhead','miso-overhead-idle'],pebble:['pebble','pebble-walk','pebble-walk-front','pebble-walk-back','pebble-overhead','pebble-overhead-idle']};
const urls=new Map();
export const petPlayFilms=['play','play-front','play-back','play-overhead'];
export const petActivityFilms={sunny:['chew','chew-overhead',...petPlayFilms],miso:['groom','groom-overhead','lounge','lounge-overhead',...petPlayFilms],pebble:[]};
export const petCarryFilms=['carry','carry-front','carry-back','carry-overhead'];
export const petFilmUrl=name=>urls.get(name)||`/art/motion/compact/${name}.mp4`;
// Three small sequential queues warm all orientations before entering the house.
// Object URLs avoid another transfer when a mobile browser starts a video decoder.
export async function preloadPetFilms(id){
 for(const name of files[id]){
  if(urls.has(name))continue;
  const response=await fetch(petFilmUrl(name),{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error('Pet film unavailable');
  const blob=await response.blob();if(blob.size<1000)throw new Error('Incomplete pet film');
  urls.set(name,URL.createObjectURL(blob));
 }
}
// Optional activities warm after the essential views. They never delay Start.
export async function preloadPetActivities(id){for(const mode of [...(petActivityFilms[id]||[]),...(id==='sunny'?petCarryFilms:[])]){const name=`${id==='sunny'?'leo':id}-${mode}`;if(urls.has(name))continue;try{const r=await fetch(petFilmUrl(name),{signal:AbortSignal.timeout(30000),priority:'low'});if(r.ok){const b=await r.blob();if(b.size>1000)urls.set(name,URL.createObjectURL(b));}}catch{}}}
