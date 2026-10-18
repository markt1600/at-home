import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHouseSettingsHandler} from '../api/house-settings.js';
import {createSession} from '../server/memory-auth.js';
import {cleanHouseSettings} from '../server/house-settings.js';
import {loadHouseSettings,cachedHouseSettings} from '../src/house-settings.js';

const env={MEMORY_ADMIN_PASSWORD:'test-only-password-with-32-letters',BLOB_READ_WRITE_TOKEN:'test-storage',VERCEL:'1'};

test('Christmas mode is public to read, editor-only to change, and stays on until switched off',async t=>{
 const stored=new Map();
 const storage={get:async path=>{const v=stored.get(path);return v?{stream:new Response(v).body,blob:{etag:'e'}}:null;},put:async(path,body)=>{stored.set(path,body);return {etag:'e2'};}};
 const handler=createHouseSettingsHandler({storage,env}),server=createServer(async(req,res)=>{const chunks=[];for await(const c of req)chunks.push(c);if(chunks.length)req.body=Buffer.concat(chunks).toString();res.status=c=>{res.statusCode=c;return res;};res.json=d=>res.end(JSON.stringify(d));await handler(req,res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
 const origin=`http://127.0.0.1:${server.address().port}`,cookie='at_home_editor='+createSession(env);
 const request=(body,headers={})=>fetch(origin+'/api/house-settings',{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
 assert.deepEqual(await (await request()).json(),{christmas:false,storage:true},'off by default, readable without signing in');
 assert.equal((await request({christmas:true})).status,401,'visitors cannot switch it');
 assert.equal((await request({christmas:true},{Cookie:cookie,Origin:'https://elsewhere.example'})).status,403);
 assert.equal((await request({christmas:'yes'},{Cookie:cookie})).status,400,'only true or false');
 assert.deepEqual(await (await request({christmas:true},{Cookie:cookie})).json(),{christmas:true,storage:true});
 assert.equal(JSON.parse(stored.get('settings/house.json')).christmas,true,'kept in the private store');
 assert.deepEqual(await (await request()).json(),{christmas:true,storage:true},'a new game, device or visitor sees it on');
 assert.deepEqual(await (await request({christmas:false},{Cookie:cookie})).json(),{christmas:false,storage:true});
 assert.throws(()=>cleanHouseSettings({christmas:1}));
});

test('the game reads the switch before building the house and falls back to what it last saw',async()=>{
 const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
 const online=await loadHouseSettings({fetch:async()=>new Response(JSON.stringify({christmas:true,storage:true})),storage});
 assert.equal(online.christmas,true);assert.equal(cachedHouseSettings(storage).christmas,true,'remembered for next time');
 const offline=await loadHouseSettings({fetch:async()=>{throw Error('offline');},storage});
 assert.equal(offline.christmas,true,'offline keeps the last answer');
 const slow=await loadHouseSettings({fetch:()=>new Promise((_,reject)=>setTimeout(()=>reject(Error('too slow')),60)),timeout:30,storage});
 assert.equal(slow.christmas,true,'a slow server does not hold the house up');
});
