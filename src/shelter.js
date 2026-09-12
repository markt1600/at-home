import {planPoint,floorHeight} from './house-layout.js';

// Admission order determines a visible place to wait, never hidden identity.
const PLACES=[
 [372,610,'living','Living room'],[480,643,'living','Living room'],
 [345,820,'dining','Dining room'],[484,768,'dining','Dining room'],
 [423,274,'sunroom','Window lounge'],[410,344,'sunroom','Window lounge'],
 [704,676,'hall','Entrance hall'],[787,686,'hall','Entrance hall'],
 [742,312,'bedroom','Main bedroom'],[731,368,'bedroom','Main bedroom'],
 [982,430,'guest','Second bedroom'],[928,599,'study','Home office']
];
export function shelterLocation(index){const [px,pz,view,label]=PLACES[index%PLACES.length],[x,z]=planPoint(px,pz);return {x,z,y:floorHeight(x,z),view,label};}
