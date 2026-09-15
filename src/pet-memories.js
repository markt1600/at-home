export const PET_MEMORY_NAMES={miso:'Cyrus',sunny:'Leo',pebble:'Pebble',mops:'Mops'};
export function cleanMemoryPet(value){
 if(value==null||value==='')return null;
 if(!Object.hasOwn(PET_MEMORY_NAMES,value))throw Error('Choose a pet or a spot in the house.');
 return value;
}
export const floorMemories=memories=>memories.filter(m=>!m.petId);
export const memoriesForPet=(memories,id)=>memories.filter(m=>m.petId===id);
