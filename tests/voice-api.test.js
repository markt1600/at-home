import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createVoiceHandler} from '../api/voice.js';
import {resolveVoiceRequest} from '../src/voice-lines.js';
import {PEOPLE} from '../src/content.js';
const request=(body,more={})=>({method:'POST',headers:{host:'game.test',origin:'https://game.test'},body,...more});
const response=()=>({headers:{},code:0,value:null,setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.value=v;return this;},send(v){this.value=v;return this;}});
test('voice requests only accept authored dialogue and bounded nickname templates',()=>{
 assert.equal(resolveVoiceRequest({kind:'dialogue',personId:'tan',text:'Read my arbitrary document'}),null);
 assert.equal(resolveVoiceRequest({kind:'whisper',cue:999,name:'Ravi'}),null);
 assert.ok(resolveVoiceRequest({kind:'whisper',cue:0,name:'<x>'.repeat(100)}).text.length<80);
 assert.equal(resolveVoiceRequest({kind:'dialogue',personId:'tan',text:PEOPLE[0].opening}).speaker,'male');
});
test('missing configuration, foreign origins and invalid lines never call the paid API',async()=>{
 let calls=0;const h=createVoiceHandler({env:{},fetcher:async()=>{calls++;}});
 for(const [req,status] of [[request({kind:'whisper',cue:0}),503],[request({kind:'whisper',cue:0},{headers:{host:'game.test',origin:'https://other.test'}}),403],[request({text:'anything'}),400]]){const res=response();await h(req,res);assert.equal(res.code,status);}
 assert.equal(calls,0);
});
test('generated speech keeps the API key server-side and reuses cached audio',async()=>{
 const calls=[];const h=createVoiceHandler({env:{ELEVENLABS_API_KEY:'test-secret',ELEVENLABS_VOICE_ID:'voice-test'},fetcher:async(url,opts)=>{calls.push({url,opts});return {ok:true,arrayBuffer:async()=>new Uint8Array([73,68,51,0]).buffer};}});
 for(let i=0;i<2;i++){const res=response();await h(request({kind:'whisper',cue:0,name:'Ravi'}),res);assert.equal(res.code,200);assert.equal(res.headers['Content-Type'],'audio/mpeg');assert.ok(!JSON.stringify(res).includes('test-secret'));}
 assert.equal(calls.length,1);const payload=JSON.parse(calls[0].opts.body);assert.equal(payload.model_id,'eleven_v3');assert.match(payload.text,/^\[whispers\].*Ravi/);
});
test('provider errors are sanitized and never return credentials',async()=>{
 const h=createVoiceHandler({env:{ELEVENLABS_API_KEY:'secret'},fetcher:async()=>{throw new Error('secret');}}),res=response();await h(request({kind:'dialogue',personId:'tan',text:PEOPLE[0].opening}),res);assert.equal(res.code,502);assert.ok(!JSON.stringify(res.value).includes('secret'));
});
test('voice rendering has no browser text-to-speech fallback',()=>{
 for(const name of ['audio.js','rendered-voice.js','main.js'])assert.doesNotMatch(readFileSync(new URL('../src/'+name,import.meta.url),'utf8'),/speechSynthesis|SpeechSynthesisUtterance/);
});
