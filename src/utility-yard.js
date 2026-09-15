import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {planPoint} from './house-layout.js';

// Current contents follow the walkthrough at 91–119 s, rather than the proposed
// bed on the old service-room drawing. All furnishings remain in static batches.
export function buildUtilityYard(world,root,m){
 // Satin finishes retain their grey appearance without an environment map.
 const charcoal=world.mat(0x555b5e,.48,.10),satin=world.mat(0x9fa4a3,.45,.12);
 const at=(name,px,pz,y=.45,yaw=0)=>{const g=new THREE.Group(),[x,z]=planPoint(px,pz);g.name=name;g.position.set(x,y,z);g.rotation.y=yaw;root.add(g);return g;};
 const group=(parent,name,x=0,y=0,z=0)=>{const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;};
 const box=(g,w,h,d,x,y,z,mat=m.white)=>world.box(w,h,d,x,y,z,mat,g);
 const cyl=(g,rt,rb,h,x,y,z,mat=m.steel,n=16)=>world.cyl(rt,rb,h,x,y,z,mat,g,n);
 const soft=(g,w,h,d,x,y,z,mat=m.white,r=.018)=>{const o=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/4,h/4,d/4)),mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
 const rod=(g,a,b,r=.008,mat=m.steel)=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start),mid=start.add(end).multiplyScalar(.5),o=cyl(g,r,r,delta.length(),...mid.toArray(),mat,8);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;};
 const ring=(g,r,t,x,y,z,mat=m.steel)=>{const mesh=new THREE.Mesh(new THREE.TorusGeometry(r,t,6,32),mat);mesh.position.set(x,y,z);g.add(mesh);return mesh;};
 const disc=(g,r,d,x,y,z,mat=m.steel)=>{const o=cyl(g,r,r,d,x,y,z,mat,24);o.rotation.x=Math.PI/2;return o;};
 const footprint=(g,w,d,top)=>world.colliders.push({x:g.position.x,z:g.position.z,w,d,angle:g.rotation.y,label:g.name,top:g.position.y+top});
 const bottle=(g,x,y,z,h=.22,color=m.white)=>{cyl(g,.036,.038,h*.78,x,y+h*.39,z,color);cyl(g,.014,.024,h*.16,x,y+h*.85,z,color);cyl(g,.016,.016,.018,x,y+h-.004,z,m.black);box(g,.045,h*.28,.003,x,y+h*.40,z+.037,m.cream);};

 const laundry=at('Stacked grey washer and dryer',706,933,.45,Math.PI);
 for(let i=0;i<2;i++){
  const unit=group(laundry,i?'Grey dryer':'Grey washing machine',0,i*.85,0);
  soft(unit,.60,.835,.61,0,.4275,0,charcoal,.015);
  box(unit,.574,.11,.018,0,.766,.310,m.black);
  disc(unit,.029,.019,.213,.767,.327,m.steel);box(unit,.19,.039,.006,-.045,.763,.324,m.black);
  for(let j=0;j<3;j++)box(unit,.026,.004,.002,-.10+j*.04,.771,.329,m.white);
  box(unit,.055,.006,.002,-.215,.783,.325,m.white);
  disc(unit,.228,.030,0,.405,.326,satin);disc(unit,.205,.036,0,.405,.347,m.black);
  ring(unit,.186,.009,0,.405,.368,charcoal);ring(unit,.158,.004,0,.405,.370,m.steel);
  // A restrained drum rim and crescent reflection inside the dark round door.
  const glint=new THREE.Mesh(new THREE.TorusGeometry(.165,.003,5,22,Math.PI*.65),m.steel);glint.position.set(0,.405,.372);glint.rotation.z=.25;unit.add(glint);
  soft(unit,.028,.11,.027,.199,.405,.375,charcoal,.009);
  box(unit,.54,.024,.015,0,.054,.313,m.black);
  if(!i)box(unit,.12,.062,.010,.19,.108,.317,charcoal);
 }
 footprint(laundry,.63,.66,1.70);

 const counter=at('Utility sink counter and small appliances',752,933,.45,Math.PI);
 // Open carcass: the steel sink is recessed, with no solid top passing through it.
 box(counter,1.70,.045,.55,0,.0225,0,m.cream);box(counter,1.70,.79,.025,0,.435,-.275);
 for(const x of [-.835,.21,.835])box(counter,.03,.85,.58,x,.46,0);
 for(const y of [.267,.661])soft(counter,1.018,.377,.025,-.315,y,.301,m.white,.003);
 for(const [x,w] of [[-.8225,.055],[.3125,1.075]])box(counter,w,.035,.60,x,.8825,0);
 for(const z of [-.263,.263])box(counter,.54,.035,.075,-.50,.8825,z);
 box(counter,.49,.018,.37,-.50,.718,0,satin);
 for(const x of [-.755,-.245])box(counter,.018,.168,.39,x,.801,0,satin);
 for(const z of [-.19,.19])box(counter,.51,.168,.018,-.50,.801,z,satin);
 cyl(counter,.026,.026,.006,-.50,.732,0,m.black);
 rod(counter,[-.50,.9,-.235],[-.50,1.20,-.235],.013);rod(counter,[-.50,1.20,-.235],[-.50,1.20,-.08],.013);rod(counter,[-.50,1.20,-.08],[-.50,1.16,-.08],.013);
 const cooler=group(counter,'Under-counter utility appliance',.52,.065,0);
 soft(cooler,.53,.76,.55,0,.38,0,satin);box(cooler,.485,.33,.012,0,.578,.281,charcoal);box(cooler,.19,.014,.025,0,.729,.293,m.black);
 box(cooler,.48,.315,.015,0,.208,.283,m.white);
 for(let i=0;i<12;i++)box(cooler,.32,.007,.006,.055,.083+i*.020,.294,charcoal);
 box(cooler,.057,.068,.009,-.16,.256,.298,m.black);
 const blender=group(counter,'Blender and countertop containers',-.10,.90,-.12);
 soft(blender,.19,.20,.20,0,.10,0,m.black);cyl(blender,.061,.057,.195,0,.294,0,m.steel);cyl(blender,.069,.069,.018,0,.40,0,m.black);
 const cooker=group(counter,'Small utility cooker',.45,.90,-.035);
 soft(cooker,.24,.23,.23,0,.115,0,charcoal,.04);soft(cooker,.25,.037,.24,0,.251,0,m.black);box(cooker,.092,.053,.008,0,.115,.121,m.black);
 bottle(counter,-.77,.90,-.20,.20,m.white);bottle(counter,-.29,.90,-.21,.17,m.teal);
 box(counter,.56,.024,.085,.02,.916,.19,m.teal);box(counter,.08,.006,.079,.21,.931,.19,m.white);
 const shelving=group(counter,'Laundry cupboards and open supply shelf');
 box(shelving,2.31,.93,.45,.34,2.265,-.06);
 for(let i=0;i<4;i++)box(shelving,.008,.89,.005,-.78+i*.56,2.265,.168,m.cream);
 box(shelving,1.70,.03,.33,0,1.44,-.12);box(shelving,1.70,.33,.023,0,1.62,-.271);
 for(let i=0;i<10;i++){const x=-.75+i*.157,h=.18+(i%3)*.046;
  if(i%3===0)box(shelving,.12,h,.14,x,1.455+h/2,-.115,[m.white,m.cream,m.teal][i%3]);
  else bottle(shelving,x,1.455,-.11,h,[m.white,m.teal,m.blue][i%3]);
 }
 footprint(counter,1.73,.64,.90);

 // The rectangular stainless hatch is the rubbish chute on the yard's west recess.
 const chute=at('Stainless rubbish chute',670,931,1.51,Math.PI);
 box(chute,.55,.50,.027,0,0,0,satin);box(chute,.48,.43,.014,0,0,.022,charcoal);
 box(chute,.447,.396,.018,0,-.009,.035,satin);soft(chute,.086,.04,.026,0,.129,.060,charcoal,.006);
 const bin=at('Utility waste bin below the chute',670,925);
 soft(bin,.29,.40,.33,0,.20,0,m.white,.045);soft(bin,.31,.044,.35,0,.416,0,m.white,.02);box(bin,.09,.026,.017,0,.415,.183,m.cream);footprint(bin,.34,.38,.44);

 const rack=at('Yard household-supply rack',770,866);
 for(const x of [-.80,.80])for(const z of [-.16,.16])rod(rack,[x,0,z],[x,2.15,z],.012,m.black);
 for(let j=0;j<5;j++){
  const y=.08+j*.44;box(rack,1.64,.022,.35,0,y,0,m.black);
  for(let i=0;i<6;i++){const x=-.66+i*.258,h=.19+(i%3)*.06,mat=[m.cream,m.white,m.teal,m.blue,m.orange,m.oak][(i+j)%6];
   soft(rack,.205,h,.27,x,y+.013+h/2,0,mat,.012);box(rack,.15,.08,.003,x,y+.09,.138,m.white);
  }
 }
 footprint(rack,1.69,.38,2.15);

 const drying=at('Ceiling drying rails and hanging laundry',738,895);
 for(const z of [-.20,.20])rod(drying,[-.67,2.43,z],[.67,2.43,z],.012);
 for(const x of [-.62,.62])for(const z of [-.20,.20])rod(drying,[x,2.43,z],[x,2.90,z],.008);
 for(let i=0;i<5;i++){
  const x=-.49+i*.245,z=i%2?.19:-.19,y=2.37;
  rod(drying,[x,y+.07,z],[x,y-.02,z],.004);rod(drying,[x-.15,y-.11,z],[x,y-.02,z],.004);rod(drying,[x,y-.02,z],[x+.15,y-.11,z],.004);rod(drying,[x-.15,y-.11,z],[x+.15,y-.11,z],.004);
  const cloth=group(drying,'Hanging laundry '+i,x,y-.11,z);
  soft(cloth,.25,.49,.025,0,-.235,0,[m.white,m.cream,m.blue][i%3],.006);
  for(const side of [-1,1]){const sleeve=soft(cloth,.10,.18,.025,side*.155,-.06,0,[m.white,m.cream,m.blue][i%3],.005);sleeve.rotation.z=side*.4;}
 }

 // The attached room is used for a spare fridge, bikes and household storage.
 const fridge=at('Grey spare fridge in storage room',731,802,.45,-Math.PI/2);
 soft(fridge,.66,1.85,.68,0,.945,0,satin,.018);box(fridge,.62,1.78,.025,0,.96,.352,satin);
 box(fridge,.035,1.72,.012,0,.96,.371,charcoal);soft(fridge,.028,.50,.045,-.08,1.02,.397,charcoal,.009);
 box(fridge,.055,.22,.007,.14,1.47,.372,m.black);box(fridge,.02,.006,.003,.14,1.50,.378,m.white);
 box(fridge,.075,.095,.003,.215,1.69,.374,m.blue);box(fridge,.06,.052,.003,.215,1.58,.374,m.white);footprint(fridge,.69,.74,1.89);
 function bicycle(name,px,pz,base,yaw,color,mounted=false){
  const g=at(name,px,pz,base,yaw),rear=[-.52,.34,0],front=[.52,.34,0],crank=[-.10,.30,0],seat=[-.25,.80,0],steer=[.37,.79,0];
  for(const wheel of [rear,front]){
   ring(g,.30,.019,...wheel,m.black);ring(g,.275,.006,...wheel,m.steel);disc(g,.033,.10,...wheel,m.steel);
   for(let i=0;i<12;i++){const a=i*Math.PI/6;rod(g,[wheel[0],wheel[1],.005],[wheel[0]+Math.cos(a)*.273,wheel[1]+Math.sin(a)*.273,.005],.002,m.steel);}
  }
  for(const [a,b] of [[rear,seat],[rear,crank],[crank,seat],[seat,steer],[crank,steer],[steer,front]])rod(g,a,b,.017,color);
  rod(g,seat,[-.27,.88,0],.012);soft(g,.21,.041,.105,-.27,.888,0,m.black,.015);
  rod(g,steer,[.40,.90,0],.011);rod(g,[.40,.90,-.16],[.40,.90,.16],.013,m.black);
  for(const z of [-.16,.16]){rod(g,[.40,.90,z],[.48,.87,z],.013,m.black);rod(g,[.48,.87,z],[.46,.78,z],.013,m.black);}
  ring(g,.08,.008,...crank,m.steel);rod(g,[-.52,.34,.055],[-.1,.30,.055],.008,m.black);
  for(const sign of [-1,1]){rod(g,[-.10,.30,sign*.03],[-.1+sign*.10,.30-sign*.085,sign*.10],.007);box(g,.07,.025,.06,-.1+sign*.10,.30-sign*.085,sign*.12,m.black);}
  if(mounted){for(const x of [-.38,.28]){rod(g,[x,.64,-.01],[x,.64,-.15],.013,m.black);box(g,.075,.11,.02,x,.64,-.16,m.black);}}
  else{rod(g,[-.10,.30,0],[-.18,.025,.20],.008,m.black);footprint(g,1.70,.38,.94);}
  return g;
 }
 bicycle('Wall-mounted black road bicycle',782,792,1.58,0,m.black,true);
 bicycle('Dark floor bicycle',782,800,.45,0,m.teal);
 bicycle('Red road bicycle on floor stand',816,821,.45,Math.PI/2,m.orange);

 const goods=at('Storage-room boxes and folded chairs',770,848);
 box(goods,1.36,.018,.32,0,.009,0,m.oak);
 for(let i=0;i<4;i++){
  const x=-.48+i*.32,h=.24+(i%3)*.16;box(goods,.285,h,.31,x,.02+h/2,0,i%2?m.cream:m.oak);
  box(goods,.15,.065,.004,x,.12,.158,m.white);box(goods,.025,h,.004,x,.02+h/2,.159,m.cream);
 }
 for(let i=0;i<3;i++){
  const chair=group(goods,'Folded wooden chair '+i,.47+i*.045,.12,-.025);chair.rotation.x=-.17;
  for(const x of [-.16,.16])rod(chair,[x,0,.10],[x,.88,0],.019,m.oak);
  for(let j=0;j<7;j++)box(chair,.30,.07,.022,0,.31+j*.075,0,m.oak);
 }
 const tote=group(goods,'Reusable storage bag',-.22,.31,0);soft(tote,.30,.30,.22,0,.15,0,m.cream,.025);
 for(const z of [-.09,.09]){rod(tote,[-.08,.29,z],[-.07,.43,z],.009,m.oak);rod(tote,[-.07,.43,z],[.07,.43,z],.009,m.oak);rod(tote,[.07,.43,z],[.08,.29,z],.009,m.oak);}
 footprint(goods,1.46,.37,1.12);
}
