import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareHouseRenderer} from '../src/render-preparation.js';

function world(){
 const reflection={name:'mirror target'},original={name:'original target'},calls=[];let target=original;
 const w={scene:{},camera:{},reflections:{surfaces:[{mesh:{getRenderTarget:()=>reflection}}]},renderer:{getRenderTarget:()=>target,setRenderTarget:value=>target=value,compileAsync:async(scene,camera)=>{assert.equal(scene,w.scene);assert.equal(camera,w.camera);assert.equal(w.preparingRenderer,true);calls.push(target);}}};
 return {w,calls,original,reflection};
}
test('warmup compiles main and reflection shaders before restoring the normal viewport',async()=>{
 const {w,calls,original,reflection}=world();await prepareHouseRenderer(w);
 assert.deepEqual(calls,[null,reflection]);assert.equal(w.renderer.getRenderTarget(),original);assert.equal(w.preparingRenderer,false);assert.equal(w.viewportDirty,true);
});
test('a shader preparation error releases the render lock and restores the target for retry',async()=>{
 const {w,original}=world();w.renderer.compileAsync=async()=>{throw Error('Compilation unavailable');};
 await assert.rejects(prepareHouseRenderer(w),/Compilation unavailable/);
 assert.equal(w.renderer.getRenderTarget(),original);assert.equal(w.preparingRenderer,false);assert.equal(w.viewportDirty,true);
});
