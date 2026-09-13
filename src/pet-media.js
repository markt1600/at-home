const files={sunny:['leo','leo-walk','leo-walk-front','leo-walk-back','leo-sleep','leo-overhead','leo-overhead-idle'],miso:['miso-orange','miso-walk','miso-walk-front','miso-walk-back','miso-sleep','miso-overhead','miso-overhead-idle'],pebble:['pebble','pebble-walk','pebble-walk-front','pebble-walk-back','pebble-overhead','pebble-overhead-idle']};
const urls=new Map();
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
