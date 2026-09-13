import test from 'node:test';
import assert from 'node:assert/strict';
import {TELESCOPE_CLIPS,shuffledScenes,telescopeIsNight} from '../src/telescope.js';
test('every telescope scene is offered once per shuffled batch',()=>{
 const a=shuffledScenes(()=>.1),b=shuffledScenes(()=>.9);assert.deepEqual([...a].sort(),[...TELESCOPE_CLIPS].sort());assert.notDeepEqual(a,b);assert.equal(a.length,5);
});
test('telescope switches to the sky at night on every game day',()=>{
 for(const h of [0,5.9,19,23,43])assert.equal(telescopeIsNight(h),true);
 for(const h of [6,12,18.9,36])assert.equal(telescopeIsNight(h),false);
});
