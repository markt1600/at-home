import test from 'node:test';
import assert from 'node:assert/strict';
import {maskPortraitBackground} from '../src/portraits.js';

test('portrait cutouts preserve dark eyes and mouths enclosed by a face',()=>{
  const w=7,h=7,data=new Uint8ClampedArray(w*h*4);
  for(let i=0;i<w*h;i++)data[i*4+3]=255;
  for(let y=1;y<6;y++)for(let x=1;x<6;x++)for(let c=0;c<3;c++)data[(y*w+x)*4+c]=90;
  for(let c=0;c<3;c++)data[(3*w+3)*4+c]=0;
  maskPortraitBackground(data,w,h,1,1);
  assert.equal(data[3],0);
  assert.equal(data[(3*w+3)*4+3],255);
  assert.equal(data[(1*w+1)*4+3],255);
});

test('each atlas cell is masked separately without changing portrait colors',()=>{
  const data=new Uint8ClampedArray(8*4);
  for(let i=0;i<8;i++){data[i*4]=i===3?120:0;data[i*4+3]=255;}
  maskPortraitBackground(data,4,2,2,1);
  assert.equal(data[3*4],120);
  assert.equal(data[3*4+3],255);
  assert.equal(data[7*4+3],0);
});

test('black hair remains opaque even when connected to the background',()=>{
  const w=7,h=3,data=new Uint8ClampedArray(w*h*4);
  for(let i=0;i<w*h;i++)data[i*4+3]=255;
  // Two lit hair strands surround an unlit region open to the top edge.
  for(const x of [1,5])data[(w+x)*4]=40;
  maskPortraitBackground(data,w,h,1,1);
  assert.equal(data[(w+3)*4+3],255);
  assert.equal(data[w*4+3],0);
});
