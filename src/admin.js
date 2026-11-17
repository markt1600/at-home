import './admin.css';
import {PHOTO_ACCEPT,prepareMemoryPhotos} from './photo-import.js';
import {preparePhotoReplacements} from './photo-compression.js';
import {PET_MEMORY_NAMES,cleanMemoryPet} from './pet-memories.js';
import {upload} from '@vercel/blob/client';
import {loadMemories,saveLocalMetadata,MEMORY_PLACEMENTS,placedMemory,addLocalMemory,appendLocalPhotos,replaceLocalPhotos,saveLocalSoundtrack,removeLocalMemory} from './memories.js';
import {cleanMemoryMetadata,formatMemoryDate} from './memory-metadata.js';
import {memoryMedia,releaseMemoryUrls,validateMemoryFiles} from './memory-media.js';
import {mountMemoryFloorPlan} from './memory-placement.js';
import {mountMusicLibrary} from './music-admin.js';
import {AUDIO_ACCEPT,audioExtension,audioContentType} from './audio-formats.js';
import {validateSoundtrack} from './memory-soundtrack.js';
import {memoryStorageLabel,formatFileSize} from './memory-storage.js';
import {keepableOriginal,originalUpload,keepOriginalsPreference,saveKeepOriginalsPreference} from './memory-originals.js';
import {pairLivePhotos} from './live-photos.js';
import {earliestCaptureDate,captureDateNote} from './capture-date.js';
import {exportLibrary,openExportTarget} from './memory-export.js';
import {DECORATIONS,MAX_OCCASIONS,occasionDate,todaysOccasions} from './occasions.js';

const root=document.querySelector('#studio');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let items=[],selected=new URLSearchParams(location.search).get('memory'),session={},busy=false,message='',floorPlan=null,pendingFiles=[],filePreviews=[],pendingReplacements=[],replacementPreviews=[];
let libraryQuery='',libraryFilter='all',pendingSoundtrack=undefined,house={christmas:false,occasions:[],storage:false,known:false},backup=null,exporting=null;
// The prepared copy the house plays → the untouched file it came from, and → its Live Photo motion clip.
const originalOf=new WeakMap(),liveOf=new WeakMap();
const RETENTION_DAYS=30,daysLeft=m=>Math.max(0,Math.ceil(RETENTION_DAYS-(Date.now()-Date.parse(m.deletedAt))/86400000));
const keepOriginalsOption=()=>`<label class="check keep-originals"><input type="checkbox" name="keep-originals" ${keepOriginalsPreference()?'checked':''}><span>Also keep the untouched originals<br><small>Stored privately at full quality for download and backup. The house plays the smaller copy.</small></span></label>`;
function soundtrackPicker(m){return `<div class="memory-soundtrack" data-audio-drop><h3>Memory soundtrack <small>Optional</small></h3><p class="fine">A song plays continuously while the photos cycle. House audio pauses until you return. For mixed albums, it replaces video audio too.</p>${m?.soundtrack?`<p>${esc(m.soundtrack.title)}</p><audio controls preload="none" src="${esc(m.soundtrack.src)}"></audio>`:''}<label>Drop a song here or choose audio<input name="soundtrack" type="file" accept="${AUDIO_ACCEPT}"></label><p class="fine">MP3, M4A/AAC, WAV, Ogg/Opus, FLAC or WebM audio · Up to 100 MB</p><p id="soundtrack-selection" role="status"></p><button type="button" data-action="remove-soundtrack">No soundtrack</button></div>`;}
function selectSoundtrack(files){if(files.length!==1)throw Error('Choose one song for this memory.');pendingSoundtrack=validateSoundtrack(files[0]);root.querySelector('#soundtrack-selection').textContent=pendingSoundtrack.name+' — ready to save';status('Soundtrack ready. Save the memory to attach it.');}
function clearFile(){pendingReplacements=[];for(const url of replacementPreviews)URL.revokeObjectURL(url);replacementPreviews=[];pendingSoundtrack=undefined;pendingFiles=[];for(const url of filePreviews)URL.revokeObjectURL(url);filePreviews=[];}
async function api(path='',body){
 const r=await fetch('/api/memories'+path,{...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),credentials:'same-origin'});
 let data;try{data=await r.json();}catch{throw Error('Cloud storage is available on the Vercel deployment. Local editing still works here.');}
 if(!r.ok)throw Error(data.error||'Unable to connect');return data;
}
async function refresh(){
 for(const m of items)releaseMemoryUrls(m);
 try{items=await loadMemories({cloud:false});}catch(error){items=[];status('Could not read the memories saved in this browser. '+error.message);}
 try{session=await api('?action=session');}catch{session={};}
 try{const r=await fetch('/api/house-settings',{cache:'no-store',credentials:'same-origin'});if(r.ok){const data=await r.json();house={christmas:!!data.christmas,occasions:Array.isArray(data.occasions)?data.occasions:[],storage:!!data.storage,known:true};}}catch{house={...house,known:false};}
 if(session.authenticated)try{const r=await fetch('/api/memory-backup',{cache:'no-store',credentials:'same-origin'});backup=r.ok?await r.json():null;}catch{backup=null;}
 if(session.authenticated)try{const cloud=await api('?admin=1');if(!Array.isArray(cloud))throw Error('The library came back in an unexpected shape.');items.push(...cloud);}catch(error){status('Could not load your cloud memories. Use Refresh library to try again. '+error.message);}
 if(selected!=='new'&&!items.some(m=>m.id===selected))selected=null;   // nothing opens by itself: a selected memory loads its whole album
 try{render();}
 catch(error){
  // Never leave a blank page: show the sign-in shell with the failure, and let the library render without the broken editor.
  console.error(error);selected=null;
  try{render();}catch{root.innerHTML=`<header><a href="/">At Home.</a><span>Memory studio</span></header><main class="boot"><p><strong>The memory studio could not draw the page.</strong></p><p class="boot-detail">${esc(error.message)}</p></main>`;}
  status('Something in the library could not be shown: '+error.message);
 }
}
const memoryState=m=>m.deleting?'Deletion incomplete':m.deletedAt?`Deleted · ${daysLeft(m)} ${daysLeft(m)===1?'day':'days'} left`:m.cloud?(m.published?'Published':'Private draft'):'This device';
function libraryContents(){
 const query=libraryQuery.trim().toLocaleLowerCase();
 const matches=items.filter(m=>(!query||[m.title,m.description,m.date].some(s=>String(s||'').toLocaleLowerCase().includes(query)))&&(libraryFilter==='deleted'?!!m.deletedAt:!m.deletedAt&&(libraryFilter==='all'||libraryFilter==='published'&&m.cloud&&m.published||libraryFilter==='draft'&&m.cloud&&!m.published||libraryFilter==='device'&&!m.cloud)));
 const kept=items.filter(m=>!m.deletedAt).length;
 return `<p class="library-count">${libraryFilter==='deleted'?`${matches.length} recently deleted`:`${matches.length} of ${kept} saved ${kept===1?'memory':'memories'}`}</p>${matches.map(m=>`<button data-id="${esc(m.id)}" class="memory-card ${m.id===selected?'selected':''}" aria-pressed="${m.id===selected}"><span class="memory-thumb" aria-hidden="true">${memoryMedia(m)[0]?.type==='image'&&!m.deleting?`<img src="${esc(memoryMedia(m)[0].thumb||m.src)}" alt="" loading="lazy">`:m.type==='video'?'▶':'✧'}</span><span class="memory-card-copy"><strong>${esc(m.title)}</strong><small>${esc(memoryState(m))}${m.date?' · '+esc(formatMemoryDate(m.date)):''}</small><span class="memory-kind">${m.type==='video'?'Video':'Photo'}${memoryMedia(m).length>1?` · ${memoryMedia(m).length} items`:''}</span><small class="memory-storage" title="Combined size of stored photos, videos and any soundtrack">${esc(memoryStorageLabel(m))}${m.soundtrack?' · includes audio':''}</small></span></button>`).join('')||`<p>${libraryFilter==='deleted'?'Nothing has been deleted in the last 30 days.':items.length?'No memories match. Try another search or filter.':session.authenticated?'Your library is empty. Drop in a photo or video to start.':'Sign in to see your saved cloud memories. Device memories also appear here.'}</p>`}`;
}
function renderLibrary(){const el=root.querySelector('.library');if(el)el.innerHTML=libraryContents();}
function confirmDelete(memory,forever=false){return new Promise(resolve=>{
 const dialog=document.createElement('dialog');dialog.className='delete-dialog';dialog.setAttribute('aria-labelledby','delete-title');dialog.setAttribute('aria-describedby','delete-description');
 dialog.innerHTML=`<h2 id="delete-title">${forever?'Delete this memory forever?':'Delete this memory?'}</h2><p class="delete-memory-name">${esc(memory.title)}</p><p id="delete-description">${memory.cloud?(forever?'This permanently removes its photos, videos, originals and story. It cannot be undone.':'It leaves the game now and waits in Recently deleted for 30 days, where you can restore it.'):memory.local?'This removes the saved file and story from this browser. Your original file and any cloud copy are kept.':'This removes this test memory from the library and game on this device. The original source file is kept.'}</p><form method="dialog"><button value="cancel" autofocus>Keep memory</button><button class="danger" value="delete">${forever?'Delete forever':'Delete memory'}</button></form>`;
 dialog.addEventListener('close',()=>{const confirmed=dialog.returnValue==='delete';dialog.remove();resolve(confirmed);},{once:true});document.body.append(dialog);dialog.showModal();
 });}
const locations=()=>MEMORY_PLACEMENTS.map(p=>`<option value="${p.id}">${esc(p.title)} · ${esc(p.room)}</option>`).join('');
const compressionPanel=m=>memoryMedia(m).some(a=>a.type==='image')?'<section class="photo-compression"><strong>Smaller photo files</strong><p class="fine">Reduce existing photos to 1 MB or less each. Review the sizes below, then save changes to replace the stored copies. Videos and audio stay as they are.</p><button type="button" data-action="compress-photos">Compress photos</button><div id="compression-selection" role="status"></div></section>':'';
async function compressExistingPhotos(){
 const memory=items.find(m=>m.id===selected);if(!memory)return;lock(true);
 const replacements=await preparePhotoReplacements(memoryMedia(memory),{onProgress:status});
 for(const url of replacementPreviews)URL.revokeObjectURL(url);pendingReplacements=replacements;replacementPreviews=replacements.map(r=>URL.createObjectURL(r.file));
 root.querySelector('#compression-selection').innerHTML=replacements.length?`<div class="album-strip">${replacements.map((r,i)=>`<div><img src="${esc(replacementPreviews[i])}" alt="Compressed photo ${i+1}"><small>${formatFileSize(r.previousSize)} → ${formatFileSize(r.file.size)}</small></div>`).join('')}</div><p>${replacements.length} compressed ${replacements.length===1?'photo':'photos'} ready. Save changes to apply.</p>`:'<p>Every photo is already 1 MB or less.</p>';
 status(replacements.length?'Compression ready. Review the photos and save changes to replace the stored copies.':'Every photo is already 1 MB or less.');
}
const dropzone=()=>`<div class="file-dropzone" data-dropzone><span class="drop-symbol" aria-hidden="true">↥</span><strong>Drop photos or videos here</strong><span>or choose files from your device</span><label class="file-choice">Choose files<input name="file" type="file" multiple accept="${PHOTO_ACCEPT},video/mp4,video/webm,video/quicktime,.mov,.m4v"></label><p class="fine">JPG, PNG, WebP or iPhone HEIC/HEIF · Up to 30 items in one memory · Photos advance every 2 seconds · Photos are compressed in your browser to 1 MB or less · Videos of any size up to 1 GB are converted here to a smaller MP4 (up to 720p, 20 minutes) before uploading · A photo and a short clip with the same name (IMG_1234.HEIC + IMG_1234.MOV) become one Live Photo</p>${session.authenticated?keepOriginalsOption():''}<div id="file-selection" role="status"></div></div>`;
const spotPicker=(edit=false)=>`<label>Open this memory from<select name="petId"><option value="">A spot in the house</option>${Object.entries(PET_MEMORY_NAMES).map(([id,name])=>`<option value="${id}">Interacting with ${name}</option>`).join('')}</select></label><p class="fine pet-memory-note" hidden>Find this memory when you interact with the pet. It does not add a floor marker.</p><div class="floor-memory-controls"><label>Start from a familiar spot<select name="placement">${edit?'<option value="keep">Keep current location</option>':''}${locations()}<option value="custom" hidden>Custom spot on floor plan</option></select></label><div id="floor-plan"></div></div>`;
function historyPanel(m){
 if(!m.history?.length)return '';
 return `<details class="memory-history"><summary>Earlier versions <small>${m.history.length}</small></summary><p class="fine">The story as it was before each change. Bringing one back fills in the form above; save to keep it.</p><ol>${m.history.map((h,i)=>`<li><div><strong>${esc(h.title)}</strong><small>${h.date?esc(formatMemoryDate(h.date))+' · ':''}changed ${esc(new Date(h.at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}))}</small><p>${esc((h.description||'').slice(0,160))}${(h.description||'').length>160?'…':''}</p></div><button type="button" data-history="${i}">Bring back</button></li>`).join('')}</ol></details>`;
}
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
function occasionsPanel(){
 const today=todaysOccasions(house.occasions),sorted=house.occasions.map((o,i)=>({...o,i})).sort((a,b)=>a.month-b.month||a.day-b.day);
 return `<div class="occasions"><h3>Special days</h3><p class="fine">On these dates each year the house puts out balloons in the living room, dining room and entrance, and greets whoever comes in. A memory's own anniversary gets a few balloons by its marker without being listed here.</p>${sorted.length?`<ul>${sorted.map(o=>`<li><span><strong>${esc(o.name)}</strong><small>${esc(occasionDate(o))} · ${esc(DECORATIONS[o.decoration]||'')}${today.includes(house.occasions[o.i])?' · today':''}</small></span><button type="button" data-occasion-remove="${o.i}" aria-label="Remove ${esc(o.name)}">Remove</button></li>`).join('')}</ul>`:''}${house.occasions.length<MAX_OCCASIONS?`<form id="add-occasion"><label>Name<input name="name" maxlength="40" placeholder="Penny’s birthday" required></label><label>Month<select name="month">${MONTHS.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('')}</select></label><label>Day<input name="day" type="number" min="1" max="31" value="1" required></label><label>Decoration<select name="decoration">${Object.entries(DECORATIONS).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><button ${house.storage?'':'disabled'}>Add special day</button></form>`:''}</div>`;
}
async function saveOccasions(occasions,done){
 const r=await fetch('/api/house-settings',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({occasions})}),data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(data.error||'Could not update the special days');
 house={...house,occasions:data.occasions||[],storage:true,known:true};const el=root.querySelector('.occasions');if(el)el.outerHTML=occasionsPanel();status(done);
}
function safekeepingPanel(){
 const cloud=items.filter(m=>m.cloud&&!m.deleting),originals=cloud.reduce((n,m)=>n+memoryMedia(m).filter(a=>a.original).length,0),slides=cloud.reduce((n,m)=>n+memoryMedia(m).length,0);
 const status=backup?.status,when=status?.finishedAt&&new Date(status.finishedAt).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
 const second=!backup?'The second-copy status could not be read.':!backup.configured?'No second copy yet. Connect a second private Blob store and add its token as BACKUP_BLOB_READ_WRITE_TOKEN (see the memories guide).'
  :!status?'A second store is connected. Nothing has been copied yet.':`Second copy updated ${esc(when)} · ${status.files} files, ${formatFileSize(status.totalBytes)}${status.remaining?` · ${status.remaining} still to copy`:' · up to date'}${status.failed?` · ${status.failed} could not be copied`:''}${backup.scheduled?' · runs daily':' · set CRON_SECRET to run daily'}`;
 return `<section class="safekeeping"><div><h2>Keep them safe</h2><p class="fine">${cloud.length} cloud ${cloud.length===1?'memory':'memories'} · originals kept for ${originals} of ${slides} items. Deleted memories can be restored for 30 days.</p><p class="fine" id="backup-status">${second}</p><p id="export-status" role="status">${exporting?esc(exporting):''}</p></div><div class="safekeeping-actions"><button type="button" data-action="export" ${cloud.length?'':'disabled'}>Download everything</button>${backup?.configured?'<button type="button" data-action="backup-now">Update second copy now</button>':''}</div></section>`;
}
async function downloadEverything(){
 const cloud=items.filter(m=>m.cloud&&!m.deleting);if(!cloud.length)return;
 const say=text=>{exporting=text;const el=root.querySelector('#export-status');if(el)el.textContent=text;};
 let target;try{target=await openExportTarget(`at-home-memories-${new Date().toISOString().slice(0,10)}.zip`);}catch(error){if(error.name==='AbortError')return;throw error;}
 lock(true);
 try{
  const result=await exportLibrary(cloud,{write:target.write,onProgress:({done,total,path})=>say(done<total?`Downloading ${done+1} of ${total}: ${path}`:'Finishing the archive…')});
  await target.close();say(`Archive ready: ${result.files} files, ${formatFileSize(result.bytes)}.${result.missing.length?` ${result.missing.length} could not be downloaded and are listed inside it.`:''} Keep it somewhere other than this computer too.`);
 }catch(error){await target.abort();say('The download stopped: '+error.message+' Nothing in your library changed. Try again.');}
 finally{lock(false);}
}
function editorContent(m){
 if(m?.deleting)return `<div class="empty"><h2>${esc(m.title)}</h2><p>This memory is hidden while deletion finishes. Retry to remove the remaining stored files.</p><button type="button" class="danger" data-action="purge">Delete memory</button></div>`;
 if(m?.deletedAt)return `<div class="editor-heading"><h2>${esc(m.title)}</h2></div><p class="fine">Deleted ${esc(formatMemoryDate(m.deletedAt.slice(0,10)))}. It is hidden from the game and will be removed for good in ${daysLeft(m)} ${daysLeft(m)===1?'day':'days'}. Its photos, videos and originals are still stored.</p><div class="preview">${memoryMedia(m)[0]?.type==='video'?`<video controls playsinline preload="metadata" src="${esc(m.src)}"></video>`:`<img src="${esc(m.src)}" alt="${esc(m.title)}">`}</div><div class="row"><button type="button" class="primary" data-action="restore">Restore memory</button><button type="button" class="danger-text" data-action="purge">Delete forever</button></div>`;
 if(selected==='new')return `<h2>A new memory</h2><form id="new-memory">${dropzone()}<label>Title<input name="title" maxlength="100" required></label><label>Date <small>Optional</small><input name="date" type="date"></label><label>Description<textarea name="description" rows="3" maxlength="1600"></textarea></label>${soundtrackPicker()}${spotPicker()}<p class="fine">MP4 gives the widest video playback support.</p><button class="primary">${session.authenticated?'Upload as private draft':'Save on this device'}</button><progress id="progress" max="100" value="0" hidden></progress></form>`;
 if(!m)return `<div class="empty" data-dropzone><span>✧</span><h2>Make a moment your own.</h2><p>Select a memory to edit its story, or drop a photo or video here to start.</p><button type="button" data-action="new">Choose a photo or video</button></div>`;
 return `<div class="editor-heading"><h2>Edit memory</h2><button type="button" class="danger-text" data-action="delete">Delete memory</button></div><div class="preview">${memoryMedia(m)[0]?.type==='video'?`<video controls playsinline preload="metadata" src="${esc(m.src)}"></video>`:`<img src="${esc(m.src)}" alt="${esc(m.title)}">`}</div><div class="album-strip">${memoryMedia(m).map((a,i)=>`<div>${a.type==='video'?'<span>▷</span>':`<img src="${esc(a.thumb||a.src)}" alt="Photo ${i+1}" loading="lazy">`}<small>${i+1}${a.live?' · Live':''}</small>${a.original?`<a class="original-link" href="${esc(a.original.src)}" download title="${esc(a.original.name)}${a.original.size?' · '+formatFileSize(a.original.size):''}">Original</a>`:''}</div>`).join('')}</div>${compressionPanel(m)}<div class="append-photos" data-dropzone><strong>Add photos to this memory</strong><p class="fine">Drop more photos here, or select them below. They will be added to the slideshow when you save. iPhone HEIC/HEIF photos are converted automatically. Each new photo is compressed to 1 MB or less before uploading. Add a Live Photo’s clip with its photo to keep the motion.</p><label>Choose additional photos<input name="append-photos" type="file" multiple accept="${PHOTO_ACCEPT},video/mp4,video/quicktime,.mov"></label>${m.cloud?keepOriginalsOption():''}<div id="file-selection" role="status"></div></div><form id="edit-memory"><label>Title<input name="title" value="${esc(m.title)}" maxlength="100" required></label><label>Date <small>Optional</small><input name="date" type="date" value="${esc(m.date)}"></label><label>Description<textarea name="description" rows="4" maxlength="1600">${esc(m.description)}</textarea></label>${soundtrackPicker(m)}${spotPicker(true)}${m.cloud?`<label class="check"><input type="checkbox" name="published" ${m.published?'checked':''}><span>Show this memory in the game<br><small>Anyone who opens the game can relive it.</small></span></label>`:''}${historyPanel(m)}<div class="row"><button class="primary">Save changes</button>${!m.cloud&&session.authenticated?'<button type="button" data-action="upload-local">Copy to cloud as private draft</button>':''}</div><progress id="progress" max="100" value="0" hidden></progress></form>`;
}
function render(){
 root.querySelectorAll('audio,video').forEach(media=>media.pause());
 const m=items.find(m=>m.id===selected);floorPlan=null;
 const signedIn=!!session.authenticated;
 // Signed out, the page is a locked door: just the sign-in form. Every upload
 // control (the dropzones, the library, the music uploads, the phone uploader
 // link) appears only once the editor password has been accepted.
 const connection=signedIn?'<p class="connection-note">Private storage connected · New uploads start as drafts. Published memories are visible to anyone who can open the game.</p>'
  :`<section class="connection"><div><h2>Sign in to edit memories</h2><p>${session.configured?'Uploads, the library and the music studio unlock once you sign in with the editor password.':session.storage?'Your private store is connected. Set MEMORY_ADMIN_PASSWORD in the At Home Vercel project, then sign in here to upload memories.':'Open this editor on the Vercel deployment and sign in with the editor password to upload memories.'}</p></div>${session.configured?'<form id="login"><label>Editor password<input type="password" name="password" autocomplete="current-password" required></label><button>Sign in</button></form>':''}</section>`;
 const houseSection=signedIn?`<section class="house-settings"><div><h2>The house</h2><p class="fine">Switches here change the house for everyone who opens it, on every device, until you turn them off.</p></div><label class="check"><input type="checkbox" name="christmas" ${house.christmas?'checked':''} ${house.storage?'':'disabled'}><span>🎄 Christmas mode<br><small>The Christmas tree stands in the living room by the turntable, with the bags and presents underneath.${house.storage?'':' Connect the private store to switch it on.'}</small></span></label>${occasionsPanel()}</section>`:'';
 const workspace=signedIn?`<div class="workspace"><aside><button class="primary" data-action="new">+ Add a memory</button><div class="library-heading"><h2>Saved memories</h2><button type="button" data-action="refresh" aria-label="Refresh library">↻</button></div><label class="library-search">Search memories<input type="search" name="library-search" value="${esc(libraryQuery)}" placeholder="Title, story or date"></label><label class="library-filter">Show<select name="library-filter"><option value="all">All memories</option><option value="published">Published</option><option value="draft">Private drafts</option><option value="device">On this device</option><option value="deleted">Recently deleted</option></select></label><div class="library">${libraryContents()}</div></aside><section class="editor">${editorContent(m)}</section></div>`:'';
 root.innerHTML=`<header data-studio-ready><a href="/">At Home.</a><span>Memory studio</span>${signedIn?'<button data-action="logout">Sign out</button>':''}</header><main><section class="intro"><p class="eyebrow">Keep the moments that matter</p><h1>A house full of memories.</h1><p>${signedIn?'Drop in a photo or video, tell its story, and pin the place on your floor plan.':'Photos and videos, their stories, and a pin on the floor plan. Sign in to begin.'}</p></section><p role="status" id="status">${esc(message)}</p>
 ${connection}${houseSection}${workspace}${signedIn?safekeepingPanel():''}</main>`;
 if(!signedIn)return;
 root.querySelector('[name="library-filter"]').value=libraryFilter;
 const musicHost=document.createElement('section');musicHost.id='music-studio';root.querySelector('main').append(musicHost);mountMusicLibrary(musicHost,{authenticated:true});
 const musicLink=document.createElement('a');musicLink.href='#music-studio';musicLink.textContent='Turntable music';root.querySelector('header').append(musicLink);
 const phoneLink=document.createElement('a');phoneLink.className='phone-upload-link';phoneLink.href='/admin/upload';phoneLink.textContent='Upload from iPhone / phone';root.querySelector('.intro').append(phoneLink);
 const host=document.querySelector('#floor-plan');
 if(host)floorPlan=mountMemoryFloorPlan(host,{position:m?.position||placedMemory(MEMORY_PLACEMENTS[0]).position,memories:items.filter(i=>i.id!==selected&&!i.petId&&!i.deletedAt),disabled:()=>busy,onChange:()=>{document.querySelector('select[name="placement"]').value='custom';}});
 syncMemorySource(m?.petId);
}
function syncMemorySource(petId){const field=root.querySelector('[name=petId]');if(!field)return;field.value=petId||'';root.querySelector('.floor-memory-controls').hidden=!!petId;root.querySelector('.pet-memory-note').hidden=!petId;}
function status(text){message=text;const el=document.querySelector('#status');if(el)el.textContent=text;}
function lock(value){busy=value;for(const el of root.querySelectorAll('button,input,textarea,select'))el.disabled=value;}
const metadata=form=>{const data=Object.fromEntries(new FormData(form));return {...cleanMemoryMetadata(data),petId:cleanMemoryPet(data.petId)};};
// Preparation progress is shown inside the dropzone as well as the status line,
// so a long video conversion never looks like a silent failure.
function showPreparation(text,error=false){status(text);const el=document.querySelector('#file-selection');if(el)el.innerHTML=`<p class="prep-progress ${error?'error':''}">${esc(text)}</p>`;}
async function selectFiles(input){
 const m=items.find(m=>m.id===selected),append=!!m;
 const chosen=Array.from(input),motion=pairLivePhotos(chosen),videos=chosen.filter(f=>!motion.has(f)&&(f.type.startsWith('video/')||/\.(mov|mp4|m4v|webm)$/i.test(f.name))),photos=chosen.filter(f=>!videos.includes(f)&&!motion.has(f));
 if(append&&videos.length)throw Error('Only photos can be added to an existing memory. Make a new memory for a video.');
 let files,taken=null;lock(true);
 try{
  // Read the capture date from the untouched files; re-encoding drops it.
  taken=await earliestCaptureDate([...photos,...videos]).catch(()=>null);
  const ready=[],clips=[...videos,...motion.keys()],prepared=new Map();
  if(clips.length){
   const {preparePhoneMedia}=await import('./phone-media.js');
   for(const [i,video] of clips.entries()){
    const prefix=clips.length>1?`Video ${i+1} of ${clips.length}: `:'';
    const result=await preparePhoneMedia(video,{onProgress:({text,percentage})=>showPreparation(prefix+text+(percentage===null||percentage===undefined?'':` ${percentage}%`))});
    prepared.set(video,result.file);
    if(!motion.has(video)){originalOf.set(result.file,video);ready.push(result.file);}
   }
  }
  if(photos.length){
   const small=await prepareMemoryPhotos(photos,{photosOnly:append,existing:append?memoryMedia(m).length:0,onProgress:showPreparation});
   small.forEach((file,i)=>{if(file!==photos[i])originalOf.set(file,photos[i]);});
   for(const [clip,photo] of motion)liveOf.set(small[photos.indexOf(photo)],prepared.get(clip));
   ready.push(...small);
  }
  files=validateMemoryFiles(ready,{photosOnly:append,existing:append?memoryMedia(m).length:0});
 }
 catch(error){showPreparation(error.message,true);throw error;}
 finally{lock(false);}
 if(!append&&selected!=='new'){clearFile();selected='new';render();}
 for(const url of filePreviews)URL.revokeObjectURL(url);pendingFiles=files;filePreviews=files.map(file=>URL.createObjectURL(file));
 document.querySelector('#file-selection').innerHTML=`<div class="album-strip">${files.map((file,i)=>`<div>${file.type.startsWith('video/')?'<span>▷</span>':`<img src="${esc(filePreviews[i])}" alt="Selected photo ${i+1}">`}<small>${esc(file.name)} · ${formatFileSize(file.size)}${liveOf.has(file)?' · Live':''}</small></div>`).join('')}</div><p>${files.length} ${append?'additional ':''}item${files.length===1?'':'s'} ready to save.</p>`;
 const title=document.querySelector('#new-memory input[name="title"]');if(title&&!title.value)title.value=files[0].name.replace(/\.[^.]+$/,'').slice(0,100);
 const date=document.querySelector('#new-memory input[name="date"]');let dateNote='';
 if(date&&!date.value&&taken){date.value=taken.date;dateNote=' '+captureDateNote(taken);}
 status((append?'Photos ready. Save changes to add them to this memory.':'Files ready. Add their story and choose a spot on the floor plan.')+dateNote);
}
root.addEventListener('dragover',e=>{const zone=e.target.closest('[data-dropzone],[data-audio-drop]');if(!zone)return;e.preventDefault();if(!busy){e.dataTransfer.dropEffect='copy';zone.classList.add('drag-over');}});
root.addEventListener('dragleave',e=>{const zone=e.target.closest('[data-dropzone],[data-audio-drop]');if(zone&&!zone.contains(e.relatedTarget))zone.classList.remove('drag-over');});
root.addEventListener('drop',async e=>{const zone=e.target.closest('[data-dropzone],[data-audio-drop]');if(!zone)return;e.preventDefault();zone.classList.remove('drag-over');if(busy)return;try{if(zone.hasAttribute('data-audio-drop'))selectSoundtrack(e.dataTransfer.files);else await selectFiles(e.dataTransfer.files);}catch(error){status(error.message);}});
// Prevent accidental navigation away from an unsaved form when a file misses the zone.
window.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('Files'))e.preventDefault();});
window.addEventListener('drop',e=>{if([...e.dataTransfer.types].includes('Files'))e.preventDefault();});
root.addEventListener('input',e=>{if(!busy&&e.target.name==='library-search'){libraryQuery=e.target.value;renderLibrary();}});
root.addEventListener('change',async e=>{
 if(e.target.closest('#music-studio'))return;
 if(busy)return;try{
  if(e.target.name==='christmas'){
   const on=e.target.checked;e.target.disabled=true;
   try{const r=await fetch('/api/house-settings',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({christmas:on})});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Could not update the house');house={...house,christmas:!!data.christmas,storage:true,known:true};status(on?'Christmas mode is on: the tree is up in the living room for everyone.':'Christmas mode is off: the tree is packed away.');}
   catch(error){e.target.checked=house.christmas;status(error.message);}
   finally{e.target.disabled=false;}
   return;
  }
  if(e.target.name==='keep-originals'){saveKeepOriginalsPreference(e.target.checked);root.querySelectorAll('[name=keep-originals]').forEach(el=>el.checked=e.target.checked);return;}
  if(e.target.name==='petId')syncMemorySource(e.target.value);
  if(e.target.name==='library-filter'){libraryFilter=e.target.value;renderLibrary();}
  if(e.target.name==='soundtrack'&&e.target.files.length)selectSoundtrack(e.target.files);
  else if(e.target.matches('input[type="file"]')&&e.target.files.length)await selectFiles(e.target.files);
  if(e.target.matches('select[name="placement"]')){const id=e.target.value,m=items.find(m=>m.id===selected);if(id==='keep'&&m)floorPlan.setPosition(m.position);else if(id!=='custom')floorPlan.setPosition(placedMemory(MEMORY_PLACEMENTS.find(p=>p.id===id)).position);}
 }catch(error){status(error.message);}
});
const blobUpload=(path,file,contentType,onUploadProgress)=>upload(path,file,{access:'private',handleUploadUrl:'/api/memory-upload',multipart:true,contentType,...(onUploadProgress?{onUploadProgress}:{})});
// Uploads the prepared copies, then each one's Live Photo motion and untouched
// original. The record that names them all is saved only after every file is in.
async function uploadPhotos(files,id,existingCount=0,{extras=true}={}){
 files=await prepareMemoryPhotos(files,{existing:existingCount,onProgress:status});const paths=[],addOriginals=[],addLivePhotos=[];
 const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'};
 const progress=document.querySelector('#progress');if(progress)progress.hidden=false;
 const keep=extras&&root.querySelector('[name=keep-originals]')?.checked===true;
 for(let i=0;i<files.length;i++){
  const file=files[i],path=`media/${id}/${crypto.randomUUID()}.${extensions[file.type]}`,asset=path.split('/').at(-1),step=({percentage})=>{if(progress)progress.value=(i+percentage/100)/files.length*100;};
  status(`Uploading item ${i+1} of ${files.length}…`);await blobUpload(path,file,file.type,step);paths.push(path);
  const clip=extras&&liveOf.get(file);
  if(clip){status(`Uploading the Live Photo motion for item ${i+1}…`);const live=`media/${id}/${crypto.randomUUID()}.mp4`;await blobUpload(live,clip,'video/mp4');addLivePhotos.push({asset,path:live});}
  const original=originalOf.get(file);
  if(keep&&keepableOriginal(original,file)){status(`Keeping the original of item ${i+1} of ${files.length} (${formatFileSize(original.size)})…`);const target=originalUpload(original,id);await blobUpload(target.path,original,target.contentType,step);addOriginals.push({asset,path:target.path,name:original.name});}
 }
 return {paths,extras:{...(addOriginals.length?{addOriginals}:{}),...(addLivePhotos.length?{addLivePhotos}:{})}};
}
async function uploadSoundtrack(file,id){
 if(file===undefined)return {};if(file===null)return {soundtrackPath:null};validateSoundtrack(file);
 const path=`soundtracks/${id}/${crypto.randomUUID()}.${audioExtension(file.name)}`;status('Uploading memory soundtrack…');
 await upload(path,file,{access:'private',handleUploadUrl:'/api/memory-upload',multipart:true,contentType:audioContentType(file.name)});
 return {soundtrackPath:path,soundtrackTitle:file.name.replace(/\.[^.]+$/,'').slice(0,100)};
}
async function cloudUpload(files,meta,position,soundtrack=pendingSoundtrack){
 const id=crypto.randomUUID(),{paths:addMediaPaths,extras}=await uploadPhotos(files,id);
 const audio=await uploadSoundtrack(soundtrack,id);const saved=await api('',{id,...meta,position,addMediaPaths,...extras,...audio,published:false});selected=saved.id;status('Saved to the cloud as a private draft.');
}
root.addEventListener('click',async e=>{
 if(e.target.closest('#music-studio'))return;
 const b=e.target.closest('button');if(!b||busy)return;try{
  if(b.dataset.action==='compress-photos'){await compressExistingPhotos();return;}
  if(b.dataset.action==='remove-soundtrack'){pendingSoundtrack=null;root.querySelector('[name=soundtrack]').value='';root.querySelector('.memory-soundtrack audio')?.pause();root.querySelector('#soundtrack-selection').textContent='No soundtrack — save to apply';return;}
  if(b.dataset.action==='refresh'){clearFile();lock(true);message='';await refresh();return;}
  if(b.dataset.occasionRemove!==undefined){const gone=house.occasions[Number(b.dataset.occasionRemove)];await saveOccasions(house.occasions.filter(o=>o!==gone),`${gone?.name||'Special day'} removed.`);return;}
  if(b.dataset.action==='export'){await downloadEverything();return;}
  if(b.dataset.action==='backup-now'){
   lock(true);const el=root.querySelector('#backup-status');if(el)el.textContent='Copying new files to the second store… this can take a few minutes.';
   try{const r=await fetch('/api/memory-backup',{method:'POST',credentials:'same-origin'}),data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'The second copy could not be updated.');backup=data;status(data.status?.remaining?`Second copy updated. ${data.status.remaining} files are still to copy; run it again to continue.`:'Second copy is up to date.');}
   catch(error){status(error.message);}
   render();return;
  }
  if(b.dataset.history!==undefined){
   const m=items.find(m=>m.id===selected),h=m?.history?.[Number(b.dataset.history)],form=root.querySelector('#edit-memory');if(!h||!form)return;
   form.elements.title.value=h.title;form.elements.date.value=h.date||'';form.elements.description.value=h.description||'';syncMemorySource(h.petId);
   if(Array.isArray(h.position)&&floorPlan){floorPlan.setPosition(h.position);form.elements.placement.value='custom';}
   status('Earlier version brought back into the form. Save changes to keep it.');form.scrollIntoView({block:'start',behavior:'smooth'});return;
  }
  if(b.dataset.action==='restore'){
   const m=items.find(m=>m.id===selected);if(!m)return;lock(true);
   try{await api('?action=restore',{id:m.id,etag:m.etag});libraryFilter='all';status('Memory restored as a private draft. Publish it again to show it in the game.');}catch(error){status(error.message);}
   await refresh();return;
  }
  if(b.dataset.action==='purge'){
   const m=items.find(m=>m.id===selected);if(!m||!await confirmDelete(m,true))return;lock(true);
   try{await api('?action=purge',{id:m.id,etag:m.etag});selected=null;status('Memory deleted for good.');}catch(error){status(error.message);}
   await refresh();return;
  }
  if(b.dataset.action==='delete'){
   const m=items.find(m=>m.id===selected);if(!m||!await confirmDelete(m))return;lock(true);
   try{if(m.cloud)await api('?action=delete',{id:m.id,etag:m.etag});else await removeLocalMemory(m);selected=null;status(m.cloud?'Memory moved to Recently deleted. You can restore it for 30 days.':'Memory removed from this device.');}
   catch(error){status(error.message);}
   await refresh();return;
  }
  if(b.dataset.id){clearFile();selected=b.dataset.id;message='';render();return;}
  if(b.dataset.action==='new'){clearFile();selected='new';message='';render();return;}
  if(b.dataset.action==='logout'){clearFile();lock(true);await api('?action=logout',{});selected=null;await refresh();}
  if(b.dataset.action==='upload-local'){const m=items.find(m=>m.id===selected),form=document.querySelector('#edit-memory'),meta=metadata(form),position=floorPlan.getPosition();lock(true);const files=[];for(const a of memoryMedia(m)){if(pendingReplacements.some(r=>r.id===a.id))files.push(pendingReplacements.find(r=>r.id===a.id).file);else if(a.file)files.push(a.file);else{const r=await fetch(a.src);if(!r.ok)throw Error('Could not read an original file');files.push(await r.blob());}}files.push(...pendingFiles);await cloudUpload(files,meta,position,pendingSoundtrack===undefined?m.soundtrackFile:pendingSoundtrack);clearFile();await refresh();}
 }catch(error){status(error.message);}finally{lock(false);}
});
root.addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;const form=e.target;try{
  // Read fields before disabling controls; disabled controls are omitted by FormData.
  const fields=new FormData(form);
  if(form.id==='add-occasion'){await saveOccasions([...house.occasions,{name:fields.get('name'),month:Number(fields.get('month')),day:Number(fields.get('day')),decoration:fields.get('decoration')}],`${String(fields.get('name')).trim()} added. The balloons come out on that day each year.`);return;}
  if(form.id==='login'){lock(true);await api('?action=login',{password:fields.get('password')});clearFile();status('Signed in.');await refresh();return;}
  const meta=metadata(form),m=items.find(m=>m.id===selected),position=floorPlan.getPosition();lock(true);
  if(form.id==='new-memory'){
   const files=pendingFiles;if(!files.length)throw Error('Choose or drop photos or a video first.');
   if(session.authenticated)await cloudUpload(files,meta,position);
   else{const added=await addLocalMemory(files,{position,description:meta.description},meta.title);await saveLocalMetadata(added.id,{...meta,position});if(pendingSoundtrack!==undefined)await saveLocalSoundtrack(added.id,pendingSoundtrack);releaseMemoryUrls(added);selected=added.id;status('Saved on this device.');}
  }else if(m.cloud){const replacementPaths=pendingReplacements.length?(await uploadPhotos(pendingReplacements.map(r=>r.file),m.id,0,{extras:false})).paths:[],replacePhotos=pendingReplacements.map((r,i)=>({id:r.id,path:replacementPaths[i]}));const added=pendingFiles.length?await uploadPhotos(pendingFiles,m.id,memoryMedia(m).length):{paths:[],extras:{}};const audio=await uploadSoundtrack(pendingSoundtrack,m.id);await api('',{id:m.id,etag:m.etag,...meta,position,addMediaPaths:added.paths,...added.extras,replacePhotos,...audio,published:fields.has('published')});status('Changes saved to the cloud.');}
  else{if(pendingReplacements.length){await replaceLocalPhotos(m,pendingReplacements);m.files=memoryMedia(m).map(a=>pendingReplacements.some(r=>r.id===a.id)?{id:a.id,type:a.type,file:pendingReplacements.find(r=>r.id===a.id).file}:a);}if(pendingFiles.length)await appendLocalPhotos({...m,position},pendingFiles);await saveLocalMetadata(m.id,{...meta,position});if(pendingSoundtrack!==undefined)await saveLocalSoundtrack(m.id,pendingSoundtrack);status('Changes saved on this device.');}
  clearFile();await refresh();
 }catch(error){status(error.message);}finally{lock(false);}
});
refresh().catch(error=>{console.error(error);root.innerHTML=`<header><a href="/">At Home.</a><span>Memory studio</span></header><main class="boot"><p><strong>The memory studio could not start.</strong></p><p class="boot-detail">${esc(error.message)}</p><p>Reload to try again. If it keeps happening, send this message along.</p></main>`;});
