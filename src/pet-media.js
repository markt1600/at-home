const files={sunny:['leo','leo-walk','leo-walk-front','leo-walk-back','leo-sleep','leo-overhead','leo-overhead-idle'],miso:['miso-orange','miso-walk','miso-walk-front','miso-walk-back','miso-sleep','miso-overhead','miso-overhead-idle'],pebble:['pebble','pebble-walk','pebble-walk-front','pebble-walk-back','pebble-overhead','pebble-overhead-idle']};
const urls=new Map();
export const petPlayFilms=['play','play-front','play-back','play-overhead'];
export const petActivityFilms={sunny:['chew','chew-overhead',...petPlayFilms],miso:['groom','groom-overhead','lounge','lounge-overhead',...petPlayFilms],pebble:[]};
export const petCarryFilms=['carry','carry-front','carry-back','carry-overhead'];
export const petFilmUrl=name=>urls.get(name)||`/art/motion/compact/${name}.mp4`;
// Only the two films every pet needs at first sight (resting and walking, seen
// from the side) are fetched before the house opens. The other viewing angles
// follow in the background, nearest pet first; until one arrives the actor
// keeps showing the view it has. Object URLs avoid a second transfer when a
// mobile browser starts a video decoder.
export const essentialPetFilms=id=>files[id].slice(0,2);
async function fetchFilm(name,options={}){
 if(urls.has(name))return;
 const response=await fetch(petFilmUrl(name),{signal:AbortSignal.timeout(30000),...options});
 if(!response.ok)throw new Error('Pet film unavailable');
 const blob=await response.blob();if(blob.size<1000)throw new Error('Incomplete pet film');
 urls.set(name,URL.createObjectURL(blob));
}
export async function preloadPetFilms(id){for(const name of essentialPetFilms(id))await fetchFilm(name);}
// After the house opens: the remaining angles, then the optional activities.
export async function warmPetFilms(ids){
 for(const id of ids)for(const name of files[id].slice(2))try{await fetchFilm(name,{priority:'low'});}catch{/* It streams on demand instead. */}
 for(const id of ids)await preloadPetActivities(id);
}
// Optional activities warm after the essential views. They never delay Start.
export async function preloadPetActivities(id){for(const mode of [...(petActivityFilms[id]||[]),...(id==='sunny'?petCarryFilms:[])]){const name=`${id==='sunny'?'leo':id}-${mode}`;if(urls.has(name))continue;try{const r=await fetch(petFilmUrl(name),{signal:AbortSignal.timeout(30000),priority:'low'});if(r.ok){const b=await r.blob();if(b.size>1000)urls.set(name,URL.createObjectURL(b));}}catch{}}}
