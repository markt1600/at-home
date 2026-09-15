// Prepare every room, including materials not yet in the camera's view. Mirrors
// render to a linear offscreen target and need a different shader variant.
export async function prepareHouseRenderer(world){
 const {renderer,scene,camera}=world,target=renderer.getRenderTarget();
 world.preparingRenderer=true;
 try{
  renderer.setRenderTarget(null);
  await renderer.compileAsync(scene,camera);
  const reflection=world.reflections.surfaces[0];
  if(reflection){renderer.setRenderTarget(reflection.mesh.getRenderTarget());await renderer.compileAsync(scene,camera);}
 }finally{
  renderer.setRenderTarget(target);world.viewportDirty=true;world.preparingRenderer=false;
 }
}
