import test from 'node:test';
import assert from 'node:assert/strict';
import {createHouseModel} from '../scripts/house-model.mjs';
import {MassageSession,MASSAGE_SECONDS} from '../src/massage-session.js';
import {inWalkableArea} from '../src/navigation.js';

function setup(){const w=createHouseModel();w.handInteraction={active:false};w.resumeWandering=()=>{};w.motion=true;w.yaw=0;w.pitch=-.3;w.keys={};w.touchMove={};const m=w.massage=new MassageSession(w,w.massageChair);w.camera.position.copy(m.stance);w.camera.position.y+=1.67;const events=[];w.onMassageChange=s=>events.push(s);w.onMassageAudio=a=>events.push('audio:'+a);w.onMassageMusic=()=>events.push('music');return {w,m,events};}
function until(m,stage){for(let i=0;i<1600&&m.stage!==stage;i++)m.update(.025);assert.equal(m.stage,stage);}
test('chair gives a full 30 seconds once reclined, then steps out onto the clear landing',()=>{
 const {w,m,events}=setup();assert.ok(m.start());until(m,'massage');assert.equal(m.seconds,0);assert.equal(m.recline,1);assert.ok(m.body.visible);assert.ok(events.includes('music'));
 for(let i=0;i<1199;i++)m.update(.025);assert.equal(m.stage,'massage');assert.ok(m.seconds<MASSAGE_SECONDS);m.update(.025);m.update(.025);assert.equal(m.stage,'upright');assert.ok(m.active);
 until(m,'idle');assert.equal(m.body.visible,false);assert.equal(m.cradle.rotation.x,0);assert.ok(inWalkableArea(w.camera.position.x,w.camera.position.z,true,w.colliders));assert.ok(w.camera.position.distanceTo(m.stance.clone().setY(m.stance.y+1.67))<.001);
 assert.deepEqual(events.filter(s=>!s.startsWith('audio:')&&s!=='music'),['approach','enter','recline','massage','upright','exit','idle']);
});
test('cancelling at every seated stage reverses the entry without teleporting or releasing early',()=>{
 for(const stage of ['enter','recline','massage']){const {w,m}=setup();m.start();until(m,stage);m.update(.35);const before=w.camera.position.clone();m.cancel();assert.ok(m.active);m.update(.025);assert.ok(w.camera.position.distanceTo(before)<.03,stage);assert.ok(['upright','exit'].includes(m.stage));until(m,'idle');assert.equal(m.seated,0);assert.ok(inWalkableArea(w.camera.position.x,w.camera.position.z,true,w.colliders));}
});
test('the view remains free, movement input is suppressed, and reduced motion disables massage jiggle',()=>{
 const {w,m}=setup();m.start();until(m,'massage');w.yaw+=.7;w.pitch=-.8;const yaw=w.yaw,pitch=w.pitch;w.keys={KeyW:true};w.touchMove={x:1,z:1};w.jumpQueued=true;m.update(.1);assert.equal(w.yaw,yaw);assert.equal(w.pitch,pitch);assert.deepEqual(w.keys,{});assert.equal(w.jumpQueued,false);
 w.motion=false;m.update(.1);const before=w.camera.position.clone();m.update(.1);assert.equal(m.roll,0);assert.deepEqual(w.camera.position.toArray(),before.toArray());
});
test('unreachable starts are rejected and pause advances neither the massage nor the exit',()=>{
 const {w,m}=setup();w.camera.position.x+=10;assert.equal(m.start(),false);w.camera.position.copy(m.stance).setY(m.stance.y+1.67);m.start();until(m,'massage');m.update(0);assert.equal(m.seconds,0);m.cancel();const stage=m.stage;for(let i=0;i<30;i++)m.update(0);assert.equal(m.stage,stage);
});
test('the chair keeps its furniture collision and compact moving mesh batches',()=>{
 const {w,m}=setup();assert.ok(m.cradle.children.filter(o=>o.isMesh).length<=10);assert.ok(w.optimization.materialGroups<180);assert.ok(!inWalkableArea(m.group.position.x,m.group.position.z,true,w.colliders));
 w.camera.lookAt(w.houseInteractions.items.get('massage-chair').pos);w.houseRoot.updateMatrixWorld(true);assert.equal(w.houseInteractions.select(),'massage-chair');
});
