// Special days the editor sets for the house: birthdays, anniversaries and
// other dates that come round every year. Shared by the studio, game and server.
export const DECORATIONS={balloons:'Bright balloons',rose:'Red and pink balloons',gold:'Gold and white balloons'};
export const MAX_OCCASIONS=24;
const validDay=(month,day)=>Number.isInteger(month)&&Number.isInteger(day)&&month>=1&&month<=12&&day>=1&&day<=new Date(2024,month,0).getDate();   // a leap year, so 29 February is allowed
export function cleanOccasions(input){
 if(!Array.isArray(input)||input.length>MAX_OCCASIONS)throw Error(`Add up to ${MAX_OCCASIONS} special days`);
 return input.map(o=>{
  const name=String(o?.name||'').replace(/[\u0000-\u001f<>]/g,' ').trim().slice(0,40),month=Number(o?.month),day=Number(o?.day);
  if(!name)throw Error('Give each special day a name');
  if(!validDay(month,day))throw Error('Choose a real date for each special day');
  if(!Object.hasOwn(DECORATIONS,o.decoration))throw Error('Choose a decoration for each special day');
  return {name,month,day,decoration:o.decoration};
 });
}
// 29 February is celebrated on the 28th in years without one.
export function todaysOccasions(occasions,today=new Date()){
 const month=today.getMonth()+1,day=today.getDate(),leap=new Date(today.getFullYear(),2,0).getDate()===29;
 return (occasions||[]).filter(o=>o.month===month&&(o.day===day||!leap&&month===2&&day===28&&o.day===29));
}
export const occasionDate=o=>new Date(2024,o.month-1,o.day).toLocaleDateString('en-GB',{day:'numeric',month:'long'});
