import * as THREE from 'three';
import {planPoint,PLAN_SCALE} from './house-layout.js';

export function buildEntranceNook(world,root,m){
 // Follow the east wall and its 45-degree turn from the plan. The photos show
 // the as-built full-height joinery: open window niche, cupboard, angled bank.
 // All fronts are 450 mm from the inside wall face; the existing plaster end
 // return extends another 90 mm into the entrance.
 const depth=.45,height=2.495,wall=.08,[east,north]=planPoint(984,642);
 const backX=east-wall,frontX=backX-depth,startZ=north+wall;
 const diagonalSum=planPoint(984,691).reduce((a,b)=>a+b),backSum=diagonalSum-wall*Math.SQRT2,frontSum=diagonalSum-(wall+depth)*Math.SQRT2;
 const frontCorner=new THREE.Vector2(frontX,frontSum-frontX),backCorner=new THREE.Vector2(backX,backSum-backX);
 const endDifference=(925-881-750+789)/PLAN_SCALE+wall*Math.SQRT2;
 const frontEnd=new THREE.Vector2((frontSum+endDifference)/2,(frontSum-endDifference)/2),backEnd=new THREE.Vector2((backSum+endDifference)/2,(backSum-endDifference)/2);
 const straightWidth=frontCorner.y-startZ,nicheWidth=.50;
 const g=new THREE.Group(),x=frontX,z=startZ+nicheWidth/2;g.position.set(x,.45,z);g.rotation.y=-Math.PI/2;g.name='Recessed bonsai nook with window backing';root.add(g);
 const box=(w,h,d,x,y,z,mat=m.oak)=>world.box(w,h,d,x,y,z,mat,g);
 // Local +Z faces west, into the apartment. Z=0 is the shared cabinet front.
 box(nicheWidth,.68,depth-.02,0,.34,-depth/2-.01);
 const lowerDoor=box(nicheWidth-.025,.66,.018,0,.34,-.009);lowerDoor.name='Nook lower cupboard front';
 box(nicheWidth,.025,depth,0,.696,-depth/2);
 for(const xx of [-nicheWidth/2+.01,nicheWidth/2-.01])box(.02,2.10,depth,xx,1.05,-depth/2);
 const closedWidth=straightWidth-nicheWidth,closedCenter=nicheWidth/2+closedWidth/2;
 box(closedWidth,2.10,depth-.025,closedCenter,1.05,-depth/2-.0125);
 const straightDoor=box(closedWidth-.012,2.075,.018,closedCenter,1.0475,-.009);straightDoor.name='Shoe cupboard front beside nook';
 box(.012,.30,.009,nicheWidth/2+.017,.98,.004,m.walnut);
 // A continuous grille caps both the recess and its neighbouring cupboard.
 const headerCenter=(straightWidth-nicheWidth)/2;
 box(straightWidth,.025,depth,headerCenter,2.11,-depth/2);
 box(straightWidth-.025,.33,.018,headerCenter,2.30,-.038,m.black);
 for(let i=0;i<8;i++)box(straightWidth-.025,.018,.035,headerCenter,2.145+i*.042,-.0175);
 box(straightWidth,.026,depth,headerCenter,height-.013,-depth/2);
 for(const xx of [-nicheWidth/2+.01,straightWidth-nicheWidth/2-.01])box(.02,.37,depth,xx,2.2975,-depth/2);
 // Timber reveals frame the real W03 glazing behind the open niche.
 for(const xx of [-.226,.226])box(.028,1.29,.035,xx,1.365,-depth+.0175);
 for(const yy of [.726,2.005])box(.45,.028,.035,0,yy,-depth+.0175);
 box(.46,.11,.035,0,2.06,-depth+.0175);
 const bark=world.mat(0x746951,.9),leaves=world.mat(0x345b2c,.97),tree=new THREE.Group();tree.position.set(-.07,.713,-.24);tree.name='Bonsai inside entrance recess';g.add(tree);
 world.box(.20,.025,.16,0,.012,0,bark,tree);
 const branch=points=>{const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),14,.012,7,false),bark);tree.add(mesh);};
 branch([[0,.015,0],[-.07,.14,0],[.015,.25,.015],[-.035,.39,0],[.015,.56,0]]);
 for(let i=0;i<7;i++){const y=.21+i*.045,side=i%2?1:-1,xx=side*(.065+(i%3)*.02);branch([[0,y-.06,0],[xx*.5,y,0],[xx,y+.035,.015]]);world.sphere(.067,xx,y+.055,.015,leaves,tree,1.1,.55,.8);}
 world.sphere(.062,.015,.585,0,leaves,tree,1,.6,.9);
 const camera=new THREE.Group();camera.position.set(.14,.735,-.15);camera.name='Camera inside entrance recess';g.add(camera);world.sphere(.041,0,.09,0,m.white,camera,.7,1,.75);world.sphere(.015,0,.096,.03,m.black,camera,1,1,.2);
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3,rod=world.cyl(.006,.006,.095,Math.cos(a)*.031,.035,Math.sin(a)*.031,m.black,camera,8);rod.rotation.z=Math.cos(a)*.5;rod.rotation.x=Math.sin(a)*.5;}
 // Mitred carcass fills the corner without overlapping independent cabinets.
 const shape=new THREE.Shape(),normal=new THREE.Vector2(-Math.SQRT1_2,-Math.SQRT1_2);
 const inset=p=>p.clone().addScaledVector(normal,-.022);
 const points=[inset(frontCorner),inset(frontEnd),backEnd,backCorner,new THREE.Vector2(backX,frontCorner.y)];shape.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))shape.lineTo(p.x,p.y);shape.closePath();
 const body=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false}),m.oak);body.rotation.x=Math.PI/2;body.position.y=.45+height;body.name='Fitted angled shoe cabinet carcass';root.add(body);
 const length=frontCorner.distanceTo(frontEnd),angle=-Math.PI*3/4,bank=new THREE.Group();bank.name='Angled shoe cabinet doors';bank.position.set((frontCorner.x+frontEnd.x)/2,.45,(frontCorner.y+frontEnd.y)/2);bank.rotation.y=angle;root.add(bank);
 for(let i=0;i<3;i++){const xx=(i-1)*length/3;world.box(length/3-.008,height-.025,.018,xx,height/2,-.009,m.oak,bank);world.box(.012,.7,.012,xx+length/6-.035,.83,.006,m.walnut,bank);}
 // The straight run and diagonal share the same front corner and wall depth.
 world.colliders.push({x:(frontX+backX)/2,z:startZ+straightWidth/2,w:straightWidth,d:depth,angle:-Math.PI/2,label:'Straight entrance shoe cabinets and recessed window'});
 world.colliders.push({x:bank.position.x-normal.x*depth/2,z:bank.position.z-normal.y*depth/2,w:length,d:depth,angle,label:'Fitted diagonal shoe cabinets'});
 world.entranceJoinery={frontX,backX,startZ,frontCorner,frontEnd,straightWidth,depth,nicheWidth};world.entranceNook=g;
}
