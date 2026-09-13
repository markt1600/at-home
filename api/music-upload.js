import {handleUpload} from '@vercel/blob/client';
import {authenticated,sameOrigin,parseBody} from '../server/memory-auth.js';
import {validMusicPath,MAX_MUSIC_SIZE} from '../server/music-record.js';
import {audioContentType} from '../src/audio-formats.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='POST')return res.status(405).json({error:'POST required'});
 if(!sameOrigin(req))return res.status(403).json({error:'Origin not allowed'});
 try{const result=await handleUpload({body:parseBody(req),request:req,onBeforeGenerateToken:async path=>{
  if(!authenticated(req)||!validMusicPath(path))throw Error('Sign in to upload music');
  return {allowedContentTypes:[audioContentType(path)],maximumSizeInBytes:MAX_MUSIC_SIZE,addRandomSuffix:false,allowOverwrite:false,validUntil:Date.now()+30*60000};
 }});return res.status(200).json(result);}catch{return res.status(400).json({error:'Could not upload this audio file. Check your sign-in and storage connection.'});}
}
