import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHouseModel} from '../scripts/house-model.mjs';
import {PetRoaming} from '../src/pet-roaming.js';
import {planPoint} from '../src/house-layout.js';
import {footprintsOverlap} from '../src/movable-furniture.js';
import {inWalkableArea} from '../src/navigation.js';

test('chairs move with their colliders, stop at obstacles and remain on their floor',()=>{
 const w=createHouseModel(),f=w.movableFurniture;assert.equal(f.items.length,7);
 for(const item of [f.items[0],f.items[1]]){
  const c=item.collider,start=c.x,player={x:c.x-c.w/2-.14,z:c.z,y:c.base,grounded:true};
  f.push(player,.06,0);assert.ok(c.x>start,c.label);assert.equal(item.group.position.x,c.x);
  const block={x:c.x+c.w/2+.10,z:c.z,w:.10,d:2};w.colliders.push(block);
  f.push({...player,x:c.x-c.w/2-.14},.20,0);assert.ok(!footprintsOverlap(c,block,0));
  const before=c.x;f.push({...player,grounded:false},.2,0);assert.equal(c.x,before);
  assert.ok(!f.canMove(c,...planPoint(490,650)),'chair cannot cross into the sunken floor');
  w.colliders.pop();
 }
 f.reset();for(const {group,start,collider} of f.items){assert.ok(group.position.equals(start));assert.equal(collider.x,start.x);}
});

test('all scattered shoes can be selected and neatly placed by the bench',()=>{
 const w=createHouseModel(),tidy=w.shoeTidy,controls=w.houseInteractions,r=new PetRoaming(w.colliders);w.houseRoot.updateMatrixWorld(true);assert.equal(tidy.shoes.length,22);
 const select=item=>[...r.nodes.values()].filter(n=>Math.hypot(n.x-item.pos.x,n.z-item.pos.z)<1.9).some(n=>{w.camera.position.set(n.x,n.y+1.67,n.z);w.camera.lookAt(item.pos);return controls.select()===item.id;});
 for(let i=0;i<tidy.shoes.length;i++){
  const entry=tidy.shoes[i],item=controls.items.get('shoe-'+i);assert.ok(select(item),'reachable shoe '+i);
  item.activate();assert.equal(tidy.held,entry);assert.equal(entry.group.parent,w.camera);assert.ok(!item.available());
  const rack=controls.items.get('shoe-rack');assert.ok(select(rack),'reachable bench');rack.activate();assert.ok(entry.tidy);assert.equal(tidy.held,null);assert.equal(entry.group.parent,w.lobbyBench);w.houseRoot.updateMatrixWorld(true);
 }
 tidy.reset();assert.ok(tidy.shoes.every(s=>!s.tidy&&s.group.position.equals(s.start)));
});

test('claw faces the bedroom landing, catches aligned prizes and restores the player on exit',()=>{
 const w=createHouseModel(),game=w.clawGame,g=game.machine;w.houseRoot.updateMatrixWorld(true);
 const front=new THREE.Vector3(0,0,1).transformDirection(g.matrixWorld);assert.ok(front.x>.99&&Math.abs(front.z)<.001);assert.deepEqual([g.position.x,g.position.z],planPoint(436,465));
 const control=w.houseInteractions.items.get('claw-machine');assert.ok(control.pos.x>g.position.x,'controls face clockwise into the landing');
 const collider=w.colliders.find(c=>c.label===g.name);assert.equal(collider.angle,g.rotation.y);
 // Use the aisle between the claw and the newly added pinball cabinet, rather
 // than the old standing point at the pinball cabinet's collision margin.
 const approach=g.position.clone().addScaledVector(front,1);
 assert.ok(inWalkableArea(approach.x,approach.z,true,w.colliders),'clear landing in front of the controls');
 w.camera.position.set(approach.x,g.position.y+1.67,approach.z);w.camera.lookAt(control.pos);
 assert.equal(w.houseInteractions.select(),'claw-machine','the controls can be used from the clear aisle');
 w.yaw=.3;w.pitch=-.1;w.feet={x:0,y:.75,z:0,grounded:true};w.eyeHeight=1.67;w.camera.position.set(0,2.42,0);const original=w.camera.position.clone();game.enter(w);
 game.keys.add('left');game.update(.1);assert.ok(game.x<0);game.keys.clear();
 const prize=game.prizes[1];game.x=prize.start.x;game.z=prize.start.z;assert.ok(game.grab());assert.ok(!game.grab());
 for(let i=0;i<60;i++)game.update(.1);assert.equal(game.phase,'won');assert.equal(game.score,1);assert.ok(prize.won);assert.equal(prize.group.parent,g);
 game.nextRound();game.x=0;game.z=0;game.grab();for(let i=0;i<60;i++)game.update(.1);assert.equal(game.phase,'missed');assert.equal(game.score,1);
 game.leave();assert.ok(w.camera.position.equals(original));assert.equal(w.yaw,.3);assert.equal(w.pitch,-.1);assert.equal(game.active,false);
 game.reset();assert.equal(game.score,0);assert.ok(game.prizes.every(p=>!p.won&&p.group.visible&&p.group.position.equals(p.start)));
});

test('entrance window recess, gallery windows and marble surfaces match the references',()=>{
 const w=createHouseModel({optimize:false});w.houseRoot.updateMatrixWorld(true);
 const kitchen=w.architectureWalls.find(w=>w.id==='kitchen-north');assert.equal(kitchen.apertures.filter(a=>a.kind==='window').length,2);
 assert.ok(w.architectureWalls.some(w=>w.apertures.some(a=>a.id==='entry-nook-window')));
 assert.ok(w.entranceNook);assert.ok(w.houseRoot.getObjectByName('Green tiled wall display beside kitchen window'));
 const [x,z]=planPoint(914,677),eye=new THREE.Vector3(x,2.15,z),target=w.entranceNook.localToWorld(new THREE.Vector3(-.07,1.1,-.24)),direction=target.clone().sub(eye);
 assert.ok(inWalkableArea(x,z,true,w.colliders),'the nook can be approached from the hallway');
 assert.ok(!new THREE.Raycaster(eye,direction.clone().normalize(),.01,direction.length()-.17).intersectObject(w.houseRoot,true).some(h=>!h.object.material.transparent),'the return wall does not hide the bonsai');
 const art=w.houseRoot.getObjectByName('artBay'),normal=new THREE.Vector3(0,0,1).transformDirection(art.matrixWorld);assert.ok(normal.x<0&&normal.z>0);
 const stones=[];w.keydrop.traverse(o=>{if(o.isMesh&&o.material===w.houseMaterials.keydropStone)stones.push(o);});assert.ok(stones.length>=2,'main island and lower visible plinth share marble');
});

test('entrance niche opens into the apartment flush with the shoe cupboard and leaves the office approach clear',()=>{
 const w=createHouseModel({optimize:false});w.houseRoot.updateMatrixWorld(true);
 assert.ok(!w.architectureWalls.some(w=>w.id==='entry-nook-side-return'),'no invented partition in front of the niche');
 const aperture=w.architectureWalls.flatMap(w=>w.apertures).find(a=>a.id==='entry-nook-window');
 assert.deepEqual(aperture.center,[984,666.5]);assert.equal(aperture.width,.9);assert.equal(aperture.height,1.25);
 const face=new THREE.Vector3(0,0,1).transformDirection(w.entranceNook.matrixWorld);assert.ok(face.x<-.999&&Math.abs(face.z)<.001);
 const front=name=>w.houseRoot.getObjectByName(name).localToWorld(new THREE.Vector3(0,0,.009)).x;
 assert.ok(Math.abs(front('Nook lower cupboard front')-front('Shoe cupboard front beside nook'))<1e-6);
 for(const name of ['Bonsai inside entrance recess','Camera inside entrance recess']){
  const pos=w.houseRoot.getObjectByName(name).getWorldPosition(new THREE.Vector3());assert.ok(pos.x>w.entranceJoinery.frontX&&pos.x<w.entranceJoinery.backX,name+' stays within the recess');
 }
 for(const p of [[928,640],[928,659],[939,659],[939,676]])assert.ok(inWalkableArea(...planPoint(...p),true,w.colliders),'clear office/nook approach '+p);
 // The picture and intercom share the short end return, not the cabinet backing.
 const art=w.houseRoot.getObjectByName('artBay'),normal=new THREE.Vector3(0,0,1).transformDirection(art.matrixWorld),wallMeshes=[];
 w.houseRoot.traverse(o=>{if(o.isMesh&&o.userData.architecture)wallMeshes.push(o);});
 const hit=new THREE.Raycaster(art.position,normal.clone().negate(),0,.15).intersectObjects(wallMeshes,false)[0];assert.equal(hit.object.name,'shoe-cabinet-return');
});
