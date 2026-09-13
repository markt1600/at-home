import test from 'node:test';
import assert from 'node:assert/strict';
import {AssetReadiness} from '../src/asset-readiness.js';
test('entry stays blocked until every asset finishes, and transient errors recover',async()=>{
 let release,tries=0;const gate=new Promise(r=>release=r),states=[];
 const assets=new AssetReadiness([{id:'art',load:()=>gate},{id:'surfaces',load:async()=>{if(++tries<3)throw Error();}}],{delay:async()=>{},onChange:s=>states.push(s)});
 const run=assets.run();await Promise.resolve();assert.equal(assets.ready,false);assert.equal(assets.run(),run);release();assert.equal(await run,true);assert.equal(tries,3);assert.equal(states.at(-1).loading,false);
});
test('manual retry reloads failed assets without rebuilding successful textures',async()=>{
 let art=0,surface=0,fail=true;const assets=new AssetReadiness([{id:'art',load:async()=>art++},{id:'surface',load:async()=>{surface++;if(fail)throw Error();}}],{delay:async()=>{}});
 assert.equal(await assets.run(),false);assert.deepEqual(assets.failed,['surface']);assert.equal(art,1);assert.equal(surface,3);fail=false;assert.equal(await assets.run(),true);assert.equal(art,1);assert.equal(surface,4);
});
