import * as THREE from 'three';
import {planPoint} from './house-layout.js';

export function buildEntranceNook(world,root,m){
 const g=new THREE.Group(),[x,z]=planPoint(956,649);g.position.set(x,.45,z);g.name='Recessed bonsai nook with window backing';root.add(g);
 const box=(w,h,d,x,y,z,mat=m.oak)=>world.box(w,h,d,x,y,z,mat,g);
 // The lower cabinet, side cheeks and top close the recess into the joinery.
 box(.53,.68,.39,0,.34,0);box(.54,.025,.42,0,.696,.01);box(.50,.65,.015,0,.342,.204);
 for(const x of [-.282,.282])box(.035,2.48,.43,x,1.24,0);box(.60,.035,.43,0,2.463,0);
 // Match the real frosted window aperture in the wall, rather than a wall decal.
 for(const x of [-.249,.249])box(.04,1.37,.038,x,1.425,-.16);
 for(const y of [.74,2.11])box(.53,.035,.038,0,y,-.16);
 box(.60,.34,.035,0,2.28,-.15,m.black);for(let i=0;i<8;i++)box(.59,.02,.055,0,2.135+i*.042,-.125);
 const bark=world.mat(0x746951,.9),leaves=world.mat(0x345b2c,.97),tree=new THREE.Group();tree.position.set(-.07,.713,.015);g.add(tree);
 world.box(.20,.025,.16,0,.012,0,bark,tree);
 const branch=points=>{const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),14,.012,7,false),bark);tree.add(mesh);};
 branch([[0,.015,0],[-.07,.14,0],[.015,.25,.015],[-.035,.39,0],[.015,.56,0]]);
 for(let i=0;i<7;i++){const y=.21+i*.045,side=i%2?1:-1,xx=side*(.065+(i%3)*.02);branch([[0,y-.06,0],[xx*.5,y,0],[xx,y+.035,.015]]);world.sphere(.067,xx,y+.055,.015,leaves,tree,1.1,.55,.8);}
 world.sphere(.062,.015,.585,0,leaves,tree,1,.6,.9);
 const camera=new THREE.Group();camera.position.set(.15,.77,.04);g.add(camera);world.sphere(.041,0,.09,0,m.white,camera,.7,1,.75);world.sphere(.015,0,.096,.03,m.black,camera,1,1,.2);
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3,rod=world.cyl(.006,.006,.095,Math.cos(a)*.031,.035,Math.sin(a)*.031,m.black,camera,8);rod.rotation.z=Math.cos(a)*.5;rod.rotation.x=Math.sin(a)*.5;}
 world.colliders.push({x,z,w:.6,d:.43,label:g.name});world.entranceNook=g;
}
