import test from 'node:test';
import assert from 'node:assert/strict';
import {litCircuits,LIGHT_CIRCUITS,TREE_PLAN} from '../src/christmas-tree.js';
import {planPoint,HOUSE_ROOMS,pointInPolygon} from '../src/house-layout.js';

test('the Christmas lights blink: circuits go on and off over time, never all dark at once',()=>{
 const frames=[];for(let t=0;t<12;t+=1/30)frames.push(litCircuits(t));
 assert.ok(frames.every(f=>f.length===LIGHT_CIRCUITS));
 assert.ok(frames.every(f=>f.some(Boolean)),'the tree is never fully dark while the lights are on');
 for(let i=0;i<LIGHT_CIRCUITS;i++){
  const on=frames.filter(f=>f[i]).length,off=frames.length-on,changes=frames.filter((f,k)=>k&&f[i]!==frames[k-1][i]).length;
  assert.ok(on>0&&off>0,`circuit ${i} both lights and darkens`);assert.ok(changes>=6,`circuit ${i} blinks several times in 12 s (${changes})`);
 }
 assert.ok(frames.some(f=>f.filter(Boolean).length<LIGHT_CIRCUITS),'not every circuit is always on');
});

test('the tree stands in the sunken living room beside the turntable',()=>{
 const [x,z]=planPoint(...TREE_PLAN);
 assert.equal(HOUSE_ROOMS.find(r=>pointInPolygon(x,z,r.polygon))?.id,'living');
 const [tx,tz]=planPoint(333,700);assert.ok(Math.hypot(x-tx,z-tz)<1.2,'within reach of the turntable rack');
});
