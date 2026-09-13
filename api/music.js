import {get,put,list,head,del} from '@vercel/blob';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {authenticated,sameOrigin,parseBody} from '../server/memory-auth.js';
import {UUID} from '../server/memory-record.js';
import {musicPath,trackPath,validMusicPath,cleanTrack,publicTrack,MAX_MUSIC_SIZE} from '../server/music-record.js';
import {audioContentType} from '../src/audio-formats.js';

export function createMusicHandler({storage={get,put,list,head,del},env=process.env}={}){
 const options=()=>({access:'private',...(env.BLOB_READ_WRITE_TOKEN?{token:env.BLOB_READ_WRITE_TOKEN}:{storeId:env.BLOB_STORE_ID})});
 const recordPath=id=>`music-records/${id}.json`;
 const read=async id=>{const r=await storage.get(recordPath(id),{...options(),useCache:false});return r?.stream?{record:await new Response(r.stream).json(),etag:r.blob.etag}:null;};
 return async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const url=new URL(req.url,'http://localhost'),action=url.searchParams.get('action'),admin=authenticated(req,env);
  try{
   if(req.method!=='GET'&&!sameOrigin(req))return res.status(403).json({error:'Origin not allowed'});
   if(!(env.BLOB_READ_WRITE_TOKEN||env.BLOB_STORE_ID))return res.status(503).json({error:'Music uploads are available on the connected Vercel site.'});
   if(req.method==='GET'&&action==='audio'){
    const id=url.searchParams.get('id');if(!UUID.test(id||''))return res.status(404).end();
    const found=await read(id);if(!found||found.record.deleting||(!found.record.enabled&&!admin))return res.status(404).end();
    const range=req.headers.range;if(range&&!/^bytes=\d*-\d*$/.test(range))return res.status(416).end();
    const path=trackPath(found.record),audio=await storage.get(path,{...options(),useCache:false,...(range?{headers:{Range:range}}:{})});if(!audio?.stream)return res.status(404).end();
    res.setHeader('Content-Type',audioContentType(path));res.setHeader('Content-Disposition','inline');res.setHeader('Accept-Ranges','bytes');
    const cr=audio.headers.get('content-range'),length=audio.headers.get('content-length');if(cr)res.setHeader('Content-Range',cr);if(length)res.setHeader('Content-Length',length);
    res.status(cr?206:200);await pipeline(Readable.fromWeb(audio.stream),res);return;
   }
   if(req.method==='GET'){
    const all=url.searchParams.get('admin')==='1';if(all&&!admin)return res.status(401).json({error:'Sign in to edit music'});
    const tracks=[];let cursor;do{const page=await storage.list({...options(),prefix:'music-records/',limit:100,cursor});
     for(const blob of page.blobs){const id=blob.pathname.slice(14,-5);if(!UUID.test(id))continue;const found=await read(id);if(found&&(all||found.record.enabled&&!found.record.deleting))tracks.push({...publicTrack(found.record),...(all?{etag:found.etag}:{})});}
     cursor=page.hasMore?page.cursor:undefined;
    }while(cursor);return res.status(200).json(tracks.sort((a,b)=>a.title.localeCompare(b.title)));
   }
   if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
   if(!admin)return res.status(401).json({error:'Sign in to edit music'});
   const input=parseBody(req);if(!UUID.test(input.id||''))return res.status(400).json({error:'Invalid track ID'});
   const prior=await read(input.id);if(prior&&prior.etag!==input.etag)return res.status(409).json({error:'This track changed. Refresh the music library.'});
   if(action==='delete'){
    if(!prior)return res.status(200).json({ok:true});let etag=prior.etag;
    if(!prior.record.deleting){const claim=await storage.put(recordPath(input.id),JSON.stringify({...prior.record,enabled:false,deleting:true}),{...options(),contentType:'application/json',addRandomSuffix:false,allowOverwrite:true,ifMatch:etag,cacheControlMaxAge:0});etag=claim.etag;}
    try{await storage.del(trackPath(prior.record),options());await storage.del(recordPath(input.id),{...options(),ifMatch:etag});}catch{return res.status(502).json({error:'Track hidden. Refresh and retry deletion to finish removing its files.'});}
    return res.status(200).json({ok:true});
   }
   if(action)return res.status(400).json({error:'Unknown music action'});
   if(prior?.record.deleting||!prior&&input.etag)return res.status(409).json({error:'This track was deleted. Refresh the music library.'});
   const record=cleanTrack(input);record.path=prior?trackPath(prior.record):input.path||musicPath(record.id);
   if(!validMusicPath(record.path)||record.path.slice(6,record.path.lastIndexOf('.'))!==record.id)throw Error('Invalid audio file');
   if(!prior){const blob=await storage.head(record.path,options());if(!blob||blob.size<=0||blob.size>MAX_MUSIC_SIZE||blob.contentType!==audioContentType(record.path))throw Error('Upload a supported audio file first');}
   const saved=await storage.put(recordPath(record.id),JSON.stringify(record),{...options(),contentType:'application/json',addRandomSuffix:false,allowOverwrite:!!prior,...(prior?{ifMatch:prior.etag}:{}),cacheControlMaxAge:0});
   return res.status(200).json({...publicTrack(record),etag:saved.etag});
  }catch(error){if(res.headersSent){res.destroy();return;}const conflict=/precondition|already exists/i.test(error.message);return res.status(conflict?409:400).json({error:conflict?'This track changed. Refresh before saving.':error.message?.startsWith('Blob')?'Music storage is temporarily unavailable':error.message||'Could not save music'});}
 };
}
export default createMusicHandler();
