import * as THREE from 'three';

// Layered geometry keeps the effect sharp at close range without a large texture.
export function splatterGeometry(radius,random=Math.random){
 const points=[];for(let i=0;i<40;i++){const a=i/40*Math.PI*2,r=radius*(.64+random()*.36)*(i%7===0?1.3:1);points.push(new THREE.Vector2(Math.cos(a)*r,Math.sin(a)*r));}
 const shape=new THREE.Shape();shape.moveTo(points[0].x,points[0].y);shape.splineThru([...points.slice(1),points[0]]);shape.closePath();return new THREE.ShapeGeometry(shape,70);
}

export class BloodEffects{
 constructor(scene,floor){this.scene=scene;this.floor=floor;this.drops=[];this.stains=[];this.random=Math.random;this.root=new THREE.Group();this.root.name='Blood effects';scene.add(this.root);this.dropGeometry=new THREE.SphereGeometry(.008,6,4);this.dropMaterial=new THREE.MeshStandardMaterial({color:0x670808,roughness:.24,metalness:.08});}
 stain(point,normal,radius,{parent=this.root,stretch=1,grow=false}={}){
  const mesh=new THREE.Mesh(splatterGeometry(radius,this.random),new THREE.MeshStandardMaterial({color:this.stains.length%3?0x470706:0x760f0b,roughness:.2,metalness:.12,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);mesh.position.copy(point).addScaledVector(normal,.006);mesh.scale.set(1,stretch,1);mesh.userData.grow=grow?0:null;mesh.userData.stretch=stretch;parent.add(mesh);this.stains.push(mesh);
  while(this.stains.length>240){const old=this.stains.shift();old.removeFromParent();old.geometry.dispose();old.material.dispose();}return mesh;
 }
 impact(point,direction,npc,surfaces){
  const up=new THREE.Vector3(0,1,0),side=new THREE.Vector3().crossVectors(direction,up).normalize();
  for(let i=0;i<100;i++){
   const mesh=new THREE.Mesh(this.dropGeometry,this.dropMaterial),v=direction.clone().multiplyScalar(1+this.random()*3.6).addScaledVector(side,(this.random()-.5)*3.6);v.y+=(this.random()-.25)*3.8;
   mesh.position.copy(point);const size=.35+this.random()*1.1;mesh.scale.set(size,size*2.8,size);mesh.quaternion.setFromUnitVectors(up,v.clone().normalize());this.root.add(mesh);this.drops.push({mesh,v,life:1.4+this.random()*.7});
  }
  const base=new THREE.Vector3(npc.position.x,this.floor(npc.position.x,npc.position.z),npc.position.z);
  this.stain(base,up,.5,{stretch:1.28,grow:true});
  for(let i=0;i<18;i++){const p=base.clone().add(new THREE.Vector3((this.random()-.5)*1.45,0,(this.random()-.5)*1.45));p.y=this.floor(p.x,p.z);this.stain(p,up,.012+this.random()*.075,{stretch:1+this.random()*1.5});}
  // Wound follows the photographic body when it falls, rather than hovering in space.
  if(npc){npc.updateMatrixWorld(true);const local=npc.worldToLocal(point.clone());local.z=.018;this.stain(local,new THREE.Vector3(0,0,1),.075,{parent:npc,stretch:1.7});}
  const ray=new THREE.Raycaster(point.clone().addScaledVector(direction,.035),direction,0,3.2);surfaces.updateMatrixWorld(true);
  const hit=ray.intersectObject(surfaces,true).find(h=>h.face&&Math.abs(h.face.normal.clone().transformDirection(h.object.matrixWorld).y)<.6);
  if(hit){const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);if(normal.dot(direction)>0)normal.negate();this.stain(hit.point,normal,.26,{stretch:1.4});for(let i=0;i<14;i++){const p=hit.point.clone().addScaledVector(side,(this.random()-.5)*.6);p.y+=(this.random()-.45)*.9;this.stain(p,normal,.009+this.random()*.035,{stretch:1.2+this.random()*2});}}
 }
 update(dt,visible=true){
  this.root.visible=visible;for(const stain of this.stains){stain.visible=visible;if(stain.userData.grow!==null){stain.userData.grow=Math.min(1,stain.userData.grow+dt*.33);const s=.35+.65*stain.userData.grow;stain.scale.set(s,s*stain.userData.stretch,1);}}
  this.drops=this.drops.filter(p=>{p.life-=dt;p.v.y-=dt*9.81;p.mesh.position.addScaledVector(p.v,dt);const floor=this.floor(p.mesh.position.x,p.mesh.position.z);if(p.mesh.position.y<=floor+.008){const at=p.mesh.position.clone();at.y=floor;this.stain(at,new THREE.Vector3(0,1,0),.009+this.random()*.024,{stretch:1.7});p.life=0;}if(p.life<=0){p.mesh.removeFromParent();return false;}return true;});
 }
 reset(){for(const p of this.drops)p.mesh.removeFromParent();for(const s of this.stains){s.removeFromParent();s.geometry.dispose();s.material.dispose();}this.drops=[];this.stains=[];}
}
