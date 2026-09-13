import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {hasTouchInput,viewportBounds,fitRenderer,installGameViewport} from '../src/game-viewport.js';
import {createPetModel} from '../src/pet-models.js';
import {PetRoaming} from '../src/pet-roaming.js';
import {PETS} from '../src/life.js';
import {createHouseModel} from '../scripts/house-model.mjs';
import {validateRecord,publicRecord} from '../server/memory-record.js';
import {floorMemories,memoriesForPet} from '../src/pet-memories.js';
import {planPoint} from '../src/house-layout.js';

test('touch capability survives wide landscape and browser viewport changes',()=>{
 const win=Object.assign(new EventTarget(),{navigator:{maxTouchPoints:5},innerWidth:1100,innerHeight:760,document:new EventTarget(),visualViewport:Object.assign(new EventTarget(),{width:844,height:330,offsetLeft:0,offsetTop:12}),matchMedia:()=>Object.assign(new EventTarget(),{matches:false})});
 const styles={},classes={};const stop=installGameViewport(win,{classList:{toggle:(k,v)=>classes[k]=v},style:{setProperty:(k,v)=>styles[k]=v}});
 assert.ok(hasTouchInput(win));assert.ok(classes['touch-device']);assert.equal(styles['--view-height'],'330px');
 Object.assign(win.visualViewport,{width:390,height:700,offsetTop:0});win.visualViewport.dispatchEvent(new Event('resize'));
 assert.deepEqual(viewportBounds(win),{width:390,height:700,left:0,top:0});assert.equal(styles['--view-width'],'390px');stop();
});
test('each main pass restores the complete viewport after a smaller reflection target',()=>{
 const calls=[],renderer={getSize:t=>t.set(844,390),setRenderTarget:v=>calls.push(['target',v]),setScissorTest:v=>calls.push(['scissor',v]),setViewport:(...v)=>calls.push(['viewport',...v]),setSize:(...v)=>calls.push(['size',...v]),resetState:()=>calls.push(['reset'])},camera={updateProjectionMatrix:()=>calls.push(['projection'])};
 fitRenderer(renderer,camera,844,390);assert.deepEqual(calls,[['target',null],['scissor',false],['viewport',0,0,844,390]]);
 fitRenderer(renderer,camera,390,700,true);assert.equal(camera.aspect,390/700);assert.ok(calls.some(c=>c[0]==='reset'));assert.deepEqual(calls.at(-1),['viewport',0,0,390,700]);
});
test('close-up pets have volume, turn toward travel, and keep their walking paws above the floor',()=>{
 for(const spec of PETS){const g=createPetModel(spec.id,spec.height);g.position.y=.028;g.updateMatrixWorld(true);let b=new THREE.Box3().setFromObject(g);assert.ok(b.max.z-b.min.z>.25);assert.ok(b.max.x-b.min.x>.15);
  for(let i=0;i<100;i++){g.userData.update(.05,{activity:'walk',vx:.2,vz:0,speed:.2,travel:i*.015});g.updateMatrixWorld(true);b.setFromObject(g);assert.ok(b.min.y>=-.001,`${spec.name} clipped at ${b.min.y}`);}
  assert.ok(Math.abs(g.rotation.y-Math.PI/2)<.01);g.userData.dispose();
 }
});
test('pet-linked photo albums survive editing without creating fixed floor triggers',()=>{
 const id='ad9a4d4f-4465-4faa-8cd1-12b82fc6b6a4',position=[...planPoint(507,620)].toSpliced(1,0,0),input={id,title:'Memories of Cyrus',date:'',description:'Quiet moments',petId:'miso',position,published:true,addMediaPaths:[`media/${id}/image.jpg`,`media/${id}/image.png`]};
 const saved=validateRecord(input),edited=validateRecord({...input,petId:undefined,title:'Cyrus'},saved),record=publicRecord(edited);
 assert.equal(record.petId,'miso');assert.equal(record.media.length,2);assert.deepEqual(floorMemories([record]),[]);assert.deepEqual(memoriesForPet([record],'miso'),[record]);assert.throws(()=>validateRecord({...input,petId:'unknown'}),/Choose a pet/);
});
test('pets can depart from a nearby player and route around another pet instead of repeatedly blocking',()=>{
 const world=createHouseModel(),r=new PetRoaming(world.colliders,()=>.43);for(const p of PETS)r.register(p.id,p.plan);
 const a=r.pets.get('sunny'),b=r.pets.get('miso');const roomNodes=[...r.nodes.values()].filter(n=>n.y===0&&n.links.length===4);
 const center=roomNodes.find(n=>roomNodes.some(o=>Math.abs(o.x-n.x-.8)<.001&&Math.abs(o.z-n.z)<.001));
 Object.assign(a,{x:center.x,y:0,z:center.z,wait:0,path:[]});Object.assign(b,{x:center.x+.8,y:0,z:center.z,wait:0,path:[]});
 a.path=[r.nearest(b.x,b.z)];b.path=[r.nearest(a.x,a.z)];
 const previous=[a.distance,b.distance];for(let i=0;i<900;i++)r.update(.1);
 assert.ok(a.distance-previous[0]>1);assert.ok(b.distance-previous[1]>1);
 r.interact('sunny');const player={x:a.x+.25,y:a.y+1.67,z:a.z},start=a.distance;
 for(let i=0;i<700;i++)r.update(.1,{player});assert.ok(a.distance-start>1,'pet can leave after care without needing the player to move');
});
