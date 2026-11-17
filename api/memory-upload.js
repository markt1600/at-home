import {handleUpload} from '@vercel/blob/client';
import {authenticated,sameOrigin,parseBody} from '../server/memory-auth.js';
import {validMediaPath,MAX_SIZE,CONTENT_TYPES,validSoundtrackPath,MAX_SOUNDTRACK_SIZE,SOUNDTRACK_CONTENT_TYPES,validOriginalPath,MAX_ORIGINAL_SIZE,ORIGINAL_CONTENT_TYPES} from '../server/memory-record.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='POST')return res.status(405).json({error:'POST required'});
 if(!sameOrigin(req))return res.status(403).json({error:'Origin not allowed'});
 try{
  const body=parseBody(req);
  const response=await handleUpload({body,request:req,onBeforeGenerateToken:async pathname=>{
   if(!authenticated(req))throw Error('Sign in to upload memories');
   const audio=validSoundtrackPath(pathname),original=validOriginalPath(pathname);if(!audio&&!original&&!validMediaPath(pathname))throw Error('Invalid media path');
   return {allowedContentTypes:original?ORIGINAL_CONTENT_TYPES:audio?SOUNDTRACK_CONTENT_TYPES:CONTENT_TYPES,maximumSizeInBytes:original?MAX_ORIGINAL_SIZE:audio?MAX_SOUNDTRACK_SIZE:MAX_SIZE,addRandomSuffix:false,allowOverwrite:false,validUntil:Date.now()+(original?120:30)*60000};
  }});
  return res.status(200).json(response);
 }catch{return res.status(400).json({error:'Upload unavailable. Sign in and check the private Blob store connection.'});}
}
