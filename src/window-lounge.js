import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {planPoint} from './house-layout.js';
import {Cinema} from './cinema.js';

// September 13 reference photos: both seats face east, the bay is behind them.
export function buildWindowLounge(world,root,m){
 const at=(name,px,pz,y=.75,yaw=0)=>{const g=new THREE.Group(),[x,z]=planPoint(px,pz);g.name=name;g.position.set(x,y,z);g.rotation.y=yaw;root.add(g);return g;};
 const box=(g,w,h,d,x,y,z,key)=>world.box(w,h,d,x,y,z,m[key],g);
 const soft=(g,w,h,d,x,y,z,key)=>{const o=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,.045),m[key]);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
 const cyl=(g,r,rb,h,x,y,z,key,n=20)=>world.cyl(r,rb,h,x,y,z,m[key],g,n);
 const ball=(g,r,x,y,z,key,sx=1,sy=1,sz=1)=>world.sphere(r,x,y,z,m[key],g,sx,sy,sz);
 const rod=(g,a,b,r,key)=>{const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va),p=va.add(vb).multiplyScalar(.5),o=cyl(g,r,r,d.length(),p.x,p.y,p.z,key,10);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;};
 const block=(g,w,d,top)=>world.colliders.push({x:g.position.x,z:g.position.z,w,d,angle:g.rotation.y,...(top===undefined?{}:{top:g.position.y+top,landable:true}),label:g.name});
 m.loungeFabric=world.mat(0x8a8986,.94);m.loungeFabric.userData.textureMeters=.16;
 m.popcornRed=world.mat(0xa92724,.35);
 const sofa=at('Window lounge sofa',341,271,.75,Math.PI/2);
 for(const x of [-1.08,1.08])for(const z of [-.36,.36])rod(sofa,[x,.04,z],[x*.96,.24,z],.014,'steel');
 soft(sofa,2.44,.23,.98,0,.3,0,'loungeFabric');
 for(const x of [-.58,.58]){soft(sofa,1.12,.20,.83,x,.47,.04,'loungeFabric');soft(sofa,1.14,.69,.19,x,.8,-.4,'loungeFabric').rotation.x=-.1;}
 for(const x of [-1.19,1.19])soft(sofa,.16,.47,.98,x,.52,0,'loungeFabric');
 soft(sofa,.55,.18,.43,-.72,.65,.02,'blue').rotation.y=.18;
 // Gentle cloth folds on the throw; geometry also catches side-light from the bay.
 const cloth=new THREE.PlaneGeometry(1.45,.76,28,20),p=cloth.attributes.position;
 for(let i=0;i<p.count;i++)p.setZ(i,.025*Math.sin(p.getX(i)*23+p.getY(i)*13)+.05*Math.sin(p.getY(i)*9));
 cloth.computeVertexNormals();cloth.rotateX(-Math.PI/2);const throwMesh=new THREE.Mesh(cloth,m.cream);throwMesh.position.set(.22,.60,.05);sofa.add(throwMesh);block(sofa,2.48,1.02,.58);
 const chair=at('Window lounge chair',353,345,.75,Math.PI/2);
 cyl(chair,.04,.06,.36,0,.2,0,'steel');for(let i=0;i<5;i++){const a=i*Math.PI*2/5;rod(chair,[0,.17,0],[Math.cos(a)*.43,.055,Math.sin(a)*.43],.019,'steel');}
 soft(chair,.86,.1,.80,0,.40,0,'oak');soft(chair,.81,.17,.76,0,.47,.02,'black');
 soft(chair,.83,.73,.1,0,.87,-.32,'oak').rotation.x=-.22;soft(chair,.79,.66,.13,0,.89,-.26,'black').rotation.x=-.22;
 soft(chair,.69,.23,.15,0,1.19,-.33,'black').rotation.x=-.22;
 for(const x of [-.43,.43]){rod(chair,[x,.44,-.1],[x,.65,.1],.022,'steel');soft(chair,.17,.09,.54,x,.69,.06,'black');}
 soft(chair,.55,.52,.16,.04,.87,-.10,'walnut').rotation.z=.1;block(chair,1.01,.94,.56);
 const ottoman=at('Window lounge ottoman',390,345,.75,Math.PI/2);
 cyl(ottoman,.033,.04,.27,0,.17,0,'steel');for(const x of [-.32,.32])for(const z of [-.23,.23])rod(ottoman,[0,.2,0],[x,.05,z],.016,'steel');
 soft(ottoman,.76,.09,.61,0,.33,0,'oak');soft(ottoman,.76,.18,.61,0,.43,0,'black');soft(ottoman,.65,.11,.5,0,.56,0,'cream');block(ottoman,.79,.64,.53);
 const screen=at('Projection screen',515,293,2.32,-Math.PI/2);
 box(screen,3.82,1.92,.09,0,0,0,'black');
 const console=at('Cinema media cabinet',508,293,.75,-Math.PI/2);
 box(console,3.82,.5,.52,0,.25,0,'oak');for(let i=0;i<6;i++)box(console,.617,.46,.025,-1.91+(i+.5)*3.82/6,.25,.273,'oak');block(console,3.84,.57,.51);
 for(let i=0;i<10;i++)for(let j=0;j<2+i%3;j++)box(console,.16,.014,.13,-1.63+i*.28,.512+j*.016,.04,i%3===0?'blue':j%2?'cream':'black');
 for(const x of [-1.72,1.72]){ball(console,.095,x,.64,.03,'cream',1,1.3,.8);ball(console,.034,x-.033,.67,.108,'black');ball(console,.034,x+.033,.67,.108,'black');}
 const coffee=at('Lounge glass coffee table',395,278,.75,Math.PI/2);
 box(coffee,2.05,.012,2.75,.13,.008,.35,'cream');
 for(const x of [-.38,.38])soft(coffee,.13,.32,.57,x,.18,0,'walnut').rotation.y=x>0?.42:-.42;
 soft(coffee,1.38,.025,.86,0,.365,0,'glass');box(coffee,.23,.016,.18,.2,.393,.03,'blue');cyl(coffee,.051,.05,.17,-.23,.46,0,'teal');block(coffee,1.41,.9,.38);
 // Teal-green fitted cabinets wrap around the actual chamfered window walls.
 const cabinetRun=(name,a,b,depth=.34)=>{const pa=planPoint(...a),pb=planPoint(...b),len=Math.hypot(pb[0]-pa[0],pb[1]-pa[1]),yaw=-Math.atan2(pb[1]-pa[1],pb[0]-pa[0]);
  const g=at(name,(a[0]+b[0])/2,(a[1]+b[1])/2,.75,yaw);box(g,len,.80,depth,0,.40,0,'teal');box(g,len+.014,.04,depth+.025,0,.82,0,'teal');
  const n=Math.round(len/.58);for(let i=0;i<n;i++)box(g,len/n-.012,.75,.022,-len/2+(i+.5)*len/n,.40,depth/2+.009,'teal');block(g,len,depth+.04);return g;};
 cabinetRun('Bay west cabinetry',[307,329],[307,235]);cabinetRun('Bay angled cabinetry',[309,237],[354,191]);cabinetRun('Bay north cabinetry',[354,189],[445,189]);cabinetRun('Bay northeast cabinetry',[446,191],[473,217]);
 const cabinet=cabinetRun('Cinema green display cabinet',[419,387],[339,387],.42);
 // Red glass popcorn maker and a striped popcorn plush above it.
 const maker=new THREE.Group();maker.name='Popcorn machine';maker.position.set(.48,.84,0);cabinet.add(maker);
 soft(maker,.47,.06,.38,0,.03,0,'popcornRed');soft(maker,.49,.10,.39,0,.61,0,'popcornRed');
 for(const x of [-.21,.21])for(const z of [-.17,.17])box(maker,.022,.51,.022,x,.315,z,'steel');
 for(const x of [-.217,.217])box(maker,.012,.48,.32,x,.32,0,'glass');box(maker,.42,.48,.012,0,.32,.174,'glass');box(maker,.03,.10,.035,.16,.30,.20,'popcornRed');
 cyl(maker,.105,.105,.13,0,.40,0,'steel');cyl(maker,.11,.11,.014,0,.473,0,'black');rod(maker,[0,.50,0],[0,.55,0],.014,'steel');
 for(let i=0;i<25;i++)ball(maker,.021,Math.sin(i*7.1)*.17,.08+i%3*.026,Math.cos(i*2.4)*.12,'cream');
 cyl(maker,.115,.083,.19,0,.76,0,'white');for(let i=0;i<12;i++){const a=i*Math.PI/6;rod(maker,[Math.sin(a)*.085,.67,Math.cos(a)*.085],[Math.sin(a)*.116,.85,Math.cos(a)*.116],.010,'popcornRed');}
 for(let i=0;i<15;i++)ball(maker,.033,Math.sin(i*2.4)*.09,.87+i%3*.021,Math.cos(i*2.4)*.08,'cream');
 for(const x of [-.035,.035])ball(maker,.011,x,.77,.107,'black');
 const toy=new THREE.Group();toy.position.set(-.12,.84,.04);cabinet.add(toy);ball(toy,.093,0,.13,0,'sage',1.2,.8,.9);for(const x of [-.052,0,.052]){ball(toy,.028,x,.155,.071,'white');ball(toy,.012,x,.155,.094,'black');}cyl(toy,.07,.075,.12,0,.04,0,'blue');rod(toy,[0,.18,0],[0,.24,0],.008,'sage');ball(toy,.021,0,.25,0,'sage');
 cyl(cabinet,.086,.086,.027,-.49,.86,0,'oak');cyl(cabinet,.035,.035,.07,-.49,.91,0,'steel');ball(cabinet,.040,-.49,.97,0,'white');cyl(cabinet,.075,.075,.25,-.49,.977,0,'glass');
 // A framed, muted cinema print on the display wall, mounted clear of plaster.
 const poster=at('Cinema wall print',372,393,2.32,Math.PI);box(poster,.75,1.1,.045,0,0,0,'black');box(poster,.68,1.03,.012,0,0,.03,'walnut');
 for(let i=0;i<11;i++){const o=ball(poster,.10,Math.sin(i*2.4)*.22,-.42+i*.068,.045,i%2?'cream':'oak',1,.45,.08);o.rotation.z=i*.17;}
 ball(poster,.105,.04,.10,.057,'cream',.7,1.1,.09);soft(poster,.26,.36,.015,.1,-.16,.06,'popcornRed');
 const scope=at('Outward-facing telescope',415,218,.75,Math.PI);
 const legs=[[.44,.03,.3],[-.44,.03,.3],[0,.03,-.45]];
 for(const end of legs){rod(scope,[0,1.08,0],end,.034,'oak');rod(scope,[0,.43,0],[end[0]*.72,.31,end[2]*.72],.014,'black');ball(scope,.038,...end,'black');}
 cyl(scope,.11,.12,.19,0,1.10,0,'black');cyl(scope,.045,.055,.22,0,1.29,0,'steel');
 const optics=new THREE.Group();optics.rotation.x=-.1;optics.position.y=1.44;scope.add(optics);
 for(const [x,r,len,key] of [[0,.104,.78,'cream'],[-.20,.056,.64,'black'],[0,.035,.34,'cream']]){
  const y=x===0&&r<.05?.15:0,z=r<.05?-.04:.04,tube=cyl(optics,r,r,len,x,y,z,key);tube.rotation.x=Math.PI/2;
  const lens=cyl(optics,r*.91,r*.91,.018,x,y,z+len/2+.012,'blue');lens.rotation.x=Math.PI/2;
  for(const zz of [z-len/2+.09,z+len/2-.035]){const collar=cyl(optics,r*1.06,r*1.06,.026,x,y,zz,'steel');collar.rotation.x=Math.PI/2;}
 }
 rod(optics,[0,0,-.39],[0,.05,-.53],.034,'black');block(scope,.95,.98);
 const projector=at('Ceiling projector',339,273,3.19,Math.PI/2);soft(projector,.43,.17,.55,0,0,0,'black');cyl(projector,.035,.035,.21,0,.16,0,'steel');const lens=cyl(projector,.072,.072,.05,0,0,.3,'blue');lens.rotation.x=Math.PI/2;
 const ceiling=at('Circular cinema ceiling',405,289,3.51);const ring=new THREE.Mesh(new THREE.RingGeometry(1.2,1.79,80),m.black);ring.rotation.x=Math.PI/2;ceiling.add(ring);
 world.cinema=new Cinema(world,screen);
 world.windowLounge={sofa,chair,ottoman,screen,telescope:scope};
}
