import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createActor} from '../src/actors.js';

test('activities select matching front and overhead films with an image while decoding, then resume walking',async()=>{
 const doc=globalThis.document,load=THREE.TextureLoader.prototype.load;
 class Video extends EventTarget{constructor(){super();this.readyState=0;this.paused=true;this.currentTime=0;this.ended=false;}load(){}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}removeAttribute(){}}
 globalThis.document={hidden:false,createElement:()=>new Video()};THREE.TextureLoader.prototype.load=()=>{const t=new THREE.Texture();t.image={width:512,height:342};return t;};
 try{
  const framing={width:768,height:512,bodyHeight:400,bottom:50},calibration={};for(const name of ['leo-chew','leo-chew-overhead','miso-groom','miso-groom-overhead','miso-lounge','miso-lounge-overhead'])calibration[name]={bodyHeight:400,height:512,bottoms:[50],fps:24,poseScale:name.startsWith('miso')?1.35:.75,physicalLength:name.startsWith('miso')?.58:.736};
  for(const [id,action] of [['sunny','chew'],['miso','groom'],['miso','lounge']]){
   const g=createActor(id,.4,framing,calibration),d=g.userData;Object.assign(d,{activity:action,cameraX:0,cameraZ:2,cameraY:.7});d.update(.1,true,true);await Promise.resolve();
   assert.equal(d.currentFilm,action);assert.ok(g.children[0].material.map.image,'matching still shown before decoder is ready');assert.equal(d.volumetric,false);
   Object.assign(d,{cameraY:2,cameraZ:.1});d.update(.1,true,true);assert.equal(d.currentFilm,action+'-overhead');assert.ok(d.overhead);assert.ok(g.children[0].visible);
   if(action==='lounge'){g.rotation.y=.8;d.heading=Math.PI/2;d.update(.1,true,true);const offset=g.children[0].position.clone().applyAxisAngle(new THREE.Vector3(0,1,0),g.rotation.y);assert.ok(Math.abs(offset.x-.18)<.001);assert.ok(Math.abs(offset.z)<.001,'overhead pose stays on the room side of its wall');}
   const f=d.films.get('walk-front');f.video.readyState=2;Object.assign(d,{activity:'walk',cameraY:.7,cameraZ:2,vz:.42,vx:0});d.update(.1,true,true);assert.equal(d.currentFilm,'walk-front');assert.equal(d.overhead,false);g.userData.dispose();
  }
 }finally{globalThis.document=doc;THREE.TextureLoader.prototype.load=load;}
});
