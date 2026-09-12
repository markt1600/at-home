import test from 'node:test';
import assert from 'node:assert/strict';
import {floorPieces} from '../src/plan-geometry.js';
import {pointInPolygon} from '../src/house-layout.js';
test('raised floor surfaces cannot cover the steps cut through their edge',()=>{
 const room=[[0,0],[5,0],[5,5],[0,5]],stair={polygon:[[2,-1],[3,-1],[3,2],[2,2]]};
 const parts=floorPieces(room,[stair]);
 assert.ok(!parts.some(p=>pointInPolygon(2.5,1,p)));
 for(const p of [[1,1],[4,1],[2.5,4]])assert.ok(parts.some(poly=>pointInPolygon(...p,poly)));
 const area=p=>Math.abs(p.reduce((a,v,i)=>{const w=p[(i+1)%p.length];return a+v[0]*w[1]-w[0]*v[1];},0))/2;
 assert.equal(parts.reduce((n,p)=>n+area(p),0),23);
});
