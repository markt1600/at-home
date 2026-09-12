import {createHash} from 'node:crypto';
import {resolveVoiceRequest} from '../src/voice-lines.js';

// Only authored game lines and bounded nicknames are accepted. The key is used
// exclusively by this Vercel function, never the Vite client bundle.
export function createVoiceHandler({env=process.env,fetcher=fetch,now=Date.now}={}){
 const cache=new Map(),pending=new Map(),limits=new Map();let agentVoice=null;
 const limited=key=>{const t=now(),r=limits.get(key);if(!r||t-r.start>600000){if(limits.size>1000)limits.clear();limits.set(key,{start:t,count:1});return false;}return ++r.count>48;};
 return async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'POST required'});}
  const origin=req.headers.origin,host=req.headers.host;
  if(origin){try{if(new URL(origin).host!==host)return res.status(403).json({error:'Origin not allowed'});}catch{return res.status(403).json({error:'Invalid origin'});}}
  let body=req.body;try{if(typeof body==='string'){if(body.length>1500)throw new Error();body=JSON.parse(body);}}catch{return res.status(400).json({error:'Invalid request'});}
  const line=resolveVoiceRequest(body);if(!line)return res.status(400).json({error:'Unknown game line'});
  if(!env.ELEVENLABS_API_KEY)return res.status(503).json({error:'ElevenLabs voice is not configured'});
  const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
  if(limited(ip))return res.status(429).json({error:'Voice limit reached. Try again later.'});
  const model=line.whisper?'eleven_v3':'eleven_multilingual_v2';
  const key=createHash('sha256').update(`${line.speaker}:${line.text}`).digest('hex');
  try{
   let audio=cache.get(key);
   if(!audio){
    let job=pending.get(key);
    if(!job){
     job=(async()=>{
      let voice=line.speaker==='female'?(env.ELEVENLABS_FEMALE_VOICE_ID||'EXAVITQu4vr4xnSDxMaL'):(env.ELEVENLABS_MALE_VOICE_ID||'JBFqnCBsd6RMkjVDRZzb');
      if(line.whisper){
       voice=env.ELEVENLABS_VOICE_ID||agentVoice||voice;
       if(!env.ELEVENLABS_VOICE_ID&&!agentVoice&&env.ELEVENLABS_AGENT_ID){
        const r=await fetcher(`https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(env.ELEVENLABS_AGENT_ID)}`,{headers:{'xi-api-key':env.ELEVENLABS_API_KEY},signal:AbortSignal.timeout(8000)});
        if(r.ok){const data=await r.json();agentVoice=data.conversation_config?.tts?.voice_id||null;if(agentVoice)voice=agentVoice;}
       }
      }
      const response=await fetcher(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`,{method:'POST',headers:{'xi-api-key':env.ELEVENLABS_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({text:(line.whisper?'[whispers] ':'')+line.text,model_id:model,voice_settings:{stability:.5,similarity_boost:.75}}),signal:AbortSignal.timeout(22000)});
      if(!response.ok)throw new Error('Voice provider unavailable');
      const bytes=Buffer.from(await response.arrayBuffer());if(!bytes.length||bytes.length>2000000)throw new Error('Invalid audio');
      if(cache.size>=128)cache.delete(cache.keys().next().value);cache.set(key,bytes);return bytes;
     })();pending.set(key,job);
    }
    try{audio=await job;}finally{pending.delete(key);}
   }
   res.setHeader('Content-Type','audio/mpeg');res.setHeader('Content-Length',String(audio.length));return res.status(200).send(audio);
  }catch{return res.status(502).json({error:'ElevenLabs voice is temporarily unavailable'});}
 };
}
export default createVoiceHandler();
