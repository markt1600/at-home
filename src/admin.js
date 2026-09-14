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

const root=document.querySelector('#studio');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let items=[],selected=null,session={},busy=false,message='',floorPlan=null,pendingFiles=[],filePreviews=[],pendingReplacements=[],replacementPreviews=[];
let libraryQuery='',libraryFilter='all',pendingSoundtrack=undefined;
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
 items=await loadMemories({cloud:false});
 try{session=await api('?action=session');}catch{session={};}
 if(session.authenticated)try{items.push(...await api('?admin=1'));}catch(error){status('Could not load your cloud memories. Use Refresh library to try again. '+error.message);}
 if(selected!=='new'&&!items.some(m=>m.id===selected))selected=items[0]?.id||null;
 render();
}
const memoryState=m=>m.deleting?'Deletion incomplete':m.cloud?(m.published?'Published':'Private draft'):'This device';
function libraryContents(){
 const query=libraryQuery.trim().toLocaleLowerCase();
 const matches=items.filter(m=>(!query||[m.title,m.description,m.date].some(s=>String(s||'').toLocaleLowerCase().includes(query)))&&(libraryFilter==='all'||libraryFilter==='published'&&m.cloud&&m.published||libraryFilter==='draft'&&m.cloud&&!m.published||libraryFilter==='device'&&!m.cloud));
 return `<p class="library-count">${matches.length} of ${items.length} saved ${items.length===1?'memory':'memories'}</p>${matches.map(m=>`<button data-id="${esc(m.id)}" class="memory-card ${m.id===selected?'selected':''}" aria-pressed="${m.id===selected}"><span class="memory-thumb" aria-hidden="true">${m.type==='image'&&!m.deleting?`<img src="${esc(m.src)}" alt="" loading="lazy">`:m.type==='video'?'▶':'✧'}</span><span class="memory-card-copy"><strong>${esc(m.title)}</strong><small>${esc(memoryState(m))}${m.date?' · '+esc(formatMemoryDate(m.date)):''}</small><span class="memory-kind">${m.type==='video'?'Video':'Photo'}${memoryMedia(m).length>1?` · ${memoryMedia(m).length} items`:''}</span><small class="memory-storage" title="Combined size of stored photos, videos and any soundtrack">${esc(memoryStorageLabel(m))}${m.soundtrack?' · includes audio':''}</small></span></button>`).join('')||`<p>${items.length?'No memories match. Try another search or filter.':session.authenticated?'Your library is empty. Drop in a photo or video to start.':'Sign in to see your saved cloud memories. Device memories also appear here.'}</p>`}`;
}
function renderLibrary(){const el=root.querySelector('.library');if(el)el.innerHTML=libraryContents();}
function confirmDelete(memory){return new Promise(resolve=>{
 const dialog=document.createElement('dialog');dialog.className='delete-dialog';dialog.setAttribute('aria-labelledby','delete-title');dialog.setAttribute('aria-describedby','delete-description');
 dialog.innerHTML=`<h2 id="delete-title">Delete this memory?</h2><p class="delete-memory-name">${esc(memory.title)}</p><p id="delete-description">${memory.cloud?'This permanently removes its cloud photo or video and story from the library and game.':memory.local?'This removes the saved file and story from this browser. Your original file and any cloud copy are kept.':'This removes this test memory from the library and game on this device. The original source file is kept.'}</p><form method="dialog"><button value="cancel" autofocus>Keep memory</button><button class="danger" value="delete">Delete memory</button></form>`;
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
const dropzone=()=>`<div class="file-dropzone" data-dropzone><span class="drop-symbol" aria-hidden="true">↥</span><strong>Drop photos or a video here</strong><span>or choose a file from your device</span><label class="file-choice">Choose files<input name="file" type="file" multiple accept="${PHOTO_ACCEPT},video/mp4,video/webm,video/quicktime"></label><p class="fine">JPG, PNG, WebP or iPhone HEIC/HEIF · Up to 30 items in one memory · Photos advance every 2 seconds · Photos compressed in your browser to 1 MB or less · Videos up to 250 MB</p><div id="file-selection" role="status"></div></div>`;
const spotPicker=(edit=false)=>`<label>Open this memory from<select name="petId"><option value="">A spot in the house</option>${Object.entries(PET_MEMORY_NAMES).map(([id,name])=>`<option value="${id}">Interacting with ${name}</option>`).join('')}</select></label><p class="fine pet-memory-note" hidden>Find this memory when you interact with the pet. It does not add a floor marker.</p><div class="floor-memory-controls"><label>Start from a familiar spot<select name="placement">${edit?'<option value="keep">Keep current location</option>':''}${locations()}<option value="custom" hidden>Custom spot on floor plan</option></select></label><div id="floor-plan"></div></div>`;
function editorContent(m){
 if(m?.deleting)return `<div class="empty"><h2>${esc(m.title)}</h2><p>This memory is hidden while deletion finishes. Retry to remove the remaining stored files.</p><button type="button" class="danger" data-action="delete">Delete memory</button></div>`;
 if(selected==='new')return `<h2>A new memory</h2><form id="new-memory">${dropzone()}<label>Title<input name="title" maxlength="100" required></label><label>Date <small>Optional</small><input name="date" type="date"></label><label>Description<textarea name="description" rows="3" maxlength="1600"></textarea></label>${soundtrackPicker()}${spotPicker()}<p class="fine">MP4 gives the widest video playback support.</p><button class="primary">${session.authenticated?'Upload as private draft':'Save on this device'}</button><progress id="progress" max="100" value="0" hidden></progress></form>`;
 if(!m)return `<div class="empty" data-dropzone><span>✧</span><h2>Make a moment your own.</h2><p>Select a memory to edit its story, or drop a photo or video here to start.</p><button type="button" data-action="new">Choose a photo or video</button></div>`;
 return `<div class="editor-heading"><h2>Edit memory</h2><button type="button" class="danger-text" data-action="delete">Delete memory</button></div><div class="preview">${memoryMedia(m)[0].type==='video'?`<video controls playsinline preload="metadata" src="${esc(m.src)}"></video>`:`<img src="${esc(m.src)}" alt="${esc(m.title)}">`}</div><div class="album-strip">${memoryMedia(m).map((a,i)=>`<div>${a.type==='video'?'<span>▷</span>':`<img src="${esc(a.src)}" alt="Photo ${i+1}" loading="lazy">`}<small>${i+1}</small></div>`).join('')}</div>${compressionPanel(m)}<div class="append-photos" data-dropzone><strong>Add photos to this memory</strong><p class="fine">Drop more photos here, or select them below. They will be added to the slideshow when you save. iPhone HEIC/HEIF photos are converted automatically. Each new photo is compressed to 1 MB or less before uploading.</p><label>Choose additional photos<input name="append-photos" type="file" multiple accept="${PHOTO_ACCEPT}"></label><div id="file-selection" role="status"></div></div><form id="edit-memory"><label>Title<input name="title" value="${esc(m.title)}" maxlength="100" required></label><label>Date <small>Optional</small><input name="date" type="date" value="${esc(m.date)}"></label><label>Description<textarea name="description" rows="4" maxlength="1600">${esc(m.description)}</textarea></label>${soundtrackPicker(m)}${spotPicker(true)}${m.cloud?`<label class="check"><input type="checkbox" name="published" ${m.published?'checked':''}><span>Show this memory in the game<br><small>Anyone who opens the game can relive it.</small></span></label>`:''}<div class="row"><button class="primary">Save changes</button>${!m.cloud&&session.authenticated?'<button type="button" data-action="upload-local">Copy to cloud as private draft</button>':''}</div><progress id="progress" max="100" value="0" hidden></progress></form>`;
}
function render(){
 root.querySelectorAll('audio,video').forEach(media=>media.pause());
 const m=items.find(m=>m.id===selected);floorPlan=null;
 root.innerHTML=`<header><a href="/">At Home.</a><span>Memory studio</span>${session.authenticated?'<button data-action="logout">Sign out</button>':''}</header><main><section class="intro"><p class="eyebrow">Keep the moments that matter</p><h1>A house full of memories.</h1><p>Drop in a photo or video, tell its story, and pin the place on your floor plan.</p></section><p role="status" id="status">${esc(message)}</p>
 ${!session.authenticated?`<section class="connection"><div><h2>Cloud memories</h2><p>${session.configured?'Sign in to upload and edit memories across devices.':session.storage?'Your private store is connected. Set MEMORY_ADMIN_PASSWORD in the At Home Vercel project to enable the editor.':'Local editing is available now. Open this editor on the Vercel deployment for cloud storage.'}</p></div><form id="login"><label>Editor password<input type="password" name="password" autocomplete="current-password" required></label><button>Sign in</button></form></section>`:'<p class="connection-note">Private storage connected · New uploads start as drafts. Published memories are visible to anyone who can open the game.</p>'}
 <div class="workspace"><aside><button class="primary" data-action="new">+ Add a memory</button><div class="library-heading"><h2>Saved memories</h2><button type="button" data-action="refresh" aria-label="Refresh library">↻</button></div><label class="library-search">Search memories<input type="search" name="library-search" value="${esc(libraryQuery)}" placeholder="Title, story or date"></label><label class="library-filter">Show<select name="library-filter"><option value="all">All memories</option><option value="published">Published</option><option value="draft">Private drafts</option><option value="device">On this device</option></select></label><div class="library">${libraryContents()}</div></aside><section class="editor">${editorContent(m)}</section></div></main>`;
 root.querySelector('[name="library-filter"]').value=libraryFilter;
 const musicHost=document.createElement('section');musicHost.id='music-studio';root.querySelector('main').append(musicHost);mountMusicLibrary(musicHost,{authenticated:session.authenticated});
 const musicLink=document.createElement('a');musicLink.href='#music-studio';musicLink.textContent='Turntable music';root.querySelector('header').append(musicLink);
 const host=document.querySelector('#floor-plan');
 if(host)floorPlan=mountMemoryFloorPlan(host,{position:m?.position||placedMemory(MEMORY_PLACEMENTS[0]).position,memories:items.filter(i=>i.id!==selected&&!i.petId),disabled:()=>busy,onChange:()=>{document.querySelector('select[name="placement"]').value='custom';}});
 syncMemorySource(m?.petId);
}
function syncMemorySource(petId){const field=root.querySelector('[name=petId]');if(!field)return;field.value=petId||'';root.querySelector('.floor-memory-controls').hidden=!!petId;root.querySelector('.pet-memory-note').hidden=!petId;}
function status(text){message=text;const el=document.querySelector('#status');if(el)el.textContent=text;}
function lock(value){busy=value;for(const el of root.querySelectorAll('button,input,textarea,select'))el.disabled=value;}
const metadata=form=>{const data=Object.fromEntries(new FormData(form));return {...cleanMemoryMetadata(data),petId:cleanMemoryPet(data.petId)};};
async function selectFiles(input){
 const m=items.find(m=>m.id===selected),append=!!m;
 let files;lock(true);try{files=await prepareMemoryPhotos(input,{photosOnly:append,existing:append?memoryMedia(m).length:0,onProgress:status});}finally{lock(false);}
 if(!append&&selected!=='new'){clearFile();selected='new';render();}
 for(const url of filePreviews)URL.revokeObjectURL(url);pendingFiles=files;filePreviews=files.map(file=>URL.createObjectURL(file));
 document.querySelector('#file-selection').innerHTML=`<div class="album-strip">${files.map((file,i)=>`<div>${file.type.startsWith('video/')?'<span>▷</span>':`<img src="${esc(filePreviews[i])}" alt="Selected photo ${i+1}">`}<small>${esc(file.name)} · ${formatFileSize(file.size)}</small></div>`).join('')}</div><p>${files.length} ${append?'additional ':''}item${files.length===1?'':'s'} ready to save.</p>`;
 const title=document.querySelector('#new-memory input[name="title"]');if(title&&!title.value)title.value=files[0].name.replace(/\.[^.]+$/,'').slice(0,100);
 status(append?'Photos ready. Save changes to add them to this memory.':'Files ready. Add their story and choose a spot on the floor plan.');
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
  if(e.target.name==='petId')syncMemorySource(e.target.value);
  if(e.target.name==='library-filter'){libraryFilter=e.target.value;renderLibrary();}
  if(e.target.name==='soundtrack'&&e.target.files.length)selectSoundtrack(e.target.files);
  else if(e.target.matches('input[type="file"]')&&e.target.files.length)await selectFiles(e.target.files);
  if(e.target.matches('select[name="placement"]')){const id=e.target.value,m=items.find(m=>m.id===selected);if(id==='keep'&&m)floorPlan.setPosition(m.position);else if(id!=='custom')floorPlan.setPosition(placedMemory(MEMORY_PLACEMENTS.find(p=>p.id===id)).position);}
 }catch(error){status(error.message);}
});
async function uploadPhotos(files,id,existingCount=0){
 files=await prepareMemoryPhotos(files,{existing:existingCount,onProgress:status});const paths=[];
 const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'};
 const progress=document.querySelector('#progress');if(progress)progress.hidden=false;
 for(let i=0;i<files.length;i++){
  const file=files[i],path=`media/${id}/${crypto.randomUUID()}.${extensions[file.type]}`;status(`Uploading item ${i+1} of ${files.length}…`);
  await upload(path,file,{access:'private',handleUploadUrl:'/api/memory-upload',multipart:true,contentType:file.type,onUploadProgress:({percentage})=>{if(progress)progress.value=(i+percentage/100)/files.length*100;}});paths.push(path);
 }
 return paths;
}
async function uploadSoundtrack(file,id){
 if(file===undefined)return {};if(file===null)return {soundtrackPath:null};validateSoundtrack(file);
 const path=`soundtracks/${id}/${crypto.randomUUID()}.${audioExtension(file.name)}`;status('Uploading memory soundtrack…');
 await upload(path,file,{access:'private',handleUploadUrl:'/api/memory-upload',multipart:true,contentType:audioContentType(file.name)});
 return {soundtrackPath:path,soundtrackTitle:file.name.replace(/\.[^.]+$/,'').slice(0,100)};
}
async function cloudUpload(files,meta,position,soundtrack=pendingSoundtrack){
 const id=crypto.randomUUID(),addMediaPaths=await uploadPhotos(files,id);
 const audio=await uploadSoundtrack(soundtrack,id);const saved=await api('',{id,...meta,position,addMediaPaths,...audio,published:false});selected=saved.id;status('Saved to the cloud as a private draft.');
}
root.addEventListener('click',async e=>{
 if(e.target.closest('#music-studio'))return;
 const b=e.target.closest('button');if(!b||busy)return;try{
  if(b.dataset.action==='compress-photos'){await compressExistingPhotos();return;}
  if(b.dataset.action==='remove-soundtrack'){pendingSoundtrack=null;root.querySelector('[name=soundtrack]').value='';root.querySelector('.memory-soundtrack audio')?.pause();root.querySelector('#soundtrack-selection').textContent='No soundtrack — save to apply';return;}
  if(b.dataset.action==='refresh'){clearFile();lock(true);message='';await refresh();return;}
  if(b.dataset.action==='delete'){
   const m=items.find(m=>m.id===selected);if(!m||!await confirmDelete(m))return;lock(true);
   try{if(m.cloud)await api('?action=delete',{id:m.id,etag:m.etag});else await removeLocalMemory(m);selected=null;status(m.cloud?'Memory deleted from cloud storage and the game.':'Memory removed from this device.');}
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
  if(form.id==='login'){lock(true);await api('?action=login',{password:fields.get('password')});clearFile();status('Signed in.');await refresh();return;}
  const meta=metadata(form),m=items.find(m=>m.id===selected),position=floorPlan.getPosition();lock(true);
  if(form.id==='new-memory'){
   const files=pendingFiles;if(!files.length)throw Error('Choose or drop photos or a video first.');
   if(session.authenticated)await cloudUpload(files,meta,position);
   else{const added=await addLocalMemory(files,{position,description:meta.description},meta.title);await saveLocalMetadata(added.id,{...meta,position});if(pendingSoundtrack!==undefined)await saveLocalSoundtrack(added.id,pendingSoundtrack);releaseMemoryUrls(added);selected=added.id;status('Saved on this device.');}
  }else if(m.cloud){const replacementPaths=pendingReplacements.length?await uploadPhotos(pendingReplacements.map(r=>r.file),m.id):[],replacePhotos=pendingReplacements.map((r,i)=>({id:r.id,path:replacementPaths[i]}));const addMediaPaths=pendingFiles.length?await uploadPhotos(pendingFiles,m.id,memoryMedia(m).length):[];const audio=await uploadSoundtrack(pendingSoundtrack,m.id);await api('',{id:m.id,etag:m.etag,...meta,position,addMediaPaths,replacePhotos,...audio,published:fields.has('published')});status('Changes saved to the cloud.');}
  else{if(pendingReplacements.length){await replaceLocalPhotos(m,pendingReplacements);m.files=memoryMedia(m).map(a=>pendingReplacements.some(r=>r.id===a.id)?{id:a.id,type:a.type,file:pendingReplacements.find(r=>r.id===a.id).file}:a);}if(pendingFiles.length)await appendLocalPhotos({...m,position},pendingFiles);await saveLocalMetadata(m.id,{...meta,position});if(pendingSoundtrack!==undefined)await saveLocalSoundtrack(m.id,pendingSoundtrack);status('Changes saved on this device.');}
  clearFile();await refresh();
 }catch(error){status(error.message);}finally{lock(false);}
});
refresh();
