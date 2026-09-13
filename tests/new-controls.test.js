import test from 'node:test';
import assert from 'node:assert/strict';
import {petDirection} from '../src/pet-direction.js';
import {lookedAtMemory,selectMemory} from '../src/memory-selection.js';
import {downloadVideo} from '../src/video-download.js';
test('pets use camera-relative front, rear and side views with stable turning thresholds',()=>{
 assert.equal(petDirection(0,1,0,3).view,'front');assert.equal(petDirection(0,-1,0,3).view,'back');
 assert.equal(petDirection(1,0,0,3).view,'side');assert.equal(petDirection(1,0,0,3).side,1);
 assert.equal(petDirection(1,0,3,0).view,'front');assert.equal(petDirection(1,0,-3,0).view,'back');
 assert.equal(petDirection(.8,.6,0,1,'front').view,'front');assert.equal(petDirection(.8,.6,0,1,'side').view,'side');
 assert.equal(petDirection(0,0,0,0,'back').view,'back');
});
test('a visible distant ring can be named but cannot be activated; walls hide its label',()=>{
 const memory={id:'distant',position:[0,0,-3]},position={x:0,y:1.7,z:0},direction={x:0,y:-1.673,z:-3};
 assert.equal(lookedAtMemory([memory],position,direction),memory);
 assert.equal(selectMemory([memory],position,direction,0).memory,null);
 assert.equal(lookedAtMemory([memory],position,direction,{visible:()=>false}),null);
});
test('full video download retries a failed chunk and joins byte ranges without gaps',async()=>{
 const data=Uint8Array.from({length:19},(_,i)=>i);let failed=false;const ranges=[],progress=[];
 const fetcher=async(url,{headers})=>{const [,a,b]=/bytes=(\d+)-(\d+)/.exec(headers.Range),start=Number(a),end=Math.min(Number(b),data.length-1);ranges.push(start);if(start===8&&!failed){failed=true;throw new Error('offline');}return new Response(data.slice(start,end+1),{status:206,headers:{'content-range':`bytes ${start}-${end}/${data.length}`,'content-type':'video/mp4'}});};
 const blob=await downloadVideo('/memory',{fetcher,chunkSize:8,onProgress:(...p)=>progress.push(p)});
 assert.deepEqual(new Uint8Array(await blob.arrayBuffer()),data);assert.deepEqual(ranges,[0,8,8,16]);assert.deepEqual(progress.at(-1),[19,19]);
});
test('download supports full responses and rejects truncated range data',async()=>{
 assert.equal(await (await downloadVideo('/x',{fetcher:async()=>new Response('abc')})).text(),'abc');
 await assert.rejects(()=>downloadVideo('/x',{fetcher:async()=>new Response('a',{status:206,headers:{'content-range':'bytes 0-3/8'}})}),/ended early/);
 const c=new AbortController();c.abort();await assert.rejects(()=>downloadVideo('/x',{signal:c.signal,fetcher:()=>assert.fail('aborted')}),{name:'AbortError'});
});
