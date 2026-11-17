import './phone-admin.css';
import {upload} from '@vercel/blob/client';
import {PHONE_MEDIA_ACCEPT,normalizePhoneFile,preparePhoneMedia} from './phone-media.js';
import {createPhoneUploadJob,uploadPhoneMemory} from './phone-upload-job.js';
import {HOUSE_ROOMS} from './house-layout.js';
import {MEMORY_OPEN_SPOTS} from './memory-floor-geometry.js';
import {formatFileSize} from './memory-storage.js';
import {MAX_MEMORY_ITEMS} from './memory-media.js';
import {AUDIO_ACCEPT} from './audio-formats.js';
import {validateSoundtrack} from './memory-soundtrack.js';
import {keepOriginalsPreference,saveKeepOriginalsPreference,keepableOriginal} from './memory-originals.js';
import {pairLivePhotos} from './live-photos.js';
import {earliestCaptureDate,captureDateNote} from './capture-date.js';
import {storeQueueRow,removeQueueRow,storeQueueState,clearQueue,loadQueue} from './phone-queue.js';

const root=document.querySelector('#phone-studio'),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let session={},memories=[],rows=[],busy=false,controller,wakeLock,job=createPhoneUploadJob(),soundtrack=null;
const $=s=>root.querySelector(s),existing=()=>memories.find(m=>m.id===$('#target')?.value);
const slideRows=()=>rows.filter(r=>!r.liveFor);
// Everything needed to pick the upload back up after the page was closed.
const rememberRow=r=>storeQueueRow(r,rows.indexOf(r));
function rememberState(){if(!$('#upload-form'))return;return storeQueueState({jobId:job.id,position:job.position||null,uploaded:[...job.uploaded],target:$('#target').value,soundtrack,fields:{title:$('#title').value,date:$('#date').value,description:$('#description').value,room:$('#room').value,published:$('#published').checked}});}
async function restoreQueue(){
 const saved=await loadQueue();if(!saved.rows.length)return false;
 rows=saved.rows.map(r=>({id:r.id,original:r.original,file:r.file||undefined,note:r.file?r.note:'',liveFor:r.liveFor||undefined}));
 for(const r of rows)if(r.file?.type.startsWith('image/'))r.url=URL.createObjectURL(r.file);
 const state=saved.state;
 if(state){
  job=createPhoneUploadJob(state.jobId);job.uploaded=new Map(state.uploaded||[]);if(state.position)job.position=state.position;soundtrack=state.soundtrack instanceof Blob?state.soundtrack:null;
  if(state.target&&memories.some(m=>m.id===state.target)){$('#target').value=state.target;$('#room-label').hidden=true;}
  const f=state.fields||{};$('#title').value=f.title||'';$('#date').value=f.date||'';$('#description').value=f.description||'';if(f.room&&[...$('#room').options].some(o=>o.value===f.room))$('#room').value=f.room;$('#published').checked=!!f.published;
  if(soundtrack)$('#soundtrack-note').textContent=`${soundtrack.name} · ${formatFileSize(soundtrack.size)}`;
 }
 return true;
}
const rooms=HOUSE_ROOMS.filter(r=>r.walkable!==false&&MEMORY_OPEN_SPOTS.some(p=>p[3]===r.id));
async function api(query='',body){
 const response=await fetch('/api/memories'+query,{credentials:'same-origin',cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
 let data;try{data=await response.json();}catch{throw Error('Could not connect to the memory store. Check your connection and try again.');}
 if(!response.ok)throw Error(data.error||'Could not save. Please try again.');return data;
}
function message(text,error=false){const el=$('#message');el.textContent=text;el.classList.toggle('error',error);if(error&&text)el.scrollIntoView({block:'center',behavior:'smooth'});}
function shell(content){root.innerHTML=`<header class="phone-header"><a class="brand" href="/">At Home.</a>${session.authenticated?'<button type="button" id="sign-out">Sign out</button>':'<a href="/admin">Full editor</a>'}</header><main class="phone-main"><p class="eyebrow">Memory studio</p><h1>From your phone,<br>into the house.</h1><p class="lead">Choose photos and videos from your library. We’ll prepare them for your memories.</p><div id="message" class="message" role="status" aria-live="polite"></div>${content}<footer class="phone-footer"><a href="/admin">Open the full memory editor</a><a href="/">Back to the house</a></footer></main>`;}
async function connect(){
 try{session=await api('?action=session');if(session.authenticated){memories=await api('?admin=1');if(!Array.isArray(memories))throw Error('Could not load the library.');memories=memories.filter(m=>!m.deleting&&!m.deletedAt);renderForm();if(await restoreQueue()){renderRows();const uploaded=job.uploaded.size;message(`Your earlier selection is back: ${slideRows().length} ${slideRows().length===1?'item':'items'}${uploaded?`, ${uploaded} already uploaded`:''}. Nothing needs choosing again; save to continue.`);if(rows.some(r=>!r.file))await prepare();}}
 else{shell(`<section class="panel"><h2>Sign in to upload</h2><p class="fine">Use your existing memory-editor password. Your uploads are saved to the same library on all your devices.</p><form id="login-form"><label>Editor password<input type="password" name="password" autocomplete="current-password" required></label><button class="primary">Sign in</button></form></section>`);if(!session.configured||!session.storage)message('The cloud memory store needs to be connected before uploads are available.',true);}}
 catch(error){shell('<section class="panel"><h2>Connection interrupted</h2><button id="connect">Try again</button></section>');message(error.message,true);}
}
function renderForm(){
 shell(`<form id="upload-form"><section class="panel"><h2>1. Choose a memory</h2><label>Save into<select id="target"><option value="">A new memory</option>${memories.map(m=>`<option value="${esc(m.id)}">${esc(m.title)}${m.date?' · '+esc(m.date):''}</option>`).join('')}</select></label><p id="target-note" class="library-note">Photos and videos you choose together become one slideshow memory.</p></section>
 <section class="panel"><h2>2. Add photos & videos</h2><label class="picker"><strong>Choose from your library</strong><span>Photos, Files or camera · up to 30 items per memory</span><input id="media-files" type="file" multiple accept="${PHONE_MEDIA_ACCEPT}" aria-label="Choose photos and videos"></label><p class="fine">HEIC photos are converted automatically. Photos are resized to 1 MB or less. Videos are prepared as smaller MP4s, up to 720p and 20 minutes. A Live Photo saved as a video and chosen together with its photo keeps its motion.</p><label class="check"><input id="keep-originals" type="checkbox" ${keepOriginalsPreference()?'checked':''}><span>Also keep the untouched originals<small>Stored privately at full quality for download and backup. Uploads take longer.</small></span></label><ul class="file-list" id="file-list"></ul><p id="file-summary"></p><button id="retry-preparation" type="button" hidden>Retry preparation</button></section>
 <section class="panel"><h2>3. Add the details</h2><div class="date-row"><label>Title<input id="title" name="title" maxlength="100" required autocomplete="off"></label><label>Date <span class="fine">Optional</span><input name="date" id="date" type="date"></label></div><label>Description <span class="fine">Optional</span><textarea id="description" name="description" maxlength="1600" rows="3"></textarea></label><label id="room-label">Place in the house<select id="room">${rooms.map(r=>`<option value="${r.id}" ${r.id==='living'?'selected':''}>${esc(r.name)}</option>`).join('')}</select></label><p id="placement-note" class="fine">We choose an accessible spot away from furniture. You can adjust it on the floor plan in the full editor.</p><details><summary>Add a soundtrack <span class="fine">Optional</span></summary><p class="fine">A song plays with your slideshow. Leave this empty to keep an existing memory’s soundtrack.</p><label>Choose audio<input id="soundtrack" type="file" accept="${AUDIO_ACCEPT}"></label><p id="soundtrack-note" class="fine">MP3, M4A, AAC and other standard audio formats · up to 100 MB.</p></details><label class="check"><input id="published" type="checkbox"><span>Show this memory in the game<small>Anyone who opens the house can view it. Leave off to save a private draft.</small></span></label><div class="save-row"><button id="save" class="primary" disabled>Save private draft</button><p class="fine">Keep this page open while preparing and uploading. If it closes, your selection and finished uploads are remembered on this phone. Your original photos and videos stay unchanged.</p></div></section></form><section id="progress-panel" class="progress-panel" hidden aria-label="Upload progress"><p id="progress-text" role="status"></p><progress id="progress" max="100" value="0"></progress><button id="cancel" type="button">Stop for now</button></section>`);
 renderRows();updateSave();
}
function renderRows(){
 $('#file-list').innerHTML=rows.map(r=>`<li class="file-row ${r.error?'error':''}">${r.url?`<img src="${esc(r.url)}" alt="" loading="lazy">`:`<span class="file-icon" aria-hidden="true">${r.original.type.startsWith('video/')?'▷':'▧'}</span>`}<div class="file-copy"><strong>${esc(r.original.name)}</strong><p>${r.liveFor?'Live Photo motion · ':''}${esc(r.error||r.note||'Waiting to prepare…')}</p>${r.file?`<p>${formatFileSize(r.original.size)} → ${formatFileSize(r.file.size)}</p>`:''}</div><button type="button" data-remove="${r.id}" aria-label="Remove ${esc(r.original.name)}" ${busy?'disabled':''}>×</button></li>`).join('');
 const ready=rows.filter(r=>r.file).length,keep=$('#keep-originals')?.checked,extra=keep?rows.reduce((n,r)=>n+(!r.liveFor&&r.file&&keepableOriginal(r.original,r.file)?r.original.size:0),0):0;$('#file-summary').textContent=rows.length?`${ready} of ${rows.length} ready · ${formatFileSize(rows.reduce((n,r)=>n+(r.file?.size||0),0))} to upload${extra?` + ${formatFileSize(extra)} of originals`:''}`:'';
 $('#retry-preparation').hidden=!rows.some(r=>!r.file);updateSave();
}
function updateSave(){if(!$('#save'))return;$('#save').disabled=busy||!rows.length||rows.some(r=>!r.file)||!slideRows().length||slideRows().length+(existing()?.media.length||0)>MAX_MEMORY_ITEMS;$('#save').textContent=existing()?'Save additions':$('#published').checked?'Upload and show in game':'Save private draft';}
async function keepAwake(){if(!busy||document.visibilityState!=='visible'||wakeLock)return;try{wakeLock=await navigator.wakeLock?.request('screen');wakeLock?.addEventListener('release',()=>{wakeLock=null;});}catch{}}
function lock(value){busy=value;root.querySelectorAll('button,input,select,textarea').forEach(e=>{if(e.id!=='cancel')e.disabled=value;});$('#progress-panel')?.toggleAttribute('hidden',!value);if(value)keepAwake();else{wakeLock?.release().catch(()=>{});wakeLock=null;}updateSave();}
function progress({text,percentage}){const el=$('#progress');$('#progress-text').textContent=text;if(percentage===null)el.removeAttribute('value');else el.value=percentage||0;}
async function prepare(){
 if(busy)return;controller=new AbortController();lock(true);message('');
 try{for(let i=0;i<rows.length;i++){
  const r=rows[i];if(r.file)continue;controller.signal.throwIfAborted();r.error='';r.note='Preparing…';renderRows();
  try{const result=await preparePhoneMedia(r.original,{signal:controller.signal,onProgress:p=>progress({...p,text:`${i+1} of ${rows.length} · ${p.text}`})});r.file=result.file;r.note=result.note;if(r.file.type.startsWith('image/'))r.url=URL.createObjectURL(r.file);await rememberRow(r);}
  catch(error){if(controller.signal.aborted)throw error;r.error=error.message;r.note='';}renderRows();
 }message(rows.some(r=>r.error)?'Some files need attention. Retry them or remove them before saving.':'Files ready. Review the details and save your memory.',rows.some(r=>r.error));}
 catch(error){message(controller.signal.aborted?'Preparation stopped. Your selection is kept; tap Retry preparation to continue.':error.message,true);}
 finally{if(controller.signal.aborted)for(const r of rows)if(!r.file&&!r.error)r.note='Ready to retry';lock(false);renderRows();}
}
function clearRows(){for(const r of rows)if(r.url)URL.revokeObjectURL(r.url);rows=[];soundtrack=null;job=createPhoneUploadJob();clearQueue();}
function positionForRoom(id){const points=MEMORY_OPEN_SPOTS.filter(p=>p[3]===id);if(!points.length)throw Error('Choose another room.');return points[Math.floor(Math.random()*points.length)].slice(0,3);}
async function saveMemory(){
 if(busy||!rows.length||rows.some(r=>!r.file))return;
 const original=existing(),metadata={title:$('#title').value,date:$('#date').value,description:$('#description').value},published=$('#published').checked;
 if(original&&job.id!==original.id)job=createPhoneUploadJob(original.id);
 const position=original?.position||job.position||(job.position=positionForRoom($('#room').value));
 controller=new AbortController();lock(true);message('');progress({text:'Starting upload…',percentage:0});
 try{
  await rememberState();
  const saved=await uploadPhoneMemory({job,rows,metadata,position,existing:original,soundtrack,published,keepOriginals:$('#keep-originals').checked,signal:controller.signal,onProgress:progress,onUploaded:rememberState,upload,
   save:payload=>api('',payload),findSaved:async id=>(await api('?admin=1')).find(m=>m.id===id)});
  clearRows();lock(false);shell(`<section class="success"><h2>Memory saved.</h2><p><strong>${esc(saved.title)}</strong></p><p>${saved.published?'It is ready to appear in the game.':'It is safely stored as a private draft.'}</p><p class="fine">${saved.media.length} items · ${formatFileSize(saved.media.reduce((n,a)=>n+(a.size||0),0))}</p><button id="another" class="primary">Upload another memory</button><a class="button" href="/admin?memory=${encodeURIComponent(saved.id)}">Edit this memory & its location</a></section>`);
 }catch(error){message((controller.signal.aborted?'Upload stopped.':error.message)+' Your prepared files and finished uploads are kept. Try saving again to continue.',true);}
 finally{lock(false);}
}
root.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;
 if(e.target.id==='login-form'){const password=new FormData(e.target).get('password'),button=e.target.querySelector('button');button.disabled=true;try{await api('?action=login',{password});await connect();}catch(error){message(error.message,true);button.disabled=false;}}
 else if(e.target.id==='upload-form')await saveMemory();
});
root.addEventListener('change',async e=>{
 if(busy)return;
 if(e.target.id==='keep-originals'){saveKeepOriginalsPreference(e.target.checked);renderRows();return;}
 if(e.target.id==='published'){updateSave();rememberState();return;}
 if(e.target.id==='room'){delete job.position;rememberState();return;}
 if(['title','date','description'].includes(e.target.id)){rememberState();return;}
 if(e.target.id==='target'){
  const m=existing();job=createPhoneUploadJob(m?.id);$('#title').value=m?.title||'';$('#date').value=m?.date||'';$('#description').value=m?.description||'';$('#published').checked=!!m?.published;$('#room-label').hidden=!!m;
  $('#placement-note').textContent=m?'The memory keeps its existing location and pet association.':'We choose an accessible spot away from furniture. You can adjust it in the full editor.';
  $('#target-note').textContent=m?`${m.media.length} existing items. New files will be added without replacing them.`:'Photos and videos you choose together become one slideshow memory.';
  message(m&&m.media.length+slideRows().length>MAX_MEMORY_ITEMS?'This selection exceeds 30 items. Remove some files before saving.':'');updateSave();rememberState();return;
 }
 if(e.target.id==='soundtrack'){try{soundtrack=e.target.files[0]?validateSoundtrack(e.target.files[0]):null;$('#soundtrack-note').textContent=soundtrack?`${soundtrack.name} · ${formatFileSize(soundtrack.size)}`:'No new soundtrack selected.';rememberState();}catch(error){e.target.value='';soundtrack=null;message(error.message,true);}return;}
 if(e.target.id==='media-files'){
  const files=Array.from(e.target.files);e.target.value='';if(!files.length)return;
  try{
   const normalized=files.map(normalizePhoneFile),motion=pairLivePhotos(normalized),slides=normalized.filter(f=>!motion.has(f));
   if(slideRows().length+slides.length+(existing()?.media.length||0)>MAX_MEMORY_ITEMS)throw Error('A memory can hold up to 30 photos and videos. Choose fewer files.');
   const added=normalized.map(original=>({id:crypto.randomUUID(),original}));
   for(const [clip,photo] of motion)added[normalized.indexOf(clip)].liveFor=added[normalized.indexOf(photo)].id;
   rows.push(...added);for(const r of added)await rememberRow(r);
   if(!$('#title').value)$('#title').value=slides[0].name.replace(/\.[^.]+$/,'').slice(0,100);
   // Read the capture date from the untouched files; preparing them drops it.
   let dateNote='';if(!$('#date').value){const taken=await earliestCaptureDate(slides).catch(()=>null);if(taken){$('#date').value=taken.date;dateNote=captureDateNote(taken);}}
   renderRows();await rememberState();await prepare();if(dateNote&&!rows.some(r=>r.error))message('Files ready. '+dateNote);
  }catch(error){message(error.message,true);}
 }
});
root.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.id==='cancel'){controller?.abort();return;}if(busy)return;
 if(b.dataset.remove){const gone=rows.filter(r=>r.id===b.dataset.remove||r.liveFor===b.dataset.remove);for(const r of gone){if(r.url)URL.revokeObjectURL(r.url);removeQueueRow(r.id);}rows=rows.filter(row=>!gone.includes(row));renderRows();}
 if(b.id==='retry-preparation')await prepare();
 if(b.id==='another'||b.id==='connect')await connect();
 if(b.id==='sign-out'){if(rows.length&&!confirm('Discard the selected files and sign out?'))return;try{await api('?action=logout',{});clearRows();await connect();}catch(error){message(error.message,true);}}
});
document.addEventListener('visibilitychange',keepAwake);
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
root.addEventListener('input',e=>{if(['title','description'].includes(e.target.id)){clearTimeout(rememberState.timer);rememberState.timer=setTimeout(rememberState,600);}});
connect();
