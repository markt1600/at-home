import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {scaleMaterialUVs} from './house-materials.js';
import {resolveSurfaceJoins} from './surface-joins.js';
// Keep moving doors separate; combine static furnishings to reduce draw calls.
export function optimizeHouse(world){
 const groups=new Map(),originals=[],records=[],emissiveMaterials=new Map();world.houseRoot.updateMatrixWorld(true);const inverseRoot=world.houseRoot.matrixWorld.clone().invert();
 world.houseRoot.traverse(o=>{
  if(!o.isMesh||Array.isArray(o.material))return;
  for(let p=o;p;p=p.parent)if(p===world.door||p.userData.dynamic)return;
  const geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
  if(o.material.userData.textureMeters)scaleMaterialUVs(geometry,o.material.userData.textureMeters);
  geometry.applyMatrix4(inverseRoot.clone().multiply(o.matrixWorld));
  let material=o.material;
  // Identical recessed light lenses were each allocating their own draw call.
  // Keep all authored texture/artwork materials separate for asynchronous loading.
  if(material.isMeshStandardMaterial&&material.emissiveIntensity===1.4&&!material.map&&!material.transparent&&!Object.values(world.houseMaterials).includes(material)){
   const key=[material.color.getHex(),material.emissive.getHex(),material.roughness,material.metalness,material.side].join(':');
   if(!emissiveMaterials.has(key))emissiveMaterials.set(key,material);material=emissiveMaterials.get(key);
  }
  records.push({geometry,material,box:o.geometry.type==='BoxGeometry'});originals.push(o);
 });
 const joins=resolveSurfaceJoins(records);
 for(const {geometry,material} of records){if(!geometry.attributes.position.count){geometry.dispose();continue;}const list=groups.get(material)||[];list.push(geometry);groups.set(material,list);}
 for(const o of originals){o.removeFromParent();o.geometry.dispose();}
 for(const [material,geometries] of groups){const merged=mergeGeometries(geometries,false);for(const g of geometries)g.dispose();if(!merged)throw new Error('House geometry merge failed');const mesh=new THREE.Mesh(merged,material);mesh.name='Static house material';mesh.castShadow=!material.transparent;mesh.receiveShadow=true;world.houseRoot.add(mesh);}
 return {originalMeshes:originals.length,materialGroups:groups.size,...joins};
}
