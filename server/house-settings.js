// House-wide switches the editor sets and every visitor's game reads. They live
// in the private store beside the memories, so they hold across devices and games.
export const HOUSE_SETTINGS_PATH='settings/house.json';
export const DEFAULT_HOUSE_SETTINGS={christmas:false};
export function cleanHouseSettings(input){
 if(!input||typeof input!=='object')throw Error('Settings must be an object');
 const out={};
 if('christmas' in input){if(typeof input.christmas!=='boolean')throw Error('christmas must be true or false');out.christmas=input.christmas;}
 return out;
}
