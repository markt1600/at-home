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

test('renderer preparation waits for textures and holds entry behind the last progress step',async()=>{
 let releaseTexture,releaseRenderer,prepared=0;
 const texture=new Promise(r=>releaseTexture=r),renderer=new Promise(r=>releaseRenderer=r),states=[];
 const assets=new AssetReadiness([{id:'art',load:()=>texture}],{prepare:()=>{prepared++;return renderer;},onChange:s=>states.push(s)});
 const run=assets.run();await Promise.resolve();assert.equal(prepared,0);assert.equal(assets.status.total,2);
 releaseTexture();await new Promise(r=>setImmediate(r));
 assert.equal(prepared,1);assert.equal(assets.ready,false);assert.equal(assets.status.loaded,1);assert.equal(assets.status.preparing,true);assert.equal(assets.run(),run);
 releaseRenderer();assert.equal(await run,true);assert.equal(assets.status.loaded,2);assert.equal(states.at(-1).preparing,false);
 await assets.run();assert.equal(prepared,1,'completed shaders are not prepared again on a menu visit');
});

test('a preparation failure can be retried without downloading the assets again',async()=>{
 let loads=0,prepares=0;const assets=new AssetReadiness([{id:'art',load:async()=>loads++}],{prepare:async()=>{if(++prepares===1)throw Error('Renderer unavailable');}});
 assert.equal(await assets.run(),false);assert.deepEqual(assets.failed,['renderer']);assert.equal(assets.status.preparing,false);
 assert.equal(await assets.run(),true);assert.equal(loads,1);assert.equal(prepares,2);
});
