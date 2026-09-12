import test from 'node:test';
import assert from 'node:assert/strict';
import {RenderedVoice} from '../src/rendered-voice.js';
test('late generated speech is discarded after the player pauses or changes scene',async()=>{
 const originalFetch=globalThis.fetch,originalDocument=globalThis.document;let respond,started=0;
 globalThis.document={hidden:false};globalThis.fetch=()=>new Promise(resolve=>respond=resolve);
 const sound={volume:1,master:{},ctx:{
  decodeAudioData:async()=>({}),
  createBufferSource(){return {connect(){},start(){started++;},stop(){}};},
  createGain(){return {gain:{},connect(){},disconnect(){}};},
 }};
 try{const voice=new RenderedVoice(sound);const pending=voice.play({kind:'whisper',cue:0,name:'Resident'});voice.stop();respond({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});assert.equal(await pending,false);assert.equal(started,0);assert.equal(voice.speaking,false);}finally{globalThis.fetch=originalFetch;globalThis.document=originalDocument;}
});
test('a failed voice provider never starts an alternative speech renderer',async()=>{
 const originalFetch=globalThis.fetch;let notice=0;globalThis.fetch=async()=>({ok:false,status:503});
 try{const voice=new RenderedVoice({ctx:{},volume:1,onVoiceUnavailable(){notice++;}});assert.equal(await voice.play({}),false);assert.equal(notice,1);assert.equal(await voice.play({}),false);assert.equal(notice,1);}finally{globalThis.fetch=originalFetch;}
});
