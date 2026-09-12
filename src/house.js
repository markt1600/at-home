import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {MODEL_ROOMS as HOUSE_ROOMS} from './house-layout.js';

// Original geometry from the walkthrough. Private footage and personal pictures
// are reference only, and are not included in the exported scene or repository.
export function buildHouse(world){
 const root=new THREE.Group();root.name='Walkthrough house';world.scene.add(root);world.houseRoot=root;
 const materials={plaster:world.mat(0xcfc9b9,.93),sage:world.mat(0x78816b,.55),marble:world.mat(0xd1c9b8,.25,.07),oak:world.mat(0x956a40,.58),white:world.mat(0xe1ded0,.8),black:world.mat(0x171a19,.46),steel:world.mat(0x808480,.24,.8),orange:world.mat(0xb74720,.94),cream:world.mat(0xc6bfa8,.96),teal:world.mat(0x315e5b,.65),walnut:world.mat(0x4b3126,.55),blue:world.mat(0x1b293a,.94),glass:new THREE.MeshStandardMaterial({color:0x809da2,roughness:.16,metalness:.18,transparent:true,opacity:.12,side:THREE.DoubleSide})};world.houseMaterials=materials;
 const mat=v=>typeof v==='string'?materials[v]:typeof v==='number'?world.mat(v):v;
 const box=(w,h,d,x,y,z,m='white',p=root)=>world.box(w,h,d,x,y,z,mat(m),p);
 const cyl=(a,b,h,x,y,z,m='white',p=root,n=20)=>world.cyl(a,b,h,x,y,z,mat(m),p,n);
 const sphere=(r,x,y,z,m='white',p=root,sx=1,sy=1,sz=1)=>world.sphere(r,x,y,z,mat(m),p,sx,sy,sz);
 const soft=(w,h,d,x,y,z,m,p=root)=>{const o=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,.06),mat(m));o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;};
 const block=(x,z,w,d)=>world.colliders.push({x,z,w,d});
 const wall=(x0,z0,x1,z1,m='plaster',h=3.05,b=0)=>{const w=Math.max(.15,Math.abs(x1-x0)),d=Math.max(.15,Math.abs(z1-z0)),x=(x0+x1)/2,z=(z0+z1)/2;box(w,h,d,x,b+h/2,z,m);box(w,.1,d+.018,x,b+.05,z,'white');block(x,z,w,d);};
 const light=(x,y,z,color=0xffdca4,power=15,range=9)=>{const l=new THREE.PointLight(color,power,range,2);l.position.set(x,y,z);root.add(l);return l;};
 const down=(x,z,b=0,p=13)=>{cyl(.09,.09,.025,x,b+2.97,z,new THREE.MeshStandardMaterial({color:0xffe5b6,emissive:0xffcf87,emissiveIntensity:1.4}));return light(x,b+2.87,z,0xffdba8,p);};
 const painting=(x,y,z,w,h,c,a=0)=>{const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=a;root.add(g);box(w+.07,h+.07,.04,0,0,0,'walnut',g);box(w,h,.047,0,0,.012,c,g);return g;};
 const cabinet=(x,z,w,h,d,m='sage',a=0,b=0)=>{const g=new THREE.Group();g.position.set(x,b,z);g.rotation.y=a;root.add(g);box(w,h,d,0,h/2,0,m,g);const n=Math.max(1,Math.round(w/.55));for(let i=0;i<n;i++){const dx=-w/2+(i+.5)*w/n;box(w/n-.016,h-.03,.024,dx,h/2,d/2+.008,m,g);box(.012,.13,.025,dx+w/n*.35,h*.45,d/2+.035,'steel',g);}block(x,z,Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*d,Math.abs(Math.cos(a))*d+Math.abs(Math.sin(a))*w);return g;};
 const sofa=(x,z,w,a,m='orange',b=0)=>{const g=new THREE.Group();g.position.set(x,b,z);g.rotation.y=a;root.add(g);soft(w,.26,.98,0,.27,0,m,g);soft(w,.58,.25,0,.65,-.43,m,g);const n=Math.round(w/.7);for(let i=0;i<n;i++)soft(w/n-.025,.2,.72,-w/2+(i+.5)*w/n,.48,.08,m,g);for(const dx of [-w/2+.08,w/2-.08])soft(.19,.37,1.04,dx,.51,0,m,g);for(const [dx,c] of [[-w*.28,'cream'],[w*.22,'blue']]){const p=soft(.44,.43,.16,dx,.79,-.18,c,g);p.rotation.x=-.17;p.rotation.z=dx*.15;}block(x,z,Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*1.03,Math.abs(Math.cos(a))*1.03+Math.abs(Math.sin(a))*w);};
 const chair=(x,z,a,b=0)=>{const g=new THREE.Group();g.position.set(x,b,z);g.rotation.y=a;root.add(g);soft(.5,.09,.49,0,.46,0,'cream',g);soft(.5,.52,.09,0,.74,-.23,'cream',g);for(const u of [-.19,.19])for(const v of [-.18,.18])cyl(.014,.012,.44,u,.22,v,'steel',g);block(x,z,.55,.58);};
 const plant=(x,z,b=0,s=1)=>{cyl(.2*s,.15*s,.35*s,x,b+.175*s,z,'walnut');for(let i=0;i<7;i++){const a=i*2.4,o=sphere(.23*s,x+Math.cos(a)*.2*s,b+.5*s+i*.065*s,z+Math.sin(a)*.2*s,0x273d27,root,.45,1.6,.8);o.rotation.z=Math.sin(a)*.6;}block(x,z,.45*s,.45*s);};
 const shelf=(x,z,w,h,a=0,b=0)=>{const g=new THREE.Group();g.position.set(x,b,z);g.rotation.y=a;root.add(g);box(w,h,.12,0,h/2,-.18,'black',g);for(let j=0;j<6;j++){const y=.1+j*(h-.1)/5;box(w,.035,.42,0,y,0,'walnut',g);for(let i=0;i<Math.floor(w/.13);i++){const v=.14+(i*17+j*7)%11*.01;box(.065+(i%3)*.012,v,.17,-w/2+.1+i*.13,y+v/2+.03,.03,[0x705548,0x343f39,0x7f755b,0x343d53,0x8a4d38][(i+j)%5],g);}}block(x,z,Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*.44,Math.abs(Math.cos(a))*.44+Math.abs(Math.sin(a))*w);};
 for(const r of HOUSE_ROOMS){const timber=['sunroom','bedroom','wardrobe'].includes(r.id);box(r.x1-r.x0,.12,r.z1-r.z0,(r.x0+r.x1)/2,r.floor-.07,(r.z0+r.z1)/2,timber?'oak':'marble');if(r.id!=='balcony')box(r.x1-r.x0,.13,r.z1-r.z0,(r.x0+r.x1)/2,r.floor+3.08,(r.z0+r.z1)/2,'plaster');}
 // Hall, study, store and living-room boundaries, with real doorway gaps.
 for(const a of [[-1.5,0,-1.5,2.3],[-1.5,3.7,-1.5,6.8],[-1.5,8,-1.5,9.4],[1.5,0,1.5,9.4],[-6,1,-1.5,1],[-6,1,-6,5.7],[-6,5.7,-1.5,5.7],[-4.5,6.1,-1.5,6.1],[-4.5,6.1,-4.5,8.8],[-4.5,8.8,-1.5,8.8],[-6,9.4,-1.5,9.4],[1.5,9.4,14.1,9.4]])wall(...a);
 wall(5,9.4,5,11.3,'sage');wall(5,12.7,5,17.4,'sage');
 for(const a of [[-12,-2.4,-6,-2.4],[-12,-2.4,-12,10.3],[-6,-2.4,-6,9.4],[-12,3.3,-10.2,3.3],[-8.6,3.3,-6,3.3],[-12,9.4,-10.2,9.4],[-8.6,9.4,-6,9.4],[-12,17.4,-5.5,17.4]])wall(...a);
 wall(-12,10.3,-12,12.8,'black',.8,.36);wall(-12,14.6,-12,17.4,'black',.8,.36);
 block(-6,10.7,.2,2.6);block(-6,16.15,.2,2.7);for(let i=0;i<3;i++)box(.34,(i+1)*.12,2.8,-5.8-i*.34,(i+1)*.06,13.4,'marble');
 // Glazed raised lounge and its three timber steps.
 for(const a of [[-5.5,17.4,-5.5,22],[5,17.4,5,22],[-5.5,22,5,22]])wall(...a,'teal',.9,.36);
 for(const [x0,x1] of [[-5.5,-2.2],[1.6,5]]){wall(x0,17.4,x1,17.4,'black',.12);box(x1-x0,2.55,.018,(x0+x1)/2,1.58,17.4,'glass');block((x0+x1)/2,17.4,x1-x0,.1);}
 for(let i=0;i<3;i++)box(3.8,(i+1)*.12,.28,-.3,(i+1)*.06,17.25+i*.28,'oak');
 for(let x=-5.3;x<4.8;x+=1.25){box(.045,2.14,.09,x,2.33,22,'black');box(1.21,2.14,.018,x+.625,2.33,22,'glass');}
 for(const x of [-5.5,5])for(let z=18;z<22;z+=1.25){box(.09,2.14,.045,x,2.33,z,'black');box(.018,2.14,1.21,x,2.33,z+.625,'glass');}
 for(const a of [[5,17.4,14.1,17.4],[14.1,9.4,14.1,17.4],[10.6,9.4,10.6,10.4],[10.6,11.7,10.6,14.3],[10.6,15.7,10.6,17.4],[10.6,12.5,14.1,12.5]])wall(...a);
 for(const a of [[-14.2,10.3,-12,10.3],[-14.2,17.4,-12,17.4],[-14.2,10.3,-14.2,17.4]])wall(...a,'teal',1.1,.36);
 for(let z=10.5;z<17.4;z+=1.1)box(.05,1.1,.05,-14.2,.91,z,'steel');
 // Lift lobby and a front door left on its chain, revealing the waiting visitor.
 box(4,.1,3,0,-.06,-1.5,'marble');for(const a of [[-2,-3,2,-3],[-2,-3,-2,0],[2,-3,2,0]])wall(...a);
 box(1.7,2.45,.055,0,1.23,-2.87,'steel');box(.024,2.4,.016,0,1.23,-2.83,'black');box(.18,.25,.025,1.1,1.5,-2.84,'black');box(.05,.04,.02,1.1,1.55,-2.82,new THREE.MeshBasicMaterial({color:0xa9251b}));
 wall(-1.5,0,-.9,0);wall(.9,0,1.5,0);box(1.8,.4,.22,0,2.87,0,'plaster');for(const x of [-.89,.89])box(.08,2.68,.18,x,1.34,0,'walnut');
 world.door=new THREE.Group();world.door.name='Front door';world.door.position.set(-.85,0,0);root.add(world.door);box(1.7,2.65,.08,.85,1.325,0,'walnut',world.door);box(.035,.24,.08,1.48,1.1,.08,'steel',world.door);world.door.rotation.y=-1.45;
 const red=painting(1.405,1.77,5,1.2,1.55,0x991b23,-Math.PI/2);const ring=new THREE.Mesh(new THREE.TorusGeometry(.43,.055,10,60),mat('black'));ring.scale.y=1.25;ring.position.z=.05;red.add(ring);
 cabinet(1.11,7.25,.65,.72,1.7,'oak');box(.77,.035,1.85,1.09,.76,7.25,'marble');box(.03,.24,.18,1.39,1.4,1.55,'black');box(.01,.07,.1,1.37,1.44,1.55,new THREE.MeshBasicMaterial({color:0x728c73}));
 world.targets.push({id:'records',pos:new THREE.Vector3(1.1,.9,7.25),name:'Read the entry notebook'},{id:'radio',pos:new THREE.Vector3(1.38,1.4,1.55),name:'House intercom'},{id:'door',pos:new THREE.Vector3(0,1.5,0),name:'Front door'},{id:'post',pos:new THREE.Vector3(0,1.5,0),name:'Begin the night at the front door',explorationOnly:true});
 // Study: sage cupboards, long desk and blue gaming chair.
 cabinet(-5.55,3.25,3.3,.64,.65,'sage',Math.PI/2,2.18);box(.85,.08,3.7,-5.35,.76,3.3,'oak');block(-5.35,3.3,.9,3.7);box(.1,.5,.82,-5.4,1.12,3.1,'black');box(.015,.4,.7,-5.33,1.14,3.1,new THREE.MeshStandardMaterial({color:0x344b45,emissive:0x263a31,emissiveIntensity:.7}));
 soft(.64,.16,.67,-4.35,.5,3.25,'blue');soft(.67,1.12,.19,-4.08,.97,3.25,'blue').rotation.y=Math.PI/2;cyl(.04,.07,.4,-4.35,.23,3.25,'black');block(-4.35,3.25,.72,.75);painting(-3.3,1.8,1.09,.65,.84,0x80725b);painting(-2.45,1.8,1.09,.5,.68,0x8f8c77);
 world.targets.push({id:'media',pos:new THREE.Vector3(-5.25,1.1,3.1),name:'Listen to the computer recording'});shelf(-4.19,7.45,1.8,2.4,Math.PI/2);for(let i=0;i<4;i++)box(.5,.3,.48,-3.85,.2+i*.45,8.4,[0x785a40,0x34393c][i%2]);
 // The distinctive orange seating, cream chaise, low blue table and olive rug.
 sofa(3.82,13.3,4.6,-Math.PI/2);sofa(2.1,15.15,2.55,Math.PI);sofa(-3.5,14.8,2.6,0,'cream');box(5,.015,4.5,-.2,.015,13.55,0x4d5037);cyl(.8,.73,.29,-.15,.17,13.2,0x233a73,root,40);block(-.15,13.2,1.6,1.6);
 for(let i=0;i<3;i++)box(.26,.045,.31,-.5+i*.27,.36,13.1+(i%2)*.2,[0x8b7962,0xc0b6a1,0x514938][i]);
 for(const [z0,z1] of [[9.6,11.27],[12.72,17.2]])for(let z=z0+.3;z<z1;z+=.6){box(.035,2.67,.585,4.89,1.37,z,'sage');box(.025,.1,.013,4.855,1.2,z+.18,'steel');}shelf(-5.64,11,2.2,2.7,Math.PI/2);plant(3.9,16.55,0,1.4);
 // Raised dining area, timber table, amber pendants, sideboard and wine fridge.
 soft(2.9,.13,1.2,-9,1.12,13.7,'oak');for(const x of [-10.05,-7.95])box(.12,.68,.75,x,.71,13.7,'black');block(-9,13.7,2.95,1.25);for(const x of [-9.9,-9,-8.1]){chair(x,12.7,Math.PI,.36);chair(x,14.7,0,.36);}
 for(let i=0;i<3;i++){const x=-9.85+i*.83;for(let j=0;j<3;j++)cyl(.42-j*.07,.36-j*.06,.12,x,2.75-j*.12,13.7,0xad7b38);cyl(.012,.012,.44,x,3.13,13.7,'black');light(x,2.35,13.7,0xffbb67,9);}
 cabinet(-9.1,16.93,3.2,.9,.6,'teal',0,.36);const art=painting(-9.1,2.25,17.25,1.45,1.3,0x2b5d64,Math.PI);for(let i=0;i<5;i++){const r=new THREE.Mesh(new THREE.TorusGeometry(.15+i*.1,.015,7,45),mat(i%2?0xae9259:0x667a92));r.position.z=.05;art.add(r);}
 cabinet(-11.4,10.5,.72,2,.64,'black',Math.PI/2,.36);for(let j=0;j<6;j++){box(.015,.025,.54,-11.03,.65+j*.25,10.5,'steel');for(let i=0;i<3;i++){const b=cyl(.042,.045,.31,-11.12,.72+j*.25,10.32+i*.16,0x294331);b.rotation.z=Math.PI/2;}}
 // Kitchen counters, black backsplash and the orange range in the walkthrough.
 cabinet(-11.55,6.2,4.6,.88,.73,'oak',Math.PI/2,.36);box(.8,.05,4.65,-11.55,1.265,6.2,'marble');cabinet(-6.47,6.4,4,.88,.73,'oak',-Math.PI/2,.36);box(.8,.05,4.05,-6.47,1.265,6.4,'marble');box(.035,1.18,4.7,-11.91,1.91,6.2,'black');cabinet(-11.61,6.5,4,.65,.5,'oak',Math.PI/2,2.35);
 box(.75,.85,.82,-11.5,.785,7.35,'orange');box(.045,.42,.56,-11.08,.92,7.35,'black');for(const z of [7.13,7.57])for(const x of [-11.7,-11.32])cyl(.085,.085,.02,x,1.23,z,'black');cabinet(-7.1,3.77,.9,2.2,.85,'black',0,.36);box(.2,.12,.004,-7.14,1.65,4.21,0x7d7a64);
 // Utility: laundry pair, sink, shelves and mounted bicycles.
 for(const z of [.1,1.12]){box(.75,.88,.9,-11.5,.81,z,'white');const d=cyl(.26,.26,.04,-11.1,.82,z,'black');d.rotation.z=Math.PI/2;block(-11.5,z,.8,.95);}cabinet(-6.45,.6,3.6,.8,.72,'white',-Math.PI/2,.36);box(.8,.07,3.7,-6.45,1.2,.6,'marble');shelf(-11.65,-1.35,2,2.2,Math.PI/2,.36);
 for(let i=0;i<2;i++){const g=new THREE.Group();g.position.set(-6.15,1.3+i*.8,-1.2);g.rotation.y=Math.PI/2;root.add(g);for(const x of [-.38,.38]){const wheel=new THREE.Mesh(new THREE.TorusGeometry(.3,.017,6,26),mat('black'));wheel.position.x=x;g.add(wheel);}box(.85,.025,.025,0,.12,0,i?'orange':'black',g).rotation.z=.35;}
 // Glazed lounge: sofa, glass table, telescope and reclining chair.
 sofa(-3.6,19.6,2.6,Math.PI/2,'cream',.36);soft(1.65,.055,.85,-1.2,.76,19.7,'glass');block(-1.2,19.7,1.7,.9);cyl(.035,.035,1.25,.7,1,21,'steel');for(let i=0;i<3;i++){const leg=cyl(.015,.015,1.2,.7+Math.cos(i*2.1)*.25,.85,21+Math.sin(i*2.1)*.25,'black');leg.rotation.z=Math.cos(i*2.1)*.5;leg.rotation.x=Math.sin(i*2.1)*.5;}cyl(.12,.1,.85,.7,1.67,21,'cream').rotation.x=.95;block(.7,21,.75,.75);sofa(3.5,19.5,1.05,-Math.PI/2,'black',.36);soft(.65,.19,.56,2.5,.65,19.5,'black');block(2.5,19.5,.7,.6);cabinet(4.52,21.4,1.2,.66,.55,'teal',-Math.PI/2,.36);plant(-4.85,21.2,.36,1.1);
 const pin=new THREE.Group();pin.position.set(3.7,0,16.8);root.add(pin);box(.68,.16,1.25,0,.9,0,'black',pin);box(.58,.025,1.1,0,1,0,0x63251e,pin).rotation.x=.13;box(.68,.8,.15,0,1.48,.56,'black',pin);box(.55,.55,.025,0,1.51,.47,0x593631,pin);for(const x of [-.25,.25])for(const z of [-.5,.5])box(.035,.85,.035,x,.43,z,'steel',pin);block(3.7,16.8,.75,1.3);
 // Bedroom: blue bed, marble-pattern headboard, light sofa and display shelving.
 soft(2.3,.25,2.55,8.95,.25,12.8,'walnut');soft(2.2,.25,2.45,8.95,.48,12.8,'blue');soft(1.8,.17,.5,9,.71,13.55,'cream');block(8.95,12.8,2.35,2.65);box(2.7,1.65,.14,8.95,1.44,14.3,'black');for(let i=0;i<13;i++){const v=box(.018,.9+Math.sin(i)*.3,.008,7.75+i*.19,1.5,14.221,0x797b70);v.rotation.z=Math.sin(i*3.8)*.9;}sofa(6.13,15.7,2,-Math.PI/2,'cream');shelf(8.6,16.97,2.8,2.7);box(3.8,.016,3.7,8,.01,14.2,0x593a36);
 world.targets.push({id:'staff',pos:new THREE.Vector3(7.7,1.25,16.76),name:'Read the note beside the bed'},{id:'board',pos:new THREE.Vector3(6,1.9,17.29),name:'Look behind the bedroom mirror'});painting(6.2,1.85,17.29,1,1.3,0x747c75,Math.PI);
 cabinet(13.65,10.9,2.6,2.65,.7,'walnut',-Math.PI/2);for(let i=0;i<10;i++)box(.25,.85,.06,13.2,1.6,9.75+i*.23,['blue','cream','sage'][i%3]);cabinet(12.3,9.8,2.4,.7,.65,'walnut');soft(1.15,.55,2.1,13.05,.3,15.5,'white');soft(.9,.18,1.8,13.05,.59,15.5,'black');block(13.05,15.5,1.2,2.15);cabinet(11.4,16.99,1.4,.86,.66,'oak');box(1.55,.055,.77,11.4,.91,16.95,'marble');sphere(.25,11.4,.94,16.95,'white',root,1.6,.2,1);painting(11.45,1.82,17.27,1.3,1.3,0x7b8380,Math.PI);
 // Distant apartment blocks glimpsed through the windows at night.
 for(let i=0;i<6;i++){const x=-25+i*9;box(6,18,5,x,5,39,0x0d1922);for(let y=0;y<15;y+=1.7)for(let xx=-2;xx<=2;xx+=1.3)if((i*7+Math.round(y*3)+Math.round(xx*4))%3===0)box(.5,.8,.025,x+xx,y,36.48,new THREE.MeshBasicMaterial({color:0x3c473d}));}
 root.add(new THREE.HemisphereLight(0x91a9ba,0x392b1e,.54));for(const z of [1.8,5.4,8.4])down(0,z,0,12);world.flicker=down(-3.5,2.7,0,12);world.flicker.userData.baseIntensity=12;
 for(const [x,z,b,p] of [[-3,11,0,18],[1,11,0,14],[1,15,0,10],[-10,6,.36,13],[-8,6,.36,14],[-9,0,.36,9],[7,11,0,13],[8,16,0,8],[12,15,0,9],[-1,20,.36,7]])down(x,z,b,p);light(-2,2.6,22,0x7296c8,25,14);light(-.5,2.7,-1.7,0xb9c1bd,14,6);
 const shadow=light(0,2.8,12,0xefb573,25,13);shadow.castShadow=true;shadow.shadow.mapSize.set(1024,1024);shadow.shadow.bias=-.001;
 const rain=new Float32Array(1300*3);for(let i=0;i<rain.length;i+=3){rain[i]=(i*7.31%40)-20;rain[i+1]=i*1.71%16;rain[i+2]=23+i*.63%10;}world.rain=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(rain,3)),new THREE.PointsMaterial({color:0x93b0c0,size:.02,transparent:true,opacity:.28}));root.add(world.rain);
 world.flashlight=new THREE.SpotLight(0xe4dfcb,28,16,.32,.6,2);world.camera.add(world.flashlight);world.flashlight.position.set(.15,-.13,0);world.flashlight.target.position.set(0,0,-7);world.camera.add(world.flashlight.target);world.flashlight.visible=false;
 root.scale.x=-1;world.colliders.forEach(c=>c.x=-c.x);world.targets.forEach(t=>t.pos.x=-t.pos.x);
 root.traverse(o=>{if(o.isPointLight)o.intensity*=.62;});world.flicker.userData.baseIntensity*=.62;
 return root;
}
