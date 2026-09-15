import * as THREE from 'three';
import {batchObject} from './movable-furniture.js';
import {ShoeHandling} from './shoe-handling.js';

export class ShoeTidying{
 constructor(world,bench){
  this.world=world;this.bench=bench;this.shoes=[];this.held=null;this.animation=new ShoeHandling(world,this);
  bench.updateWorldMatrix(true,true);
  world.houseInteractions.add({id:'shoe-rack',pos:bench.localToWorld(new THREE.Vector3(0,.34,.26)),range:2.4,surfaceOffset:.16,touchRadius:.23,
   available:()=>!!this.held||this.animation.stage==='placing',label:()=>this.animation.active?this.animation.label:`Place ${this.held?.name||'shoe'} neatly by the bench`,activate:()=>this.place(),update:dt=>this.animation.update(dt)});
 }
 add(group,name){
  batchObject(group);let height=0;group.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();height=Math.max(height,o.geometry.boundingBox.max.y);}});
  const index=this.shoes.length,entry={group,name,height,start:group.position.clone(),yaw:group.rotation.y,tidy:false};this.shoes.push(entry);group.updateWorldMatrix(true,true);
  const pos=group.localToWorld(new THREE.Vector3(0,.07,0));
  this.world.houseInteractions.add({id:'shoe-'+index,pos,touchObjects:[group],range:2.1,surfaceOffset:.13,
   available:()=>!entry.tidy&&!this.held&&(!this.animation.active||this.animation.entry===entry),label:()=>this.animation.active?this.animation.label:`Pick up ${name}`,activate:()=>this.pickUp(entry)});
 }
 pickUp(entry){
  if(this.held||entry.tidy)return false;return this.animation.start(entry);
 }
 place(){
  if(!this.held)return false;return this.animation.start(this.held,true);
 }
 slot(entry){const index=this.shoes.indexOf(entry),row=Math.floor(index/8),col=index%8;return new THREE.Vector3(-.56+col*.16,row===0?.12:.016,row===0?0:.43+(row-1)*.32);}
 announcePlaced(){
  const remaining=this.shoes.filter(s=>!s.tidy).length;this.world.onHouseMessage?.(remaining?`Shoe placed neatly · ${remaining} left to tidy.`:'All the shoes are neatly arranged.');
 }
 restore(entry){this.bench.add(entry.group);entry.group.position.copy(entry.start);entry.group.rotation.set(0,entry.yaw,0);entry.tidy=false;entry.group.visible=true;entry.group.updateMatrixWorld(true);if(this.held===entry)this.held=null;}
 reset(){this.animation.finish();for(const entry of this.shoes)this.restore(entry);this.held=null;}
}
