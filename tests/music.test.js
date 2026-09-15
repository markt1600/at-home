import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {RecordPlayer,waitForMusicBuffer} from '../src/record-player.js';
import {AUDIO_FORMATS,audioContentType} from '../src/audio-formats.js';
import {validMusicPath} from '../server/music-record.js';
import {createMusicHandler} from '../api/music.js';
import {createSession} from '../server/memory-auth.js';
class FakeAudio extends EventTarget{
 paused=true;ended=false;readyState=4;
 async play(){this.paused=false;this.ended=false;this.dispatchEvent(new Event('playing'));}
 pause(){this.paused=true;this.dispatchEvent(new Event('pause'));}
}
const sound=()=>({volume:.65,music:false,async start(){}});
test('an unreachable hand interaction leaves the record off without downloading music',async()=>{
 let loads=0;const audio=new FakeAudio(),s=sound(),player=new RecordPlayer(s,{audio,onStart:()=>false,load:async()=>{loads++;return [];}});
 await player.start();assert.equal(loads,0);assert.equal(player.enabled,false);assert.equal(player.loading,false);assert.equal(player.spinning,false);assert.equal(audio.paused,true);
});
test('record rotation follows real playback, playlist endings, memory suspension and stop',async()=>{
 const audio=new FakeAudio(),s=sound(),r=new RecordPlayer(s,{audio,random:()=>.99,load:async()=>[{src:'a.wav',title:'One'},{src:'b.flac',title:'Two'}]});
 assert.equal(r.spinning,false);await r.start();assert.equal(r.spinning,true);assert.equal(audio.src,'a.wav');assert.equal(s.music,false);
 r.suspend();assert.equal(r.spinning,false);assert.equal(audio.paused,true);r.resume();await Promise.resolve();assert.equal(r.spinning,true);
 audio.ended=true;audio.dispatchEvent(new Event('ended'));await new Promise(setImmediate);assert.equal(audio.src,'b.flac');assert.equal(r.spinning,true);
 r.stop();assert.equal(audio.paused,true);assert.equal(r.spinning,false);r.resume();assert.equal(audio.paused,true);
});
test('starting the record uses a shuffled first song without changing the library order',async()=>{
 const tracks=[{src:'a.mp3',title:'One'},{src:'b.m4a',title:'Two'},{src:'c.flac',title:'Three'}],starts=[];
 for(const random of [()=>0,()=>.99]){
  const audio=new FakeAudio(),r=new RecordPlayer(sound(),{audio,random,load:async()=>tracks});
  await r.start();starts.push(audio.src);assert.equal(r.spinning,true);r.stop();
 }
 assert.notEqual(starts[0],starts[1]);assert.deepEqual(tracks.map(t=>t.src),['a.mp3','b.m4a','c.flac']);
});
test('playlist endings reshuffle and repeat every song without immediate repeats; memory resume keeps its place',async()=>{
 for(const count of [2,5]){
  const tracks=Array.from({length:count},(_,i)=>({src:`${i}.mp3`,title:`Song ${i}`})),audio=new FakeAudio();let draws=0;
  const r=new RecordPlayer(sound(),{audio,random:()=>{draws++;return 0;},load:async()=>tracks}),played=[];
  await r.start();
  for(let i=0;i<count*4;i++){
   if(i){audio.ended=true;audio.dispatchEvent(new Event('ended'));await new Promise(setImmediate);}
   played.push(audio.src);assert.equal(r.spinning,true);
   if(i){assert.notEqual(played[i],played[i-1],'no immediate repeat, including reshuffle boundaries');}
   const before=draws,queue=r.tracks.map(t=>t.src),src=audio.src;audio.currentTime=12;
   r.suspend();r.resume();await new Promise(setImmediate);
   assert.equal(audio.src,src);assert.equal(audio.currentTime,12);assert.equal(draws,before);assert.deepEqual(r.tracks.map(t=>t.src),queue);
  }
  for(let i=0;i<played.length;i+=count)assert.deepEqual(played.slice(i,i+count).sort(),tracks.map(t=>t.src).sort(),'each cycle includes every song once');
  assert.ok(draws>=4*(count-1),'a new shuffle is drawn for every cycle');
  const previous=audio.src;r.stop();await r.start();assert.notEqual(audio.src,previous,'a fresh start avoids the last played song');r.stop();
 }
});
test('a single uploaded song repeats, and an empty library still uses the house melody',async()=>{
 for(const tracks of [[],[{src:'only.ogg',title:'Only song'}]]){
  const audio=new FakeAudio(),s=sound(),r=new RecordPlayer(s,{audio,load:async()=>tracks});await r.start();
  for(let i=0;i<3;i++){audio.ended=true;audio.dispatchEvent(new Event('ended'));await new Promise(setImmediate);}
  if(tracks.length){assert.equal(audio.src,'only.ogg');assert.equal(r.spinning,true);assert.equal(s.music,false);}
  else{assert.equal(audio.src,undefined);assert.equal(s.music,true);assert.equal(r.spinning,true);}
  r.stop();assert.equal(r.spinning,false);
 }
});
test('stopping while a playlist loads cannot restart sound or the vinyl later',async()=>{
 let resolve;const r=new RecordPlayer(sound(),{audio:new FakeAudio(),load:()=>new Promise(r=>resolve=r)});const pending=r.start();await Promise.resolve();r.stop();resolve([{src:'late.mp3',title:'Late'}]);await pending;assert.equal(r.enabled,false);assert.equal(r.spinning,false);assert.equal(r.audio.paused,true);
});
test('a memory opened during playlist loading resumes the first track without starting the fallback melody',async()=>{
 for(const returnBeforeLoad of [false,true]){
  let resolve;const audio=new FakeAudio(),s=sound(),r=new RecordPlayer(s,{audio,load:()=>new Promise(r=>resolve=r)});
  const pending=r.start();await Promise.resolve();r.suspend();if(returnBeforeLoad)r.resume();assert.equal(s.music,false);
  resolve([{src:'first.m4a',title:'First'}]);await pending;if(!returnBeforeLoad){assert.equal(audio.paused,true);r.resume();await Promise.resolve();}
  assert.equal(audio.src,'first.m4a');assert.equal(r.spinning,true);assert.equal(s.music,false);r.stop();
 }
});
test('audio formats have explicit MIME types and cannot escape their private storage prefix',()=>{
 for(const ext of Object.keys(AUDIO_FORMATS)){assert.ok(validMusicPath(`music/381b4dbd-5e89-4cd7-9a61-5d0c339b0cf2.${ext}`));assert.ok(audioContentType('track.'+ext.toUpperCase()));}
 for(const p of ['music/../private.wav','music/hello.mp3','music/381b4dbd-5e89-4cd7-9a61-5d0c339b0cf2.html','records/381b4dbd-5e89-4cd7-9a61-5d0c339b0cf2.wav'])assert.ok(!validMusicPath(p));
});

test('music waits for a buffered track and the needle, and a cancelled start stays silent',async()=>{
 for(const cancel of [false,true]){
  let lowerNeedle;const audio=new FakeAudio();audio.readyState=2;
  const r=new RecordPlayer(sound(),{audio,load:async()=>[{src:'slow.mp3',title:'Slow'}],beforePlay:()=>new Promise(resolve=>lowerNeedle=resolve)});
  const start=r.start();await new Promise(setImmediate);assert.equal(audio.src,'slow.mp3');assert.equal(audio.preload,'auto');assert.equal(audio.paused,true);assert.equal(lowerNeedle,undefined);
  audio.readyState=4;audio.dispatchEvent(new Event('canplaythrough'));await new Promise(setImmediate);assert.equal(typeof lowerNeedle,'function');assert.equal(audio.paused,true);
  if(cancel)r.stop();lowerNeedle(true);await start;assert.equal(audio.paused,cancel);r.stop();
 }
});

test('a memory can suspend an in-flight needle animation and resume without replaying it',async()=>{
 let ready,preparations=0;const audio=new FakeAudio(),r=new RecordPlayer(sound(),{audio,load:async()=>[{src:'song.mp3',title:'Song'}],beforePlay:()=>{preparations++;return new Promise(resolve=>ready=resolve);}});
 const start=r.start();await new Promise(setImmediate);r.suspend();ready(true);await start;assert.equal(audio.paused,true);r.resume();await new Promise(setImmediate);assert.equal(audio.paused,false);assert.equal(preparations,1);r.stop();
});

test('slow music needs five seconds ahead (or the remaining song), with cancellable waiting',async()=>{
 const audio=new FakeAudio();audio.readyState=3;audio.duration=30;audio.currentTime=0;let end=1,done=false;
 audio.buffered={length:1,start:()=>0,end:()=>end};const abort=new AbortController();
 const pending=waitForMusicBuffer(audio,abort.signal).then(v=>{done=v;});await Promise.resolve();assert.equal(done,false);
 end=5;audio.dispatchEvent(new Event('progress'));await pending;assert.equal(done,true);
 end=2;audio.duration=2;assert.equal(await waitForMusicBuffer(audio,abort.signal),true);
 audio.readyState=0;const cancelled=waitForMusicBuffer(audio,abort.signal);abort.abort();assert.equal(await cancelled,false);
});
test('music storage enforces authentication, owner paths, publication, byte ranges and safe deletion',async t=>{
 const id='381b4dbd-5e89-4cd7-9a61-5d0c339b0cf2',path=`music/${id}.flac`,records=new Map(),deletions=[],reads=[];let version=0;
 const env={MEMORY_ADMIN_PASSWORD:'abc123',BLOB_READ_WRITE_TOKEN:'test-only',VERCEL:'1'};
 const storage={get:async(p,o)=>{if(p.startsWith('music-records/')){const r=records.get(p);return r?{stream:new Response(r.body).body,blob:{etag:r.etag}}:null;}reads.push(p);return {stream:new Response('abc').body,headers:new Headers({'content-range':'bytes 0-2/100','content-length':'3'})};},head:async()=>({size:100,contentType:'audio/flac'}),list:async()=>({blobs:[...records.keys()].map(pathname=>({pathname})),hasMore:false}),put:async(p,body,o)=>{const prior=records.get(p);if(prior&&prior.etag!==o.ifMatch)throw Error('precondition failed');const etag=String(++version);records.set(p,{body,etag});return {etag};},del:async(p,o)=>{deletions.push(p);if(records.has(p)){assert.equal(records.get(p).etag,o.ifMatch);records.delete(p);}}};
 const handler=createMusicHandler({storage,env}),server=createServer(async(req,res)=>{const b=[];for await(const c of req)b.push(c);if(b.length)req.body=Buffer.concat(b).toString();res.status=n=>{res.statusCode=n;return res;};res.json=x=>res.end(JSON.stringify(x));await handler(req,res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));const origin=`http://127.0.0.1:${server.address().port}`,cookie='at_home_editor='+createSession(env);
 const call=(q='',body,auth=false,headers={})=>fetch(origin+'/api/music'+q,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),...(auth?{Cookie:cookie}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
 const input={id,path,title:'A quiet tune',enabled:true};assert.equal((await call('',input)).status,401);assert.equal((await call('',input,true,{Origin:'https://foreign.example'})).status,403);
 assert.equal((await call('',{...input,path:'music/c0779408-a4dc-4c40-92a7-6c9bc04af079.flac'},true)).status,400);
 const created=await call('',input,true);assert.equal(created.status,200);const track=await created.json();assert.ok(!track.path);assert.equal((await (await call()).json()).length,1);
 const range=await call('?action=audio&id='+id,null,false,{Range:'bytes=0-2'});assert.equal(range.status,206);assert.equal(range.headers.get('content-type'),'audio/flac');assert.equal(await range.text(),'abc');assert.equal(reads.at(-1),path);
 assert.equal((await call('',{...input,etag:'stale'},true)).status,409);
 const hidden=await (await call('',{...track,enabled:false},true)).json();assert.deepEqual(await (await call()).json(),[]);assert.equal((await call('?action=audio&id='+id)).status,404);
 assert.equal((await call('?action=delete',{id,etag:hidden.etag},true)).status,200);assert.deepEqual(deletions,[path,`music-records/${id}.json`]);assert.equal((await call('?action=audio&id='+id,null,true)).status,404);
});
