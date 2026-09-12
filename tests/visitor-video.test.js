import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {attachVisitorVideo} from '../src/visitor-video.js';

function fixture(){
 const events=new Map(),videoEvents=new Map();let pixel=[5,5,5,255],plays=0;
 const video={readyState:0,paused:true,currentTime:0,src:'',play(){plays++;this.paused=false;return Promise.resolve();},pause(){this.paused=true;},load(){},removeAttribute(){this.src='';},addEventListener(k,f){videoEvents.set(k,f);},removeEventListener(k){videoEvents.delete(k);}};
 const ctx={drawImage(){},getImageData(){return {data:pixel};}};
 const doc={hidden:false,createElement(tag){return tag==='video'?video:{getContext:()=>ctx};},addEventListener(k,f){events.set(k,f);},removeEventListener(k){events.delete(k);}};
 const poster=new THREE.Texture(),geometry=new THREE.PlaneGeometry(.6,1.8),body=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:poster}));body.position.y=.9;
 return {doc,video,body,poster,geometry,events,videoEvents,setPixel:p=>pixel=p,plays:()=>plays};
}

test('video replacement keeps feet grounded, samples live alpha, pauses, and restores its still',async()=>{
 const f=fixture();globalThis.document=f.doc;
 try{
  const state=attachVisitorVideo(f.body,'tan',1.8);state.update(true,true);
  assert.equal(state.active,false);assert.equal(f.body.material.map,f.poster);
  f.video.readyState=2;state.update(true,true);assert.equal(state.active,true);
  const h=f.body.geometry.parameters.height;assert.ok(Math.abs(f.body.position.y+(.5-736/768)*h)<1e-6);
  const sample=f.body.material.map.userData.sampleAlpha;
  assert.equal(sample({x:.5,y:.5}),true);f.setPixel([255,0,255,255]);assert.equal(sample({x:.5,y:.5}),false);
  state.update(false,true);assert.equal(f.video.paused,true);assert.equal(state.active,true);
  state.update(false,false);assert.equal(f.body.material.map,f.poster);assert.equal(f.body.geometry,f.geometry);
  f.body.material.dispose();assert.equal(f.video.src,'');assert.equal(f.events.size,0);assert.equal(f.videoEvents.size,0);
  await new Promise(r=>setImmediate(r));assert.equal(f.video.paused,true);
 }finally{delete globalThis.document;}
});

test('blocked playback falls back without retrying every animation frame',async()=>{
 const f=fixture();let attempts=0;f.video.play=()=>{attempts++;return Promise.reject(new Error('blocked'));};globalThis.document=f.doc;
 try{
  const state=attachVisitorVideo(f.body,'aisha',1.8);state.update(true,true);
  await new Promise(r=>setImmediate(r));f.video.readyState=2;
  for(let i=0;i<10;i++)state.update(true,true);
  assert.equal(attempts,1);assert.equal(state.active,false);assert.equal(f.body.material.map,f.poster);
  f.body.material.dispose();
 }finally{delete globalThis.document;}
});
