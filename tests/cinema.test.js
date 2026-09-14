import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHouseModel} from '../scripts/house-model.mjs';
import {cinemaVideos} from '../src/cinema.js';
import {planPoint} from '../src/house-layout.js';

test('cinema finds videos in mixed memories without playing slideshow soundtracks',()=>{
 const source={id:'family',title:'Family',soundtrack:{src:'/song.mp3'},media:[{type:'image',src:'/photo.jpg'},{type:'video',src:'/clip.mp4'},{type:'video',src:'/clip2.mp4'}]};
 const choices=cinemaVideos([source,{id:'legacy',type:'video',src:'/old.mp4'},{type:'image',src:'/image.jpg'}]);
 assert.deepEqual(choices.map(m=>m.src),['/clip.mp4','/clip2.mp4','/old.mp4']);assert.ok(choices.every(m=>m.media.length===1&&!m.soundtrack));assert.equal(source.media.length,3);
});

test('movie curtains close before playback and reopen on exit without changing the viewing position',()=>{
 const w=createHouseModel({optimize:false}),c=w.cinema;w.daylight={sun:{shadow:{needsUpdate:false}}};w.camera.aspect=16/10;w.camera.fov=62;w.camera.position.set(planPoint(408,335)[0],1.9,planPoint(408,335)[1]);w.yaw=.3;w.pitch=-.1;w.feet={x:0,y:.75,z:0};w.eyeHeight=1.67;
 const original=w.camera.position.clone(),open=c.curtains.map(p=>p.mesh.position.x);let ready=0;
 assert.equal(c.curtains.length,8);c.enter();c.onReady=()=>ready++;assert.equal(ready,0);
 for(let i=0;i<40;i++)c.update(.05);assert.equal(ready,1);assert.ok(c.darkness>.99);assert.ok(c.curtains.every(p=>p.mesh.scale.x>.99));assert.ok(c.curtains.some((p,i)=>p.mesh.position.x!==open[i]));
 assert.ok(w.camera.position.equals(original),'starting playback leaves the player free to move');w.camera.position.x+=1.2;const walked=w.camera.position.clone();
 c.leave();for(let i=0;i<45;i++)c.update(.05);assert.equal(c.darkness,0);assert.equal(c.face.material.map,null);assert.equal(c.active,false);assert.ok(w.camera.position.equals(walked),'stopping does not teleport the player back');assert.equal(w.camera.fov,62);assert.equal(w.yaw,.3);assert.equal(w.pitch,-.1);
 assert.ok(c.curtains.every((p,i)=>Math.abs(p.mesh.position.x-open[i])<1e-6));
});

test('the movie screen is selectable from the seating area after static batching',()=>{
 const w=createHouseModel();w.houseRoot.updateMatrixWorld(true);const c=w.cinema,[x,z]=planPoint(405,310);w.camera.position.set(x,2.15,z);w.camera.lookAt(c.screen.getWorldPosition(new THREE.Vector3()));
 assert.equal(w.houseInteractions.select(),'cinema-screen');assert.ok(c.face.parent,'video surface survives static batching');
});
