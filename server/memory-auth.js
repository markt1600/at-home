import {createHmac,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
const COOKIE='at_home_editor';
const equal=(a,b)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
export function configured(env=process.env){return typeof env.MEMORY_ADMIN_PASSWORD==='string'&&env.MEMORY_ADMIN_PASSWORD.length>=6;}
export function passwordMatches(value,env=process.env){return configured(env)&&typeof value==='string'&&equal(value,env.MEMORY_ADMIN_PASSWORD);}
const sign=(text,env)=>createHmac('sha256',env.MEMORY_ADMIN_PASSWORD).update(text).digest('base64url');
export function createSession(env=process.env,now=Date.now()){
 const payload=Buffer.from(JSON.stringify({expires:now+8*3600000,nonce:randomBytes(18).toString('hex')})).toString('base64url');
 return `${payload}.${sign(payload,env)}`;
}
export function authenticated(req,env=process.env,now=Date.now()){
 if(!configured(env))return false;
 const cookie=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
 if(!cookie||cookie.length>600)return false;
 try{const [payload,signature,...rest]=cookie.split('.');const data=JSON.parse(Buffer.from(payload,'base64url').toString());return !rest.length&&signature&&equal(signature,sign(payload,env))&&Number.isFinite(data.expires)&&data.expires>now&&data.expires<=now+8*3600000;}catch{return false;}
}
export function setSession(res,value,production=process.env.VERCEL==='1'){
 res.setHeader('Set-Cookie',`${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${value?28800:0}${production?'; Secure':''}`);
}
export function sameOrigin(req){try{return !req.headers.origin||new URL(req.headers.origin).host===req.headers.host;}catch{return false;}}
export function parseBody(req){let b=req.body;if(typeof b==='string'){if(b.length>12000)throw Error('Request too large');b=JSON.parse(b);}if(!b||typeof b!=='object'||JSON.stringify(b).length>12000)throw Error('Invalid request');return b;}
