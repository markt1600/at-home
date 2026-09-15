import test from 'node:test';
import assert from 'node:assert/strict';
import {memoryHasAudio} from '../src/memory-media.js';

test('silent photos preserve the turntable while soundtracks and embedded video audio take priority',()=>{
 assert.equal(memoryHasAudio({type:'image',src:'one.jpg'}),false);
 assert.equal(memoryHasAudio({media:[{type:'image',src:'one.jpg'},{type:'image',src:'two.jpg'}],soundtrack:null}),false);
 assert.equal(memoryHasAudio({type:'image',soundtrack:{title:'Removed song'}}),false);
 assert.equal(memoryHasAudio({type:'image',soundtrack:{src:'song.mp3'}}),true);
 assert.equal(memoryHasAudio({type:'video',src:'movie.mp4'}),true);
 assert.equal(memoryHasAudio({type:'image',media:[{type:'image',src:'one.jpg'},{type:'video',src:'movie.mp4'}]}),true);
 assert.equal(memoryHasAudio(null),false);
});
