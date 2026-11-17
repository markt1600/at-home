import {get,put,list} from '@vercel/blob';
import {timingSafeEqual,createHash} from 'node:crypto';
import {authenticated,sameOrigin} from '../server/memory-auth.js';
import {runBackup,backupStatus} from '../server/memory-backup.js';

// Vercel Cron calls this daily with the project's CRON_SECRET. The signed-in
// editor can read the last result (GET) or start a run by hand (POST).
const equal=(a,b)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
export function createBackupHandler({storage={get,put,list},env=process.env,now=Date.now}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');
  const cron=typeof env.CRON_SECRET==='string'&&env.CRON_SECRET.length>=16&&equal(String(req.headers.authorization||''),'Bearer '+env.CRON_SECRET),admin=authenticated(req,env,now());
  if(!cron&&!admin)return res.status(401).json({error:'Sign in to manage backups'});
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Method not allowed'});}
  if(req.method==='POST'&&!sameOrigin(req))return res.status(403).json({error:'Origin not allowed'});
  const configured=!!(env.BLOB_READ_WRITE_TOKEN&&env.BACKUP_BLOB_READ_WRITE_TOKEN&&env.BACKUP_BLOB_READ_WRITE_TOKEN!==env.BLOB_READ_WRITE_TOKEN);
  if(!configured)return res.status(200).json({configured:false});
  const sourceOptions={access:'private',token:env.BLOB_READ_WRITE_TOKEN},targetOptions={access:'private',token:env.BACKUP_BLOB_READ_WRITE_TOKEN};
  try{
   if(req.method==='GET'&&!cron)return res.status(200).json({configured:true,scheduled:!!env.CRON_SECRET,status:await backupStatus({target:storage,targetOptions})});
   return res.status(200).json({configured:true,scheduled:!!env.CRON_SECRET,status:await runBackup({source:storage,target:storage,sourceOptions,targetOptions,now})});
  }catch{return res.status(502).json({error:'The second copy could not be updated. Check that the backup store is private and connected.'});}
 };
}
export default createBackupHandler();
