import * as THREE from 'three';

// Standard lighting evaluates the full surface response even when a point
// light's distance falloff is exactly zero. The house has many small lights;
// skip that zero contribution, preserving every light and its authored range.
export function optimizeLocalLights(scene){
 const chunk=THREE.ShaderChunk.lights_fragment_begin.replace(
  'RE_Direct( directLight,', 'if ( directLight.visible ) RE_Direct( directLight,'
 );
 const materials=new Set();
 scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.isMeshStandardMaterial)materials.add(m);});
 for(const material of materials){
  if(material.userData.localLightCulling)continue;
  const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,renderer){
   previous.call(this,shader,renderer);
   shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',chunk);
  };
  material.customProgramCacheKey=()=>key+'-local-light-culling-v1';
  material.userData.localLightCulling=true;material.needsUpdate=true;
 }
}
