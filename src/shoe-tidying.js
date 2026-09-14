import * as THREE from 'three';
import {batchObject} from './movable-furniture.js';

export class ShoeTidying{
 constructor(world,bench){
  this.world=world;this.bench=bench;this.shoes=[];this.held=null;
  bench.updateWorldMatrix(true,true);
  world.houseInteractions.add({id:'shoe-rack',pos:bench.localToWorld(new THREE.Vector3(0,.34,.26)),range:2.4,surfaceOffset:.16,touchRadius:.23,
   available:()=>!!this.held,label:()=>`Place ${this.held?.name||'shoe'} neatly by the bench`,activate:()=>this.place()});
 }
 add(group,name){
  batchObject(group);const index=this.shoes.length,entry={group,name,start:group.position.clone(),yaw:group.rotation.y,tidy:false};this.shoes.push(entry);group.updateWorldMatrix(true,true);
  const pos=group.localToWorld(new THREE.Vector3(0,.07,0));
  this.world.houseInteractions.add({id:'shoe-'+index,pos,touchObjects:[group],range:2.1,surfaceOffset:.13,
   available:()=>!entry.tidy&&!this.held,label:()=>`Pick up ${name}`,activate:()=>this.pickUp(entry)});
 }
 pickUp(entry){
  if(this.held||entry.tidy)return;this.held=entry;this.world.camera.add(entry.group);entry.group.position.set(.26,-.38,-.58);entry.group.rotation.set(-.25,.3,-.2);
  this.world.onHouseMessage?.('Carry the shoe to the metal bench and place it neatly.');
 }
 place(){
  if(!this.held)return;const entry=this.held,index=this.shoes.indexOf(entry),row=Math.floor(index/8),col=index%8;
  this.bench.add(entry.group);entry.group.position.set(-.56+col*.16,row===0?.12:.016,row===0?0:.43+(row-1)*.32);entry.group.rotation.set(0,0,0);entry.group.updateMatrixWorld(true);entry.tidy=true;this.held=null;
  const remaining=this.shoes.filter(s=>!s.tidy).length;this.world.onHouseMessage?.(remaining?`Shoe placed neatly · ${remaining} left to tidy.`:'All the shoes are neatly arranged.');
 }
 reset(){for(const entry of this.shoes){this.bench.add(entry.group);entry.group.position.copy(entry.start);entry.group.rotation.set(0,entry.yaw,0);entry.tidy=false;entry.group.updateMatrixWorld(true);}this.held=null;}
}
