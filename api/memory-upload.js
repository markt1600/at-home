import {handleUpload} from '@vercel/blob/client';
import {authenticated,sameOrigin,parseBody} from '../server/memory-auth.js';
import {validMediaPath,MAX_SIZE,CONTENT_TYPES} from '../server/memory-record.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='POST')return res.status(405).json({error:'POST required'});
 if(!sameOrigin(req))return res.status(403).json({error:'Origin not allowed'});
 try{
  const body=parseBody(req);
  const response=await handleUpload({body,request:req,onBeforeGenerateToken:async pathname=>{
   if(!authenticated(req))throw Error('Sign in to upload memories');
   if(!validMediaPath(pathname))throw Error('Invalid media path');
   return {allowedContentTypes:CONTENT_TYPES,maximumSizeInBytes:MAX_SIZE,addRandomSuffix:false,allowOverwrite:false,validUntil:Date.now()+30*60000};
  }});
  return res.status(200).json(response);
 }catch{return res.status(400).json({error:'Upload unavailable. Sign in and check the private Blob store connection.'});}
}
