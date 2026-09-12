import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {keyStandingAtlas,createStandingVisitor,animateStandingVisitor,visibleVisitorHit,VISITOR_IDS} from '../src/visitors.js';
test('standing cutouts preserve black clothing and separate empty space between legs',()=>{
 const w=90,h=120,d=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<d.length;i+=4)d.set([255,0,255,255],i);
 for(let k=0;k<3;k++)for(let y=8;y<115;y++)for(let x=k*30+8;x<k*30+23;x++){
  if(y>70&&x===k*30+15)continue;d.set([8,8,8,255],(y*w+x)*4);
 }
 const frames=keyStandingAtlas(d,w,h);
 assert.equal(d[(80*w+15)*4+3],0);assert.equal(d[(80*w+14)*4+3],255);assert.equal(frames.length,3);
 assert.ok(frames.every(f=>f.y1>114&&f.y0<9));
});
test('every visitor has one connected full-length body anchored to ground',()=>{
 const atlas=new THREE.Texture({width:300,height:600});atlas.userData.frames=Array.from({length:3},(_,i)=>({x0:i*100,x1:(i+1)*100,y0:0,y1:600}));
 for(let i=0;i<VISITOR_IDS.length;i++){
  const visitor=createStandingVisitor(atlas,i),body=visitor.userData.body;body.geometry.computeBoundingBox();
  const b=body.geometry.boundingBox;assert.ok(Math.abs(b.min.y+body.position.y)<1e-6);assert.ok(b.max.y+body.position.y>1.6&&b.max.y+body.position.y<1.9);
  assert.equal(visitor.children.filter(c=>c.name==='Complete visitor').length,1);
 }
});
test('shots through transparent parts of a visitor do not register a body hit',()=>{
 const map=new THREE.Texture({width:2,height:1});map.userData.pixels=new Uint8ClampedArray([0,0,0,0,60,50,40,255]);
 const object={material:{map}};
 assert.equal(visibleVisitorHit({object,uv:new THREE.Vector2(.1,.5)}),false);
 assert.equal(visibleVisitorHit({object,uv:new THREE.Vector2(.8,.5)}),true);
});
test('idle animation has independent timing, pauses and stops when motion is disabled or the body falls',()=>{
 const atlas=new THREE.Texture({width:300,height:600});atlas.userData.frames=Array.from({length:3},(_,i)=>({x0:i*100,x1:(i+1)*100,y0:0,y1:600}));
 const a=createStandingVisitor(atlas,0),b=createStandingVisitor(atlas,1),idle=a.userData.idle;
 assert.notEqual(idle.time.value,b.userData.idle.time.value);
 animateStandingVisitor(a,.2);assert.equal(idle.time.value,.2);
 animateStandingVisitor(a,0);assert.equal(idle.time.value,.2);
 animateStandingVisitor(a,1,false);assert.equal(idle.time.value,.2);assert.equal(idle.strength.value,0);
 animateStandingVisitor(a,.1,true);assert.equal(idle.strength.value,1);
 a.userData.fall=new THREE.Group();const time=idle.time.value;animateStandingVisitor(a,1);assert.equal(idle.time.value,time);
});

test('animated visitor shots sample the current silhouette instead of the original still',()=>{
 const map=new THREE.Texture();map.userData.sampleAlpha=uv=>uv.x>.3&&uv.x<.7;
 const object={material:{map}};
 assert.equal(visibleVisitorHit({object,uv:new THREE.Vector2(.1,.6)}),false);
 assert.equal(visibleVisitorHit({object,uv:new THREE.Vector2(.5,.6)}),true);
});
