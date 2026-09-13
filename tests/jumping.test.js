import test from 'node:test';
import assert from 'node:assert/strict';
import {moveWithJump,intersectsFootprint} from '../src/navigation.js';
import {createHouseModel} from '../scripts/house-model.mjs';
import {planPoint,floorHeight} from '../src/house-layout.js';

test('jumping lands on an actual sofa, bed and table without passing through their sides',()=>{
 const w=createHouseModel({optimize:false});
 const targets=[[391,628],[579,331],[416,802]];
 for(const [px,pz] of targets){const [x,z]=planPoint(px,pz);const c=w.colliders.find(c=>c.landable&&intersectsFootprint(x,z,c,0));assert.ok(c,`${px},${pz} has a landing surface`);
  // Approach the long side of each surface, using the same physics as the player.
  const a=c.angle||0,dx=Math.sin(a),dz=Math.cos(a),edge=c.d/2+.20;
  let p={x:c.x+dx*edge,z:c.z+dz*edge,y:floorHeight(c.x+dx*edge,c.z+dz*edge),vy:0,grounded:true};
  const before=moveWithJump(p,-dx*.2,-dz*.2,.1,[c]);assert.ok(Math.hypot(before.x-p.x,before.z-p.z)<.09,'cannot walk into furniture');
  let highest=p.y;for(let i=0;i<110;i++){const move=i<38?.025:0;p=moveWithJump(p,-dx*move,-dz*move,1/60,[c],i===0);highest=Math.max(highest,p.y);}
  assert.ok(highest>=c.top,`jump clears surface ${px},${pz}`);assert.equal(p.grounded,true);assert.ok(Math.abs(p.y-c.top)<.001,`lands on top ${px},${pz}`);
 }
});
test('a held jump does not tunnel through a full-height wall or launch while airborne',()=>{
 const [x,z]=planPoint(490,675),c={x:x+.7,z,w:.16,d:3};let p={x,z,y:0,vy:0,grounded:true};
 for(let i=0;i<100;i++)p=moveWithJump(p,.15,0,1/30,[c],true);
 assert.ok(p.x<x+.7-.2);assert.ok(p.y<1.2);
 const falling=moveWithJump({x,z,y:.6,vy:-1,grounded:false},0,0,.1,[],true);assert.ok(falling.vy<-1);
});

test('the fitted corner cushions support a jump from the living room',()=>{
 const w=createHouseModel({optimize:false}),[x,z]=planPoint(549,607);
 let p={x,z,y:0,vy:0,grounded:true};
 const blocked=moveWithJump(p,.35,0,.15,w.colliders);
 assert.ok(blocked.x<x+.25,'cannot walk through the cushion front');
 for(let i=0;i<120;i++)p=moveWithJump(p,i<37?.025:0,0,1/60,w.colliders,i===0);
 assert.ok(p.x>planPoint(562,607)[0],'jump reaches the seat');
 assert.equal(p.grounded,true);assert.ok(Math.abs(p.y-.9)<.001,'feet rest on the visible cushion top');
});
