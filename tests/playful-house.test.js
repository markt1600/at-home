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
 const front=new THREE.Vector3(0,0,1).transformDirection(g.matrixWorld);assert.ok(front.z<-.99);assert.deepEqual([g.position.x,g.position.z],planPoint(436,465));
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
 const [x,z]=planPoint(936,691),eye=new THREE.Vector3(x,2.15,z),target=w.entranceNook.position.clone().add(new THREE.Vector3(-.07,1.1,.015)),direction=target.clone().sub(eye);
 assert.ok(inWalkableArea(x,z,true,w.colliders),'the nook can be approached from the hallway');
 assert.ok(!new THREE.Raycaster(eye,direction.clone().normalize(),.01,direction.length()-.17).intersectObject(w.houseRoot,true).some(h=>!h.object.material.transparent),'the return wall does not hide the bonsai');
 const art=w.houseRoot.getObjectByName('artBay'),normal=new THREE.Vector3(0,0,1).transformDirection(art.matrixWorld);assert.ok(normal.x<0&&normal.z<0);
 const stones=[];w.keydrop.traverse(o=>{if(o.isMesh&&o.material===w.houseMaterials.keydropStone)stones.push(o);});assert.ok(stones.length>=2,'main island and lower visible plinth share marble');
});
