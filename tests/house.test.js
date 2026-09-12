import test from 'node:test';
import assert from 'node:assert/strict';
import {createHouseModel} from '../scripts/house-model.mjs';
import {HOUSE_VIEWS,HOUSE_STAIRS,HOUSE_ROOMS,planPoint,floorHeight,pointInPolygon} from '../src/house-layout.js';
import {inWalkableArea} from '../src/navigation.js';
const world=createHouseModel();
test('every quick-view position is inside the house and clear of solid furniture',()=>{
 for(const [id,p] of Object.entries(HOUSE_VIEWS))assert.ok(inWalkableArea(p[0],p[2],true,world.colliders),id);
});
test('all named locations are reachable from the hall through actual doorways',()=>{
 const step=.1,key=(x,z)=>`${x},${z}`,p=HOUSE_VIEWS.hall,start=[Math.round(p[0]/step),Math.round(p[2]/step)],queue=[start],seen=new Set([key(...start)]);
 for(let n=0;n<queue.length;n++){const [x,z]=queue[n];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(seen.has(k)||!inWalkableArea(nx*step,nz*step,true,world.colliders)||Math.abs(floorHeight(nx*step,nz*step)-floorHeight(x*step,z*step))>.12)continue;seen.add(k);queue.push([nx,nz]);}}
 for(const [id,p] of Object.entries(HOUSE_VIEWS))assert.ok(seen.has(key(Math.round(p[0]/step),Math.round(p[2]/step))),`${id} cannot be reached`);
});
test('the plan scale and stepped floor levels match the dimensioned drawing',()=>{
 const [x0]=planPoint(302,0),[x1]=planPoint(953,0);assert.ok(Math.abs(x1-x0-16.88)<1e-8);
 for(const [id,height] of [['living',0],['hall',.45],['dining',.45],['kitchen',.45],['bedroom',.75],['wine',.75]])assert.equal(HOUSE_ROOMS.find(r=>r.id===id).floor,height);
});
test('outer boundaries, walls and large furniture stop movement',()=>{
 for(const p of [[180,600],[1100,700],[510,300],[579,331],[758,555]])assert.equal(inWalkableArea(...planPoint(...p),true,world.colliders),false,p.join(','));
 assert.ok(inWalkableArea(...planPoint(816,680),true,world.colliders));
});
test('all stair runs join their declared levels continuously',()=>{
 for(const s of HOUSE_STAIRS){
  const axis=s.axis==='x'?0:1,v=s.polygon.map(p=>p[axis]),lo=Math.min(...v),hi=Math.max(...v),other=s.polygon.reduce((n,p)=>n+p[1-axis],0)/4;
  for(const t of [0,.25,.5,.75,1]){const p=axis===0?[lo+t*(hi-lo),other]:[other,lo+t*(hi-lo)];assert.ok(Math.abs(floorHeight(...p)-(s.low+(s.high-s.low)*(s.reverse?1-t:t)))<1e-7,s.id);}
 }
});
test('static mesh batching retains the separate moving front door',()=>{assert.ok(world.optimization.originalMeshes>1000);assert.ok(world.optimization.materialGroups<160);assert.ok(world.door.children.length>=2);});
