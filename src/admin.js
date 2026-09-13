import './admin.css';
import {upload} from '@vercel/blob/client';
import {loadMemories,saveLocalMetadata,MEMORY_PLACEMENTS,placedMemory,addLocalMemory,removeLocalMemory} from './memories.js';
import {cleanMemoryMetadata,formatMemoryDate} from './memory-metadata.js';
import {mountMemoryFloorPlan} from './memory-placement.js';

const root=document.querySelector('#studio');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let items=[],selected=null,session={},busy=false,message='',floorPlan=null,pendingFile=null,filePreview='';
let libraryQuery='',libraryFilter='all';
function clearFile(){pendingFile=null;if(filePreview)URL.revokeObjectURL(filePreview);filePreview='';}
async function api(path='',body){
 const r=await fetch('/api/memories'+path,{...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),credentials:'same-origin'});
 let data;try{data=await r.json();}catch{throw Error('Cloud storage is available on the Vercel deployment. Local editing still works here.');}
 if(!r.ok)throw Error(data.error||'Unable to connect');return data;
}
async function refresh(){
 for(const m of items)if(m.src?.startsWith('blob:'))URL.revokeObjectURL(m.src);
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
 return `<p class="library-count">${matches.length} of ${items.length} saved ${items.length===1?'memory':'memories'}</p>${matches.map(m=>`<button data-id="${esc(m.id)}" class="memory-card ${m.id===selected?'selected':''}" aria-pressed="${m.id===selected}"><span class="memory-thumb" aria-hidden="true">${m.type==='image'&&!m.deleting?`<img src="${esc(m.src)}" alt="" loading="lazy">`:m.type==='video'?'▶':'✧'}</span><span class="memory-card-copy"><strong>${esc(m.title)}</strong><small>${esc(memoryState(m))}${m.date?' · '+esc(formatMemoryDate(m.date)):''}</small><span class="memory-kind">${m.type==='video'?'Video':'Photo'}</span></span></button>`).join('')||`<p>${items.length?'No memories match. Try another search or filter.':session.authenticated?'Your library is empty. Drop in a photo or video to start.':'Sign in to see your saved cloud memories. Device memories also appear here.'}</p>`}`;
}
function renderLibrary(){const el=root.querySelector('.library');if(el)el.innerHTML=libraryContents();}
function confirmDelete(memory){return new Promise(resolve=>{
 const dialog=document.createElement('dialog');dialog.className='delete-dialog';dialog.setAttribute('aria-labelledby','delete-title');dialog.setAttribute('aria-describedby','delete-description');
 dialog.innerHTML=`<h2 id="delete-title">Delete this memory?</h2><p class="delete-memory-name">${esc(memory.title)}</p><p id="delete-description">${memory.cloud?'This permanently removes its cloud photo or video and story from the library and game.':memory.local?'This removes the saved file and story from this browser. Your original file and any cloud copy are kept.':'This removes this test memory from the library and game on this device. The original source file is kept.'}</p><form method="dialog"><button value="cancel" autofocus>Keep memory</button><button class="danger" value="delete">Delete memory</button></form>`;
 dialog.addEventListener('close',()=>{const confirmed=dialog.returnValue==='delete';dialog.remove();resolve(confirmed);},{once:true});document.body.append(dialog);dialog.showModal();
 });}
const locations=()=>MEMORY_PLACEMENTS.map(p=>`<option value="${p.id}">${esc(p.title)} · ${esc(p.room)}</option>`).join('');
const dropzone=()=>`<div class="file-dropzone" data-dropzone><span class="drop-symbol" aria-hidden="true">↥</span><strong>Drop a photo or video here</strong><span>or choose a file from your device</span><label class="file-choice">Choose file<input name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"></label><p class="fine">One memory at a time · JPG, PNG, WebP, MP4, WebM or MOV · Up to 250 MB</p><div id="file-selection" role="status"></div></div>`;
const spotPicker=(edit=false)=>`<label>Start from a familiar spot<select name="placement">${edit?'<option value="keep">Keep current location</option>':''}${locations()}<option value="custom" hidden>Custom spot on floor plan</option></select></label><div id="floor-plan"></div>`;
function editorContent(m){
 if(m?.deleting)return `<div class="empty"><h2>${esc(m.title)}</h2><p>This memory is hidden while deletion finishes. Retry to remove the remaining stored files.</p><button type="button" class="danger" data-action="delete">Delete memory</button></div>`;
 if(selected==='new')return `<h2>A new memory</h2><form id="new-memory">${dropzone()}<label>Title<input name="title" maxlength="100" required></label><label>Date <small>Optional</small><input name="date" type="date"></label><label>Description<textarea name="description" rows="3" maxlength="1600"></textarea></label>${spotPicker()}<p class="fine">MP4 gives the widest video playback support.</p><button class="primary">${session.authenticated?'Upload as private draft':'Save on this device'}</button><progress id="progress" max="100" value="0" hidden></progress></form>`;
 if(!m)return `<div class="empty" data-dropzone><span>✧</span><h2>Make a moment your own.</h2><p>Select a memory to edit its story, or drop a photo or video here to start.</p><button type="button" data-action="new">Choose a photo or video</button></div>`;
 return `<div class="editor-heading"><h2>Edit memory</h2><button type="button" class="danger-text" data-action="delete">Delete memory</button></div><div class="preview">${m.type==='video'?`<video controls playsinline preload="metadata" src="${esc(m.src)}"></video>`:`<img src="${esc(m.src)}" alt="${esc(m.title)}">`}</div><form id="edit-memory"><label>Title<input name="title" value="${esc(m.title)}" maxlength="100" required></label><label>Date <small>Optional</small><input name="date" type="date" value="${esc(m.date)}"></label><label>Description<textarea name="description" rows="4" maxlength="1600">${esc(m.description)}</textarea></label>${spotPicker(true)}${m.cloud?`<label class="check"><input type="checkbox" name="published" ${m.published?'checked':''}><span>Show this memory in the game<br><small>Anyone who opens the game can relive it.</small></span></label>`:''}<div class="row"><button class="primary">Save changes</button>${!m.cloud&&session.authenticated?'<button type="button" data-action="upload-local">Copy to cloud as private draft</button>':''}</div><progress id="progress" max="100" value="0" hidden></progress></form>`;
}
function render(){
 const m=items.find(m=>m.id===selected);floorPlan=null;
 root.innerHTML=`<header><a href="/">At Home.</a><span>Memory studio</span>${session.authenticated?'<button data-action="logout">Sign out</button>':''}</header><main><section class="intro"><p class="eyebrow">Keep the moments that matter</p><h1>A house full of memories.</h1><p>Drop in a photo or video, tell its story, and pin the place on your floor plan.</p></section><p role="status" id="status">${esc(message)}</p>
 ${!session.authenticated?`<section class="connection"><div><h2>Cloud memories</h2><p>${session.configured?'Sign in to upload and edit memories across devices.':session.storage?'Your private store is connected. Set MEMORY_ADMIN_PASSWORD in the At Home Vercel project to enable the editor.':'Local editing is available now. Open this editor on the Vercel deployment for cloud storage.'}</p></div><form id="login"><label>Editor password<input type="password" name="password" autocomplete="current-password" required></label><button>Sign in</button></form></section>`:'<p class="connection-note">Private storage connected · New uploads start as drafts. Published memories are visible to anyone who can open the game.</p>'}
 <div class="workspace"><aside><button class="primary" data-action="new">+ Add a memory</button><div class="library-heading"><h2>Saved memories</h2><button type="button" data-action="refresh" aria-label="Refresh library">↻</button></div><label class="library-search">Search memories<input type="search" name="library-search" value="${esc(libraryQuery)}" placeholder="Title, story or date"></label><label class="library-filter">Show<select name="library-filter"><option value="all">All memories</option><option value="published">Published</option><option value="draft">Private drafts</option><option value="device">On this device</option></select></label><div class="library">${libraryContents()}</div></aside><section class="editor">${editorContent(m)}</section></div></main>`;
 root.querySelector('[name="library-filter"]').value=libraryFilter;
 const host=document.querySelector('#floor-plan');
 if(host)floorPlan=mountMemoryFloorPlan(host,{position:m?.position||placedMemory(MEMORY_PLACEMENTS[0]).position,memories:items.filter(i=>i.id!==selected),disabled:()=>busy,onChange:()=>{document.querySelector('select[name="placement"]').value='custom';}});
}
function status(text){message=text;const el=document.querySelector('#status');if(el)el.textContent=text;}
function lock(value){busy=value;for(const el of root.querySelectorAll('button,input,textarea,select'))el.disabled=value;}
const metadata=form=>cleanMemoryMetadata(Object.fromEntries(new FormData(form)));
function selectFile(file){
 if(!file||!file.size)throw Error('Choose a photo or video first.');
 if(!/^(image\/(jpeg|png|webp)|video\/(mp4|webm|quicktime))$/.test(file.type)||file.size>250*1024*1024)throw Error('Choose a JPG, PNG, WebP, MP4, WebM or MOV file smaller than 250 MB.');
 if(selected!=='new'){clearFile();selected='new';render();}
 clearFile();pendingFile=file;filePreview=URL.createObjectURL(file);
 const target=document.querySelector('#file-selection');target.innerHTML=`<div class="upload-preview">${file.type.startsWith('video/')?`<video src="${esc(filePreview)}" controls playsinline preload="metadata"></video>`:`<img src="${esc(filePreview)}" alt="Selected memory preview">`}</div><strong>${esc(file.name)}</strong><small>${(file.size/1024/1024).toFixed(1)} MB · Ready to ${session.authenticated?'upload':'save'}</small>`;
 const title=document.querySelector('#new-memory input[name="title"]');if(!title.value)title.value=file.name.replace(/\.[^.]+$/,'').slice(0,100);
 status('File ready. Add its story and choose a spot on the floor plan.');
}
root.addEventListener('dragover',e=>{const zone=e.target.closest('[data-dropzone]');if(!zone)return;e.preventDefault();if(!busy){e.dataTransfer.dropEffect='copy';zone.classList.add('drag-over');}});
root.addEventListener('dragleave',e=>{const zone=e.target.closest('[data-dropzone]');if(zone&&!zone.contains(e.relatedTarget))zone.classList.remove('drag-over');});
root.addEventListener('drop',e=>{const zone=e.target.closest('[data-dropzone]');if(!zone)return;e.preventDefault();zone.classList.remove('drag-over');if(busy)return;try{const files=[...e.dataTransfer.files];if(files.length!==1)throw Error('Drop one photo or video at a time, so each memory can have its own story and spot.');selectFile(files[0]);}catch(error){status(error.message);}});
// Prevent accidental navigation away from an unsaved form when a file misses the zone.
window.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('Files'))e.preventDefault();});
window.addEventListener('drop',e=>{if([...e.dataTransfer.types].includes('Files'))e.preventDefault();});
root.addEventListener('input',e=>{if(!busy&&e.target.name==='library-search'){libraryQuery=e.target.value;renderLibrary();}});
root.addEventListener('change',e=>{
 if(busy)return;try{
  if(e.target.name==='library-filter'){libraryFilter=e.target.value;renderLibrary();}
  if(e.target.matches('input[type="file"]')&&e.target.files.length)selectFile(e.target.files[0]);
  if(e.target.matches('select[name="placement"]')){const id=e.target.value,m=items.find(m=>m.id===selected);if(id==='keep'&&m)floorPlan.setPosition(m.position);else if(id!=='custom')floorPlan.setPosition(placedMemory(MEMORY_PLACEMENTS.find(p=>p.id===id)).position);}
 }catch(error){status(error.message);}
});
async function cloudUpload(file,meta,position){
 const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'},ext=extensions[file.type];
 if(!ext||file.size>250*1024*1024)throw Error('Choose a supported photo or video smaller than 250 MB.');
 const id=crypto.randomUUID(),mediaPath=`media/${id}/${file.type.startsWith('video/')?'video':'image'}.${ext}`;
 status('Uploading securely…');const progress=document.querySelector('#progress');if(progress)progress.hidden=false;
 await upload(mediaPath,file,{access:'private',handleUploadUrl:'/api/memory-upload',multipart:true,contentType:file.type,onUploadProgress:({percentage})=>{if(progress)progress.value=percentage;}});
 const saved=await api('',{id,...meta,position,mediaPath,published:false});selected=saved.id;status('Saved to the cloud as a private draft.');
}
root.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b||busy)return;try{
  if(b.dataset.action==='refresh'){lock(true);message='';await refresh();return;}
  if(b.dataset.action==='delete'){
   const m=items.find(m=>m.id===selected);if(!m||!await confirmDelete(m))return;lock(true);
   try{if(m.cloud)await api('?action=delete',{id:m.id,etag:m.etag});else await removeLocalMemory(m);selected=null;status(m.cloud?'Memory deleted from cloud storage and the game.':'Memory removed from this device.');}
   catch(error){status(error.message);}
   await refresh();return;
  }
  if(b.dataset.id){clearFile();selected=b.dataset.id;message='';render();return;}
  if(b.dataset.action==='new'){clearFile();selected='new';message='';render();return;}
  if(b.dataset.action==='logout'){clearFile();lock(true);await api('?action=logout',{});selected=null;await refresh();}
  if(b.dataset.action==='upload-local'){const m=items.find(m=>m.id===selected),form=document.querySelector('#edit-memory'),meta=metadata(form),position=floorPlan.getPosition();lock(true);const r=await fetch(m.src);if(!r.ok)throw Error('Could not read the original file');await cloudUpload(m.file||await r.blob(),meta,position);await refresh();}
 }catch(error){status(error.message);}finally{lock(false);}
});
root.addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;const form=e.target;try{
  // Read fields before disabling controls; disabled controls are omitted by FormData.
  const fields=new FormData(form);
  if(form.id==='login'){lock(true);await api('?action=login',{password:fields.get('password')});clearFile();status('Signed in.');await refresh();return;}
  const meta=metadata(form),m=items.find(m=>m.id===selected),position=floorPlan.getPosition();lock(true);
  if(form.id==='new-memory'){
   const file=pendingFile;if(!file)throw Error('Choose or drop a photo or video first.');
   if(session.authenticated)await cloudUpload(file,meta,position);
   else{const added=await addLocalMemory(file,{position,description:meta.description},meta.title);await saveLocalMetadata(added.id,{...meta,position});URL.revokeObjectURL(added.src);selected=added.id;status('Saved on this device.');}
  }else if(m.cloud){await api('',{...m,...meta,position,published:fields.has('published')});status('Changes saved to the cloud.');}
  else{await saveLocalMetadata(m.id,{...meta,position});status('Changes saved on this device.');}
  clearFile();await refresh();
 }catch(error){status(error.message);}finally{lock(false);}
});
refresh();
