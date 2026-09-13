import {get,put,list,head,del} from '@vercel/blob';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {configured,passwordMatches,createSession,authenticated,setSession,sameOrigin,parseBody} from '../server/memory-auth.js';
import {UUID,validateRecord,publicRecord,recordAssetPaths,MAX_SIZE,CONTENT_TYPES,validSoundtrackPath,MAX_SOUNDTRACK_SIZE} from '../server/memory-record.js';
import {audioContentType} from '../src/audio-formats.js';

export function createMemoryHandler({storage={get,put,list,head,del},env=process.env,now=Date.now}={}){
 const attempts=new Map();
 const options=()=>({access:'private',...(env.BLOB_READ_WRITE_TOKEN?{token:env.BLOB_READ_WRITE_TOKEN}:{storeId:env.BLOB_STORE_ID})});
 const read=async id=>{const r=await storage.get(`records/${id}.json`,{...options(),useCache:false});if(!r||!r.stream)return null;return {record:await new Response(r.stream).json(),etag:r.blob.etag};};
 return async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  const url=new URL(req.url,'http://localhost'),action=url.searchParams.get('action'),admin=authenticated(req,env,now());
  try{
   if(req.method==='GET'&&action==='session')return res.status(200).json({authenticated:admin,configured:configured(env),storage:!!(env.BLOB_READ_WRITE_TOKEN||env.BLOB_STORE_ID)});
   if(req.method!=='GET'&&!sameOrigin(req))return res.status(403).json({error:'Origin not allowed'});
   if(req.method==='POST'&&action==='login'){
    if(!configured(env))return res.status(503).json({error:'Set MEMORY_ADMIN_PASSWORD (at least 6 characters) in this Vercel project, then redeploy.'});
    const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0],t=now();
    if(attempts.size>2000)for(const [key,r] of attempts)if(t-r.since>900000)attempts.delete(key);
    const r=attempts.get(ip)||{since:t,count:0};if(t-r.since>900000){r.since=t;r.count=0;}r.count++;attempts.set(ip,r);
    if(r.count>10)return res.status(429).json({error:'Too many attempts. Please wait 15 minutes.'});
    if(!passwordMatches(parseBody(req).password,env))return res.status(401).json({error:'Incorrect password'});
    attempts.delete(ip);setSession(res,createSession(env,t),env.VERCEL==='1');return res.status(200).json({ok:true});
   }
   if(req.method==='POST'&&action==='logout'){setSession(res,'',env.VERCEL==='1');return res.status(200).json({ok:true});}
   if(!(env.BLOB_READ_WRITE_TOKEN||env.BLOB_STORE_ID))return res.status(503).json({error:'Connect the private At Home Blob store to this project and redeploy.'});
   if(req.method==='GET'&&action==='media'){
    const id=url.searchParams.get('id');if(!UUID.test(id||''))return res.status(404).end();
    const found=await read(id);if(!found||found.record.deleting||(!found.record.published&&!admin))return res.status(404).end();
    const range=req.headers.range;if(range&&!/^bytes=\d*-\d*$/.test(range))return res.status(416).end();
    const paths=recordAssetPaths(found.record),asset=url.searchParams.get('asset'),path=asset?paths.find(p=>p.split('/').at(-1)===asset):paths[0];
    if(!path)return res.status(404).end();
    const media=await storage.get(path,{...options(),useCache:false,...(range?{headers:{Range:range}}:{})});
    if(!media?.stream)return res.status(404).end();
    res.setHeader('Content-Type',media.blob.contentType);res.setHeader('Content-Disposition','inline');res.setHeader('Accept-Ranges','bytes');
    const cr=media.headers.get('content-range');if(cr)res.setHeader('Content-Range',cr);
    const length=media.headers.get('content-length');if(length)res.setHeader('Content-Length',length);
    res.status(cr?206:200);await pipeline(Readable.fromWeb(media.stream),res);return;
   }
   if(req.method==='GET'){
    const all=url.searchParams.get('admin')==='1';if(all&&!admin)return res.status(401).json({error:'Sign in to edit memories'});
    const records=[];let cursor;
    do{const page=await storage.list({...options(),prefix:'records/',limit:100,cursor});
     for(let i=0;i<page.blobs.length;i+=8){const group=await Promise.all(page.blobs.slice(i,i+8).map(async b=>{const id=b.pathname.slice(8,-5);if(!UUID.test(id))return null;return read(id);}));for(const entry of group)if(entry&&(all||(entry.record.published&&!entry.record.deleting)))records.push({...publicRecord(entry.record),...(all?{etag:entry.etag}:{})});}
     cursor=page.hasMore?page.cursor:undefined;
    }while(cursor);
    return res.status(200).json(records.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));
   }
   if(req.method==='POST'){
    if(!admin)return res.status(401).json({error:'Sign in to edit memories'});
    const input=parseBody(req);if(!UUID.test(input.id||''))return res.status(400).json({error:'Invalid memory ID'});
    const prior=await read(input.id);if(prior&&input.etag!==prior.etag)return res.status(409).json({error:'This memory changed in another tab. Refresh the library before trying again.'});
    if(action==='delete'){
     if(!prior)return res.status(200).json({ok:true});
     // Claim deletion with a conditional write first. It immediately revokes media
     // access and prevents another tab from editing a record while its file is removed.
     let etag=prior.etag;
     if(!prior.record.deleting){const claimed=await storage.put(`records/${input.id}.json`,JSON.stringify({...prior.record,published:false,deleting:true}),{...options(),contentType:'application/json',addRandomSuffix:false,allowOverwrite:true,ifMatch:etag,cacheControlMaxAge:0});etag=claimed.etag;}
     try{
      for(const path of recordAssetPaths(prior.record))await storage.del(path,options());
      await storage.del(`records/${input.id}.json`,{...options(),ifMatch:etag});
     }catch{return res.status(502).json({error:'This memory is hidden, but deletion could not finish. Refresh the library and retry Delete memory.'});}
     return res.status(200).json({ok:true});
    }
    if(action)return res.status(400).json({error:'Unknown memory action'});
    if(prior?.record.deleting)return res.status(409).json({error:'This memory is being deleted. Refresh the library to finish deleting it.'});
    if(!prior&&input.etag)return res.status(409).json({error:'This memory was deleted in another tab. Refresh the library.'});
    const record=validateRecord(input,prior?.record);
    for(const path of recordAssetPaths(record).filter(p=>!recordAssetPaths(prior?.record).includes(p))){const blob=await storage.head(path,options()),audio=validSoundtrackPath(path);if(!blob||!blob.size||blob.size>(audio?MAX_SOUNDTRACK_SIZE:MAX_SIZE)||(audio?blob.contentType!==audioContentType(path):!CONTENT_TYPES.includes(blob.contentType)))return res.status(400).json({error:'Upload a supported media file first'});}
    const saved=await storage.put(`records/${record.id}.json`,JSON.stringify(record),{...options(),contentType:'application/json',addRandomSuffix:false,allowOverwrite:!!prior,...(prior?{ifMatch:prior.etag}:{}),cacheControlMaxAge:0});
    // Only retire the previous soundtrack after the replacement has committed.
    if(prior?.record.soundtrackPath&&prior.record.soundtrackPath!==record.soundtrackPath)await storage.del(prior.record.soundtrackPath,options()).catch(()=>{});
    return res.status(200).json({...publicRecord(record),etag:saved.etag});
   }
   res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Method not allowed'});
  }catch(error){
   if(res.headersSent){res.destroy();return;}
   const conflict=/precondition|already exists/i.test(error.message);if(conflict)return res.status(409).json({error:'This memory changed. Reload before saving.'});
   if(error.message?.startsWith('Blob'))return res.status(502).json({error:'Memory storage is temporarily unavailable'});
   return res.status(400).json({error:error.message||'Unable to save this memory'});
  }
 };
}
export default createMemoryHandler();
