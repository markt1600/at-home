import {get,put} from '@vercel/blob';
import {authenticated,sameOrigin,parseBody} from '../server/memory-auth.js';
import {HOUSE_SETTINGS_PATH,DEFAULT_HOUSE_SETTINGS,cleanHouseSettings} from '../server/house-settings.js';

// GET: the current switches, readable by anyone (the game needs them before the
// house is built). POST (editor only): change one or more switches.
export function createHouseSettingsHandler({storage={get,put},env=process.env}={}){
 const options=()=>({access:'private',...(env.BLOB_READ_WRITE_TOKEN?{token:env.BLOB_READ_WRITE_TOKEN}:{storeId:env.BLOB_STORE_ID})});
 const read=async()=>{try{const r=await storage.get(HOUSE_SETTINGS_PATH,{...options(),useCache:false});if(!r?.stream)return {...DEFAULT_HOUSE_SETTINGS};return {...DEFAULT_HOUSE_SETTINGS,...cleanHouseSettings(await new Response(r.stream).json())};}catch{return {...DEFAULT_HOUSE_SETTINGS};}};
 return async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const storage_=!!(env.BLOB_READ_WRITE_TOKEN||env.BLOB_STORE_ID);
  try{
   if(req.method==='GET')return res.status(200).json({...(storage_?await read():DEFAULT_HOUSE_SETTINGS),storage:storage_});
   if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
   if(!sameOrigin(req))return res.status(403).json({error:'Origin not allowed'});
   if(!authenticated(req,env))return res.status(401).json({error:'Sign in to change the house'});
   if(!storage_)return res.status(503).json({error:'Connect the private At Home Blob store to this project and redeploy.'});
   const changes=cleanHouseSettings(parseBody(req)),next={...await read(),...changes};
   await storage.put(HOUSE_SETTINGS_PATH,JSON.stringify(next),{...options(),contentType:'application/json',addRandomSuffix:false,allowOverwrite:true,cacheControlMaxAge:0});
   return res.status(200).json({...next,storage:true});
  }catch(error){return res.status(400).json({error:error.message||'Could not update the house'});}
 };
}
export default createHouseSettingsHandler();
