import * as THREE from 'three';
import {PetBone} from './pet-bone.js';
import {BoneThrow} from './bone-throw.js';

export function installPetBone(world){
 const bone=new PetBone(world.petRoaming,{onChange:()=>world.onBoneChange?.(),onMessage:message=>world.onHouseMessage?.(message)}),group=new THREE.Group();group.name='Leo’s fetch bone';group.userData.dynamic=true;
 const material=new THREE.MeshStandardMaterial({color:0xe9d4a4,roughness:.86});
 const shaft=new THREE.Mesh(new THREE.CapsuleGeometry(.024,.13,4,10),material);shaft.rotation.z=Math.PI/2;group.add(shaft);
 const geo=new THREE.SphereGeometry(.038,12,8);for(const x of [-.096,.096])for(const z of [-.021,.021]){const end=new THREE.Mesh(geo,material);end.position.set(x,0,z);group.add(end);}
 world.scene.add(group);const position=new THREE.Vector3();
 bone.mesh=group;
 world.boneThrow=new BoneThrow(world,bone);
 world.houseInteractions.add({id:'leo-bone',pos:position,range:2.65,touchRadius:.20,label:()=>"Pick up and throw Leo’s bone",available:()=>bone.canThrow(world.camera.position),activate:()=>world.boneThrow.start(),update:dt=>world.boneThrow.update(dt)});
 bone.updateModel=()=>{
  if(world.boneThrow.held)return;
  group.position.set(bone.x,bone.y,bone.z);position.copy(group.position);group.rotation.set(0,0,0);
  if(bone.phase==='throw'){group.rotation.z=bone.time*8;group.rotation.y=bone.time*3;}
  if(bone.phase==='return')group.rotation.y=bone.heading||0;
  const film=world.actors.get('sunny')?.userData.currentFilm;
  // Carrying views hold the bone between his jaws. The floor object reappears
  // only when he drops it; a separate 3D prop would float ahead of the sprite.
  group.visible=!!bone.life&&bone.phase!=='return'&&!(bone.phase==='chew'&&film?.includes('chew'));
 };return bone;
}
