import * as THREE from 'three';
import {memoryAppearance} from './memory-media.js';
export function createMemoryMarker(memory){
 const appearance=memoryAppearance(memory),group=new THREE.Group();group.name=appearance.label;group.position.set(...memory.position);group.userData.memoryId=memory.id;
 const material=new THREE.MeshBasicMaterial({color:appearance.color,transparent:true,opacity:.85,depthWrite:false,side:THREE.DoubleSide});
 const flat=geometry=>{const m=new THREE.Mesh(geometry,material.clone());m.rotation.x=-Math.PI/2;m.position.y=.027;group.add(m);return m;};
 flat(new THREE.RingGeometry(.16,.19,48));
 if(appearance.kind==='video'){
  const shape=new THREE.Shape();shape.moveTo(-.052,-.072);shape.lineTo(.075,0);shape.lineTo(-.052,.072);shape.closePath();flat(new THREE.ShapeGeometry(shape));
 }else{
  const outer=new THREE.Shape();outer.moveTo(-.09,-.065);outer.lineTo(.09,-.065);outer.lineTo(.09,.065);outer.lineTo(-.09,.065);outer.closePath();
  const inner=new THREE.Path();inner.moveTo(-.073,-.049);inner.lineTo(-.073,.049);inner.lineTo(.073,.049);inner.lineTo(.073,-.049);inner.closePath();outer.holes.push(inner);flat(new THREE.ShapeGeometry(outer));
  const mountain=new THREE.Shape();mountain.moveTo(-.066,-.039);mountain.lineTo(-.016,.025);mountain.lineTo(.029,-.039);mountain.closePath();flat(new THREE.ShapeGeometry(mountain));
  const sun=flat(new THREE.CircleGeometry(.016,16));sun.position.x=.047;sun.position.z=-.022;
 }
 material.dispose();return group;
}
