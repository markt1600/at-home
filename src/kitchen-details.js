import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {planPoint} from './house-layout.js';

// Counter positions follow the built kitchen; object order follows the owner's
// September 14 photos, viewed from the working side of each counter.
export function buildKitchenDetails(world,root,m,pantry){
 const ink=m.black,paper=m.white,silver=m.steel,brushed=0xb4b8b5,brass=0xa38a53,glass=m.glass;
 const colors=[0xc94a2c,0xe7ba40,0x315875,0x487451,0xede0bf,0x875337];
 // Packaging and enamel share one batch even though each item has its own color.
 const colored=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.65,side:THREE.DoubleSide});m.detailColors=colored;
 const material=mat=>typeof mat==='number'?colored:mat;
 const tint=(o,mat)=>{if(typeof mat==='number'){const color=new THREE.Color(mat),n=o.geometry.attributes.position.count,data=new Float32Array(n*3);for(let i=0;i<n;i++)color.toArray(data,i*3);o.geometry.setAttribute('color',new THREE.BufferAttribute(data,3));}return o;};
 const B=(g,w,h,d,x,y,z,mat=ink)=>tint(world.box(w,h,d,x,y,z,material(mat),g),mat);
 const C=(g,rt,rb,h,x,y,z,mat=silver,n=16)=>tint(world.cyl(rt,rb,h,x,y,z,material(mat),g,n),mat);
 const S=(g,w,h,d,x,y,z,mat=ink)=>{const o=tint(new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(.025,w/6,h/6,d/6)),material(mat)),mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
 const group=(parent,name,x=0,y=0,z=0)=>{const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;};
 const at=(name,px,pz,y=1.35,yaw=0)=>{const [x,z]=planPoint(px,pz),g=group(root,name,x,y,z);g.rotation.y=yaw;return g;};
 const rod=(g,a,b,r=.006,mat=silver)=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start),mid=start.add(end).multiplyScalar(.5),o=C(g,r,r,delta.length(),...mid.toArray(),mat,8);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;};
 const knob=(g,x,y,z,r=.025,mat=silver)=>{const o=C(g,r,r,.018,x,y,z,mat,20);o.rotation.x=Math.PI/2;return o;};
 const loop=(g,x,y,z,r,mat=silver)=>{const o=new THREE.Mesh(new THREE.TorusGeometry(r,.004,6,20),mat);o.position.set(x,y,z);g.add(o);return o;};
 const label=(g,w,h,x,y,z,mat=paper)=>{B(g,w,h,.002,x,y,z,mat);for(let j=0;j<3;j++)B(g,w*.65,.003,.001,x,y+(j-1)*h*.18,z+.0016,ink);};
 function bottle(parent,name,x,z,h=.23,r=.035,color=colors[3],y=0){
  const g=group(parent,name,x,y,z);C(g,r,r*.94,h*.70,0,h*.35,0,color);C(g,r*.4,r,h*.13,0,h*.765,0,color);C(g,r*.38,r*.38,h*.13,0,h*.885,0,color);C(g,r*.45,r*.45,h*.055,0,h*.976,0,ink);label(g,r*1.4,h*.30,0,h*.43,r+.001);return g;
 }
 function packet(parent,name,x,y,z,w,h,d,index,bag=false){
  const g=group(parent,name,x,y,z),color=colors[index%colors.length];
  if(bag){const shape=new THREE.Shape();shape.moveTo(-w*.43,0);shape.lineTo(w*.43,0);shape.lineTo(w*.50,h*.2);shape.lineTo(w*.39,h*.84);shape.lineTo(w*.44,h);shape.lineTo(-w*.44,h);shape.lineTo(-w*.36,h*.81);shape.lineTo(-w*.5,h*.2);shape.closePath();const o=tint(new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false}),colored),color);o.position.z=-d/2;o.castShadow=true;g.add(o);B(g,w*.89,.011,d*.85,0,h-.005,0,paper);}
  else B(g,w,h,d,0,h/2,0,color);
  label(g,w*.78,h*.36,0,h*.59,d/2+.002);B(g,w*.58,h*.16,.003,0,h*.21,d/2+.003,colors[(index+2)%colors.length]);return g;
 }

 const appliances=at('Kitchen appliance counter',584,870,1.35,Math.PI);
 const filter=group(appliances,'Black water filter',-1.10,0,0);
 S(filter,.15,.31,.18,0,.18,-.02);C(filter,.086,.080,.024,0,.016,.04,ink);knob(filter,0,.285,.078,.052,silver);B(filter,.035,.065,.018,0,.24,.092,silver);C(filter,.012,.012,.03,0,.213,.091,silver);C(filter,.057,.057,.006,0,.031,.05,silver);
 const containers=group(appliances,'Bottles and countertop containers',-.84,0,0);
 C(containers,.055,.055,.23,-.09,.115,.03,paper);C(containers,.012,.012,.239,-.09,.12,.03,paper);
 for(const [i,x] of [0,.13,.245].entries()){
  const g=group(containers,'Insulated bottle '+i,x,0,i===2?-.095:0),color=colors[[1,4,0][i]];C(g,.046,.041,.29,0,.145,0,color);C(g,.049,.049,.025,0,.302,0,silver);C(g,.014,.014,.055,.019,.34,0,color);rod(g,[.049,.24,0],[.072,.27,0],.009,color);rod(g,[.072,.27,0],[.053,.31,0],.009,color);
 }
 for(const [i,x] of [-.09,.055,.21].entries()){const g=group(containers,'Tea tin '+i,x,0,-.17);C(g,.045,.045,.12+i*.035,0,.06+i*.0175,0,colors[(i+2)%6]);C(g,.046,.046,.012,0,.126+i*.035,0,silver);}
 const balmuda=group(appliances,'Balmuda coffee machine',-.39,0,.018);
 S(balmuda,.20,.035,.235,0,.0175,0);B(balmuda,.046,.35,.075,0,.205,-.077);C(balmuda,.096,.048,.14,0,.357,0,ink);C(balmuda,.048,.045,.034,0,.271,0,silver);C(balmuda,.081,.081,.018,0,.433,0,silver);C(balmuda,.065,.065,.019,0,.447,0,ink);
 C(balmuda,.051,.068,.155,0,.117,.038,brushed);C(balmuda,.059,.052,.03,0,.209,.038,ink);loop(balmuda,.07,.135,.037,.036,ink);label(balmuda,.055,.012,0,.356,.085);
 const grinder=group(appliances,'Coffee grinder with hopper',-.16,0,.015);
 S(grinder,.16,.035,.225,0,.0175,0,silver);S(grinder,.135,.245,.14,0,.155,-.035,silver);B(grinder,.12,.064,.01,0,.246,.041,ink);for(const x of [-.037,0,.037])knob(grinder,x,.249,.050,.008,paper);
 C(grinder,.037,.066,.10,0,.337,-.035,ink);C(grinder,.076,.038,.125,0,.406,-.035,glass);C(grinder,.079,.079,.015,0,.476,-.035,silver);C(grinder,.028,.061,.086,0,.383,-.035,colors[5]);C(grinder,.016,.016,.04,0,.205,.038,ink);S(grinder,.09,.12,.09,0,.096,.046,ink);
 const oven=group(appliances,'Silver toaster oven',.245,0,.01);
 S(oven,.54,.395,.39,0,.215,0,brushed);for(const x of [-.21,.21])B(oven,.04,.027,.28,x,.017,0,ink);
 B(oven,.475,.227,.016,0,.172,.201,ink);B(oven,.431,.177,.008,0,.174,.213,glass);
 for(const y of [.114,.18])for(let i=0;i<8;i++)rod(oven,[-.18+i*.051,y,.205],[-.18+i*.051,y,.12],.002,silver);
 B(oven,.49,.073,.018,0,.334,.204,brushed);for(const x of [-.181,-.062,.06,.18]){knob(oven,x,.336,.22,.029,brushed);B(oven,.004,.019,.004,x,.343,.233,ink);}
 rod(oven,[-.20,.265,.252],[.20,.265,.252],.011,silver);for(const x of [-.20,.20])B(oven,.018,.025,.043,x,.265,.23,silver);
 const frother=group(oven,'Metal coffee frother',-.095,.415,-.008);C(frother,.072,.072,.215,0,.1075,0,brushed);B(frother,.072,.16,.02,0,.114,.072,ink);C(frother,.074,.074,.015,0,.224,0,ink);knob(frother,0,.041,.085,.015);
 C(oven,.035,.035,.145,.16,.49,-.04,silver);C(oven,.037,.037,.03,.16,.425,-.04,ink);
 const microwave=group(appliances,'Black microwave',.895,0,0);
 S(microwave,.67,.36,.41,0,.191,0);B(microwave,.507,.296,.014,-.06,.19,.212,0x202925);B(microwave,.017,.297,.024,.212,.19,.218,silver);knob(microwave,.274,.143,.225,.033,ink);B(microwave,.067,.029,.003,.274,.293,.222,ink);B(microwave,.029,.007,.004,.273,.292,.225,colors[3]);
 for(const i of [0,1,2])packet(microwave,'Tea box '+i,-.16+i*.14,.379,-.045,.135,.078,.21,i);
 const tea=group(microwave,'Glass teapot',.16,.463,-.025);C(tea,.057,.074,.105,0,.055,0,glass);C(tea,.063,.063,.012,0,.115,0,ink);loop(tea,.084,.06,0,.041,glass);rod(tea,[-.055,.045,0],[-.095,.09,0],.012,glass);
 // A small covered tea ornament above the microwave, as in the photo.
 const toy=group(microwave,'Black-eared tea character',.19,.59,-.08);C(toy,.052,.06,.08,0,.04,0,ink);S(toy,.075,.042,.015,0,.033,.048,paper);for(const x of [-.039,.039]){const ear=C(toy,0,.024,.07,x,.108,0,ink,5);ear.rotation.z=x<0?.27:-.27;knob(toy,x*.43,.044,.06,.005,ink);}knob(toy,0,.075,.052,.014,colors[0]);

 const pantryCounter=at('Food counter beside fridge',634.5,769.78,1.35,-Math.PI/2);
 for(let row=0;row<2;row++)for(let i=0;i<5;i++){
  const w=.105+(i%2)*.024,h=.15+((i+row)%3)*.055,x=-.56+i*.139,z=row? .10:-.105;
  const g=packet(pantryCounter,'Counter food packet '+row+'-'+i,x,0,z,w,h,.085,i+row*2,i%3!==0);g.rotation.y=(i%3-1)*.16;
 }
 for(const [i,x] of [-.58,-.36,-.13].entries())bottle(pantryCounter,'Condiment jar '+i,x,.21,.12+i*.025,.029,colors[i]);
 const rice=group(pantryCounter,'White rice cooker',.27,0,.005);C(rice,.127,.105,.245,0,.13,0,paper,24);S(rice,.25,.054,.235,0,.262,0,paper);B(rice,.25,.018,.231,0,.212,0,silver);B(rice,.10,.055,.011,0,.17,.126,silver);knob(rice,-.027,.174,.135,.012,colors[0]);B(rice,.049,.022,.002,.032,.174,.135,ink);B(rice,.08,.03,.04,0,.3,-.01,paper);
 const mixer=group(pantryCounter,'Black stand mixer',.56,0,.005);S(mixer,.23,.044,.31,0,.025,0);S(mixer,.093,.29,.10,0,.185,-.09);S(mixer,.145,.13,.245,0,.347,.015);B(mixer,.148,.022,.22,0,.329,.025,silver);C(mixer,.115,.059,.13,0,.119,.066,silver,24);C(mixer,.109,.055,.12,0,.127,.066,glass,24);rod(mixer,[0,.298,.075],[0,.164,.075],.006);for(const x of [-.043,.043])rod(mixer,[0,.245,.075],[x,.165,.075],.003);knob(mixer,.077,.35,.044,.018,silver);
 for(let row=0;row<2;row++)for(let i=0;i<9;i++){
  const h=.16+((i+row)%3)*.036,x=-.545+i*.136,y=row?.014:-.33;
  packet(pantry,'Pantry food '+row+'-'+i,x,y,-.005,.112,h,.18,i+row*2,i%3===0);
 }
 const wire=[];for(let x=-.6;x<=.61;x+=.023)wire.push(x,-.32,.174,x,.32,.174);for(let y=-.32;y<=.33;y+=.023)wire.push(-.6,y,.174,.6,y,.174);
 const mesh=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(wire,3)),new THREE.LineBasicMaterial({color:0x444b43,transparent:true,opacity:.25}));mesh.name='Pantry door wire glass';pantry.add(mesh);
 const rail=group(pantryCounter,'Hanging pantry baskets',0,.48,-.237);rod(rail,[-.50,.09,0],[.38,.09,0],.009,ink);
 for(const x of [-.25,.12]){const basket=group(rail,'Wire food basket',x,-.045,.075);C(basket,.12,.095,.011,0,-.053,0,ink);for(let i=0;i<16;i++){const a=i*Math.PI/8;rod(basket,[Math.cos(a)*.095,-.05,Math.sin(a)*.095],[Math.cos(a)*.12,.045,Math.sin(a)*.12],.0025,ink);}const rim=loop(basket,0,.046,0,.12,ink);rim.rotation.x=Math.PI/2;rod(basket,[0,.04,-.095],[0,.14,-.065],.003,ink);for(let i=0;i<3;i++)C(basket,.027,.027,.065,-.055+i*.055,-.01,0,colors[i+1]);}

 const knives=at('Magnetic knife rack beside sink',527.5,770,1.935,Math.PI/2);B(knives,.82,.076,.026,0,0,0,m.oak);
 for(let i=0;i<8;i++){
  const g=group(knives,'Rack knife '+(i+1),-.345+i*.098,0,.027),length=.18+(i%3)*.024,w=i===6?.071:.032+(i%2)*.011;
  const shape=new THREE.Shape();shape.moveTo(-w/2,.04);shape.lineTo(w/2,.04);shape.lineTo(w/2,-length*.74);shape.quadraticCurveTo(w*.3,-length,-w/2,-length);shape.closePath();
  const blade=tint(new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.004,bevelEnabled:false}),colored),brushed);blade.position.z=.005;g.add(blade);S(g,.027,.127,.02,0,.103,.009);for(const y of [.07,.112,.15])knob(g,0,y,.022,.0035,silver);g.rotation.z=(i%3-1)*.055;
 }
 const towels=group(knives,'Blue and red hanging towels',.59,0,.036);
 for(const [i,x] of [-.10,.10].entries()){const geo=new THREE.PlaneGeometry(.17,.31,12,16),p=geo.attributes.position;for(let j=0;j<p.count;j++)p.setZ(j,.014*Math.cos(p.getX(j)*90)+.04*(p.getY(j)+.155));geo.computeVertexNormals();const t=tint(new THREE.Mesh(geo,colored),colors[i?0:2]);t.position.set(x,-.085,.008);towels.add(t);if(!i)for(let j=0;j<6;j++)B(towels,.16,.005,.004,x,-.21+j*.044,.022,paper);}
 const boards=at('Cutting boards and kitchen processor',536,741,1.35,Math.PI/2);
 for(let i=0;i<3;i++){const b=S(boards,.32-i*.025,.30+i*.055,.018,.13+i*.018,.15+i*.0275,-.20+i*.027,i===2?paper:m.oak);b.rotation.x=-.06;}
 const processor=group(boards,'Black food processor',-.22,0,.01);S(processor,.22,.058,.23,0,.029,0);S(processor,.19,.06,.13,0,.061,.07);C(processor,.085,.065,.18,0,.173,-.02,ink);C(processor,.090,.090,.024,0,.275,-.02,ink);loop(processor,.087,.178,-.02,.047,silver);B(processor,.10,.03,.006,0,.096,.139,ink);
 const soap=at('Sink soaps and brush cup',533.7,789,1.35,Math.PI/2);
 for(const [i,x] of [-.09,.03].entries()){bottle(soap,'Sink soap '+i,x,.10,.17,.032,colors[i?5:1]);B(soap,.014,.034,.013,x,.181,.10,ink);B(soap,.04,.008,.018,x+.011,.199,.10,ink);}
 world.kitchenDetails={appliances,pantryCounter,pantry,knives};
 buildStove(world,root,{B,C,S,group,at,rod,knob,ink,silver,brass});
}

function buildStove(world,root,{B,C,S,group,at,rod,knob,ink,silver,brass}){
 const stove=at('Four-burner gas stove',577,734,1.35);
 B(stove,1.05,.88,.62,0,-.46,0,0xd56d19);B(stove,.95,.46,.035,0,-.37,13/(651/16.88),0xd56d19);
 B(stove,1.04,.028,.61,0,.019,0,silver);B(stove,.985,.014,.555,0,.04,0,ink);
 const burners=[];
 for(const x of [-.285,.285])for(const z of [-.158,.158]){
  const burner=group(stove,'Gas burner '+(burners.length+1),x,.051,z);C(burner,.082,.082,.014,0,.007,0,ink,24);
  for(const side of [-1,1]){B(burner,.18,.013,.012,0,.041,side*.093,ink);B(burner,.013,.035,.2,side*.10,.024,0,ink);B(burner,.059,.014,.018,side*.075,.041,0,ink);}burners.push(burner);
 }
 B(stove,1.00,.098,.025,0,-.071,.327,silver);
 const knobs=[];for(let i=0;i<4;i++){const g=group(stove,'Gas control '+(i+1),-.34+i*.225,-.071,.355);g.userData.dynamic=true;knob(g,0,0,0,.035,brass);B(g,.008,.034,.007,0,.006,.014,ink);knobs.push(g);}
 B(stove,.79,.295,.015,0,-.48,.357,ink);B(stove,.69,.216,.01,0,-.483,.369,0x282b23);rod(stove,[-.41,-.248,.398],[.41,-.248,.398],.017,brass);for(const x of [-.41,.41])rod(stove,[x,-.248,.337],[x,-.248,.398],.013,brass);
 const flames=group(stove,'Four blue burner flames');flames.userData.dynamic=true;flames.visible=false;
 const jets=48,geo=new THREE.ConeGeometry(1,1,7),outer=new THREE.InstancedMesh(geo,new THREE.MeshBasicMaterial({color:0x166bff,transparent:true,opacity:.68,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}),jets),inner=new THREE.InstancedMesh(geo,new THREE.MeshBasicMaterial({color:0x75e5ff,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}),jets);
 flames.add(outer,inner);outer.frustumCulled=inner.frustumCulled=false;const pose=new THREE.Object3D();let running=false,time=0;
 function animate(){for(let b=0;b<4;b++)for(let j=0;j<12;j++){const i=b*12+j,a=j*Math.PI/6,h=.037+.013*(.5+.5*Math.sin(time*12+j*1.7+b));pose.position.set(burners[b].position.x+Math.cos(a)*.077,.069+h/2,burners[b].position.z+Math.sin(a)*.077);pose.rotation.set(Math.sin(a)*.14,0,-Math.cos(a)*.14);pose.scale.set(.009,h,.009);pose.updateMatrix();outer.setMatrixAt(i,pose.matrix);pose.position.y-=h*.18;pose.scale.set(.004,h*.6,.004);pose.updateMatrix();inner.setMatrixAt(i,pose.matrix);}outer.instanceMatrix.needsUpdate=inner.instanceMatrix.needsUpdate=true;}
 animate();stove.updateWorldMatrix(true,true);const point=p=>stove.localToWorld(new THREE.Vector3(...p));
 const item=world.houseInteractions.add({id:'kitchen-stove',pos:point([0,-.066,.386]),surfaceOffset:.085,touchPoints:[point([0,-.066,.386]),...burners.map(b=>point([b.position.x,.09,b.position.z]))],touchRadius:.19,range:2.15,
  label:()=>running?'Turn off stove':'Turn on stove',get running(){return running;},flames,burners,knobs,
  setRunning(value){running=!!value;flames.visible=running;for(const knob of knobs)knob.rotation.z=running?-.72:0;},
  activate(){this.setRunning(!running);},update(dt){if(!running||dt<=0)return;time+=dt;animate();}
 });world.kitchenStove=item;
}
