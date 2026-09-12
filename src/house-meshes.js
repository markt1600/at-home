import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Keep moving doors separate; combine static furnishings to reduce draw calls.
export function optimizeHouse(world){
 const groups=new Map(),originals=[];world.houseRoot.updateMatrixWorld(true);const inverseRoot=world.houseRoot.matrixWorld.clone().invert();
 world.houseRoot.traverse(o=>{
  if(!o.isMesh||Array.isArray(o.material))return;
  for(let p=o;p;p=p.parent)if(p===world.door)return;
  const geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geometry.applyMatrix4(inverseRoot.clone().multiply(o.matrixWorld));
  const list=groups.get(o.material)||[];list.push(geometry);groups.set(o.material,list);originals.push(o);
 });
 for(const o of originals){o.removeFromParent();o.geometry.dispose();}
 for(const [material,geometries] of groups){const merged=mergeGeometries(geometries,false);for(const g of geometries)g.dispose();if(!merged)throw new Error('House geometry merge failed');const mesh=new THREE.Mesh(merged,material);mesh.name='Static house material';mesh.castShadow=!material.transparent;mesh.receiveShadow=true;world.houseRoot.add(mesh);}
 return {originalMeshes:originals.length,materialGroups:groups.size};
}
