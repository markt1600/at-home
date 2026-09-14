import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PinballGame} from '../src/pinball-game.js';
import {createHouseModel} from '../scripts/house-model.mjs';
import {planPoint} from '../src/house-layout.js';
import {moveAlongFloor} from '../src/navigation.js';

test('pinball launches, scores bumper hits, drives flippers and ends after three drains',()=>{
 const game=new PinballGame(new THREE.Group());assert.ok(!game.launch());game.active=true;assert.ok(game.launch());assert.ok(!game.launch());const before=game.ball.y;game.update(.016);assert.ok(game.ball.y<before);
 game.ball={x:-.35,y:.52,vx:0,vy:0};game.update(.016);assert.equal(game.score,100);assert.ok(Number.isFinite(game.ball.vx)&&Number.isFinite(game.ball.vy));
 game.ball={x:-.31,y:1.93,vx:0,vy:1};game.keys.add('left');for(let i=0;i<4;i++)game.update(.016);assert.ok(game.left>.5);assert.ok(game.ball.vy<0,'active flipper sends ball back up the table');
 const b={...game.ball};game.update(0);assert.deepEqual(game.ball,b);game.active=false;game.update(.05);assert.deepEqual(game.ball,b);game.active=true;
 for(let i=1;i<=3;i++){game.ball={x:0,y:2.5,vx:0,vy:1};game.phase='playing';game.update(.01);assert.equal(game.phase,i===3?'over':'ready');}
 game.launch();assert.equal(game.ballNumber,1);assert.equal(game.score,0);assert.equal(game.phase,'playing');
});

test('the landing keeps a clear passage between the machines and a walkable route up into the movie room',()=>{
 const world=createHouseModel({optimize:false});world.houseRoot.updateMatrixWorld(true);
 const machine=new THREE.Box3().setFromObject(world.pinballDetails.machine),claw=new THREE.Box3().setFromObject(world.clawGame.machine),garfield=new THREE.Box3().setFromObject(world.pinballDetails.garfield);
 assert.ok(machine.min.x-claw.max.x>=.90,'at least 90 cm remains between the actual rendered cabinets');
 assert.ok(garfield.max.z<planPoint(511,479)[1],'the statue and crate stay behind the stair mouth');
 assert.ok(machine.max.x<planPoint(523,435)[0]-.075,'the cabinet sits in front of the wall, not inside it');
 let [x,z]=planPoint(482,534);
 for(const plan of [[482,478],[473,459],[473,418],[468,388]]){const [tx,tz]=planPoint(...plan),result=moveAlongFloor(x,z,tx-x,tz-z,world.colliders);assert.ok(Math.hypot(result.x-tx,result.z-tz)<.025,'continuous walking route to '+plan);({x,z}=result);}
});
test('pinball is reachable opposite the claw and leaving restores the walking camera',()=>{
 const world=createHouseModel(),game=world.pinballGame,item=world.houseInteractions.items.get('pinball-machine');
 world.camera.position.copy(item.pos).add(new THREE.Vector3(-.12,.65,.92));world.camera.lookAt(item.pos);world.houseRoot.updateMatrixWorld(true);
 assert.equal(world.houseInteractions.select(),'pinball-machine');const ray=new THREE.Raycaster(world.camera.position,item.pos.clone().sub(world.camera.position).normalize());assert.equal(world.houseInteractions.selectRay(ray)?.id,'pinball-machine');
 const position=world.camera.position.clone();world.yaw=.2;world.pitch=-.3;world.feet={x:position.x,y:.75,z:position.z};world.eyeHeight=1.67;game.enter(world);assert.ok(game.active);assert.ok(world.camera.position.distanceTo(position)>.5);const flipper=game.visual.flippers[0];world.houseRoot.updateMatrixWorld(true);const target=flipper.localToWorld(new THREE.Vector3(.05,.02,0)),sight=new THREE.Raycaster(world.camera.position,target.clone().sub(world.camera.position).normalize());assert.equal(sight.intersectObject(world.houseRoot,true).find(h=>!h.object.material.transparent)?.object.parent,flipper,'the working flipper stays visible above the cabinet');game.keys.add('left');game.leave();assert.ok(!game.active);assert.equal(game.keys.size,0);assert.ok(world.camera.position.equals(position));assert.equal(world.yaw,.2);assert.equal(world.pitch,-.3);
 assert.equal(world.pinballDetails.garfield.name,'Garfield statue in blue pajamas');assert.ok(world.pinballDetails.machine.position.x>world.clawGame.machine.position.x+1);
});
