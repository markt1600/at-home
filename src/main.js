import {installTouchStick} from './touch-controls.js';
import {selectMemory,lookedAtMemory} from './memory-selection.js';
import './style.css';
import {House} from './scene.js';
import {PANEL_SHORTCUTS,isTyping,prepareDialog,navigateDialog} from './keyboard.js';
import {formatMemoryDate} from './memory-metadata.js';
import {memoryMedia,memoryAppearance,releaseMemoryUrls} from './memory-media.js';
import {RecordPlayer} from './record-player.js';
import {mountMemoryPlayer} from './memory-player.js';
import {cleanMemoryFilter,filterMemories} from './memory-filter.js';
import {loadMemories,addLocalMemory,removeLocalMemory,MEMORY_PLACEMENTS,placedMemory} from './memories.js';
import {floorHeight,planPoint} from './house-layout.js';
import {HomeSound} from './audio.js';
import {RenderedVoice} from './rendered-voice.js';
import {Intercom} from './voice.js';
import {SAVE_KEY,PETS,ACTIVITIES,newLife,restoreLife,clockLabel,dayNumber,dayPhase,advanceLife,careForPet,restUntil,remember,contextForVoice} from './life.js';

const $=s=>document.querySelector(s),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const touchQuery=matchMedia('(pointer:coarse)');
const touchMode=()=>touchQuery.matches||(navigator.maxTouchPoints>0&&innerWidth<1024);
const updateInputMode=()=>document.documentElement.classList.toggle('touch-device',touchMode());
touchQuery.addEventListener('change',updateInputMode);window.addEventListener('resize',updateInputMode);updateInputMode();
let disposeTouchControls=()=>{};
const app=$('#app'),sound=new HomeSound(),speech=new RenderedVoice(sound);
let state;try{state=restoreLife(localStorage.getItem(SAVE_KEY));}catch{}let hasSavedGame=!!state;state??=newLife();
let playing=false,panel=null,selectedPet='miso',voiceStatus='Disconnected',transcript=[],timer=0,savedAt=0,lastContext=0,lastSpoken=0,toastTimer;
const recordPlayer=new RecordPlayer(sound,{onChange:spinning=>{world.recordPlaying=spinning;updateLookHint(world.lookTarget);},onMessage:toast});
let memories=[],selectedMemory=null,memoryVolume=null,memoryMutedMic=false,memoryPlayer=null;
const activeMemories=()=>filterMemories(memories,state.memoryFilter);
const syncMemories=()=>world.setMemories(activeMemories());
const companion=new Intercom(status=>{voiceStatus=status;const el=$('#voice-status');if(el)el.textContent=status;},(who,text)=>{transcript.push({who,text});transcript=transcript.slice(-12);updateTranscript();});
const world=new House($('#scene'),id=>{updateLookHint(id);},tick);
world.onUnlock=()=>openPanel('settings');
world.onStep=()=>sound.step();world.hours=state.hours;world.syncPets(state);
async function refreshMemories(){const items=await loadMemories();for(const m of memories)releaseMemoryUrls(m);memories=items;syncMemories();}
refreshMemories();
window.addEventListener('focus',()=>{if(panel!=='memory')refreshMemories();});
sound.onVoiceUnavailable=()=>{const el=$('#audio-note');if(el)el.textContent='Spoken audio is unavailable. All conversations remain available as text.';};
world.onAssetError=()=>toast('Some character artwork could not load. Please refresh to try again.');
world.onArtworkStatus=updateArtworkStatus;
world.onTelescopeChange=active=>{
 document.body.classList.toggle('using-telescope',active);$('#telescope-view')?.remove();
 if(active){const view=document.createElement('section');view.id='telescope-view';view.className='telescope-view';view.setAttribute('aria-label','Telescope view');view.innerHTML='<div class="telescope-reticle" aria-hidden="true">+</div><div class="telescope-caption"><p id="telescope-period"></p><small>Mouse to pan between views · Scroll to zoom · Esc or E to step away</small></div><button class="telescope-exit">Leave telescope · Esc</button>';app.append(view);view.querySelector('.telescope-exit').onclick=leaveTelescope;if(touchMode()){view.querySelector('small').textContent='Drag to look around · Use + and − to zoom';view.querySelector('.telescope-exit').textContent='Leave telescope';const zoom=document.createElement('div');zoom.className='telescope-zoom';zoom.innerHTML='<button aria-label="Zoom out">−</button><button aria-label="Zoom in">+</button>';zoom.children[0].onclick=()=>world.telescope.zoom(1);zoom.children[1].onclick=()=>world.telescope.zoom(-1);view.append(zoom);}world.onTelescopePeriod(world.telescope.night);}
};
world.onTelescopePeriod=night=>{const el=$('#telescope-period');if(el)el.textContent=night?'A little closer to the stars':'Little moments in the neighborhood';};
function leaveTelescope(){world.telescope.leave();world.resumeWandering();}
function updateArtworkStatus(){
 const status=world.artwork.status,button=$('#continue-game')||$('#welcome-form button[type="submit"]');if(!button)return;
 button.disabled=!status.ready;
 let note=$('#house-loading');if(!note){note=document.createElement('p');note.id='house-loading';note.className='fine';note.setAttribute('role','status');button.after(note);}
 note.replaceChildren();const label=document.createElement('span');label.textContent=status.ready?'The house is ready.':status.loading?`Opening the house and its artwork… ${Math.round(status.loaded/status.total*100)}%`:'Some artwork could not load. Check your connection and try again. ';note.append(label);
 const progress=document.createElement('progress');progress.max=status.total;progress.value=status.loaded;progress.setAttribute('aria-label','House textures loaded');note.append(progress);if(status.ready)return;
 if(!status.loading){const retry=document.createElement('button');retry.type='button';retry.textContent='Retry loading';retry.onclick=()=>world.loadArtwork();note.append(retry);}
}
const roomNames={living:'Living room',living_landing:'Living room',living_south:'Living room',hall:'Entrance',passage:'Hallway',dining:'Dining room',balcony:'Living balcony',dining_bay:'Dining balcony',kitchen:'Kitchen',bedroom:'Main bedroom',guest:'Second bedroom',study:'Home office',wine:'Wine cellar',theatre:'Window lounge',bath:'Main bathroom',powder:'Guest bathroom',vanity:'Vanity',wardrobe:'Wardrobe',meditation:'Meditation alcove',utility:'Utility yard'};
function updateLookHint(id){const el=$('#look-hint');if(el)el.textContent=(id==='telescope'?'E · Look through the telescope':id==='turntable'?`E · ${recordPlayer.enabled?'Stop the record':'Play the record'}`:id?`E · ${PETS.find(p=>p.id===id)?.name}`:'').replace(/^E · /,touchMode()?'Tap Interact · ':'E · ');}
async function toggleRecord(){try{await recordPlayer.toggle();}catch{toast('Music could not start. Try the turntable again.');}}
function save(){if(!playing&&!hasSavedGame)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));hasSavedGame=true;}catch{}}
function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),6500);}
function renderMenu(fresh=!hasSavedGame){
 if(!fresh&&hasSavedGame){
  app.innerHTML=`<main class="welcome"><div class="welcome-copy"><p class="eyebrow">A place to take your time</p><h1>At Home<span>.</span></h1><p class="intro">Welcome back, ${escape(state.name)}.</p><p class="quiet">Your little household is waiting for you.</p></div><section class="welcome-card"><p class="eyebrow">Make yourself comfortable</p><h2>Pick up your day.</h2><p class="panel-intro">Day ${dayNumber(state.hours)} · ${clockLabel(state.hours)}</p><div class="stack"><button class="primary" id="continue-game">Continue game <span>↗</span></button><button id="new-game">Start a new game</button></div><p class="fine">A new game starts a fresh day, journal and pet routine. Your saved memories and music stay in the house.</p></section></main>`;
  $('#continue-game').onclick=()=>enter();$('#new-game').onclick=()=>renderMenu(true);updateArtworkStatus();return;
 }
 app.innerHTML=`<main class="welcome"><div class="welcome-copy"><p class="eyebrow">A place to take your time</p><h1>At Home<span>.</span></h1><p class="intro">Watch the light change. Make a cup of tea.<br>Look after a few little friends.</p><p class="quiet">No score. No rush. Just a day that belongs to you.</p></div><form id="welcome-form" class="welcome-card"><p class="eyebrow">Make yourself comfortable</p><h2>Enter your name<br>or nickname</h2><label class="sr-only" for="name">Name or nickname</label><input id="name" name="name" maxlength="28" autocomplete="given-name" placeholder="What shall we call you?" value="${state.name==='Friend'?'':escape(state.name)}"><label class="check"><input id="personalized" type="checkbox" ${state.personalized?'checked':''}><span>Include my name in spoken greetings</span></label><p class="fine">Optional. Your nickname is used to generate these greetings. Your microphone stays off until you connect Voice.</p><button class="primary" type="submit">${state.journal.length?'Welcome back':'Come on in'} <span>↗</span></button><p class="fine">Your day is saved on this device. Pets rest while you are away.</p></form><div class="menu-footer">An unhurried life, one small moment at a time.</div></main>`;
 if(hasSavedGame){const back=document.createElement('button');back.type='button';back.className='dream-return';back.textContent='Back to saved game';back.onclick=()=>renderMenu(false);$('#welcome-form').append(back);}
 $('#welcome-form button[type="submit"]').innerHTML=`${hasSavedGame?'Start a new game':'Come on in'} <span>↗</span>`;
 $('#welcome-form').addEventListener('submit',async e=>{e.preventDefault();if(!world.artwork.ready)return;const personalized=$('#personalized').checked;recordPlayer.stop();state=newLife($('#name').value);state.personalized=personalized;world.focus('living');world.hours=state.hours;syncMemories();await enter(true);});updateArtworkStatus();
}
async function enter(fresh=false){
 if(!world.artwork.ready)return;
 playing=true;world.mode='play';world.paused=false;world.hours=state.hours;world.syncPets(state);save();renderHUD();world.resumeWandering();
 if(fresh)world.greetPlayer();
 try{await sound.start();sound.setVolume(.65);recordPlayer.setVolume(.65);}catch{toast('Sound could not start. You can try the Sound button.');}
 if(state.personalized){lastSpoken=timer;speech.play({kind:'home',cue:0,name:state.name});}
 toast(touchMode()?'Welcome home. Use the left thumb pad to walk, and drag the view to look around.':'Welcome home. WASD to wander · Mouse to look · E to interact · Space to jump · H for keys');
 setTimeout(()=>$('#controls')?.classList.add('quiet-controls'),14000);
}
function renderHUD(){disposeTouchControls();app.innerHTML=`<header class="hud-top"><div class="brand">At Home<span>.</span><small id="phase"></small></div><div class="clock"><span id="clock"></span><small id="place"></small></div><div class="top-actions"><button data-action="sound" id="sound-button" aria-label="Toggle sound">Sound on</button><button data-panel="voice">Voice</button><button data-panel="settings" aria-label="Pause and settings">Pause</button></div></header><div class="look-hint" id="look-hint"></div><div class="memory-proximity" id="memory-proximity"></div><p class="controls" id="controls">WASD · Mouse to look · E to interact · Space to jump · H for keys</p><div class="touch-walk"><div id="touch-stick" class="touch-stick" role="group" aria-label="Drag to walk"><span class="touch-knob"></span><small>Walk</small></div></div><div class="touch-actions"><button data-action="interact" id="touch-interact">Interact</button><button data-action="jump" aria-label="Jump">Jump ↑</button></div><dialog id="panel" class="panel"><button id="close-panel" class="close" aria-label="Close panel">×</button><div id="panel-content"></div></dialog>`;
 $('#close-panel').onclick=closePanel;$('#panel').addEventListener('cancel',e=>{e.preventDefault();closePanel(false);});
 disposeTouchControls=installTouchStick($('#touch-stick'),world);if(touchMode())$('#controls').textContent='Left thumb to walk · Drag the view to look · Interact to select';
 updateHUD();
}
function updateHUD(){if(!playing)return;$('#clock').textContent=`Day ${dayNumber(state.hours)} · ${clockLabel(state.hours)}`;$('#phase').textContent=dayPhase(state.hours);$('#place').textContent=roomNames[world.room]||'At home';
}
function openPanel(type){
 if(!playing)return;document.body.classList.add('panel-open');if(world.telescope.active)world.telescope.leave();if(panel==='memory')releaseMemory();world.paused=true;world.unlock();world.previewAnimation=type==='pets';panel=type;
 const dialog=$('#panel');dialog.classList.toggle('wide',type==='rooms');dialog.classList.toggle('memory-panel',type==='memory');$('#panel-content').innerHTML=panelHTML(type);if(!dialog.open)dialog.showModal();
 if(type==='voice')updateTranscript();prepareDialog(dialog,type);
 if(type==='memory'){
  speech.stop();recordPlayer.suspend();memoryVolume=sound.volume;sound.setVolume(0);
  if(companion.session&&!companion.muted){companion.mute();memoryMutedMic=true;}companion.setVolume(0);
  const m=memories.find(m=>m.id===selectedMemory);if(m)memoryPlayer=mountMemoryPlayer($('#panel-content'),m,{volume:memoryVolume,onError:message=>{const el=$('#memory-error');if(el)el.textContent=message;}});
 }
}
function releaseMemory(){memoryPlayer?.dispose();memoryPlayer=null;if(memoryVolume!==null){sound.setVolume(memoryVolume);companion.setVolume(memoryVolume);memoryVolume=null;}if(memoryMutedMic&&companion.session&&companion.muted)companion.mute();memoryMutedMic=false;recordPlayer.resume();}
function closePanel(resume=true){if(!panel)return;const wasMemory=panel==='memory';if(wasMemory)releaseMemory();$('#panel').close();document.body.classList.remove('panel-open');panel=null;world.paused=false;world.previewAnimation=false;speech.stop();save();if(resume||wasMemory)world.resumeWandering();}
const heading=(eyebrow,title,text='')=>`<p class="eyebrow">${eyebrow}</p><h2>${title}</h2>${text?`<p class="panel-intro">${text}</p>`:''}`;
function panelHTML(type){
 if(type==='memories')return heading('The house remembers the good things','Memories','Find a little memory marker as you walk, or return to a moment here.')+`<p class="memory-legend"><span style="color:#4d97c5">▧ Photo memories</span><span style="color:#c58a35">▷ Video memories</span></p><p class="fine">${state.memoryFilter.from||state.memoryFilter.to?`Showing memories ${state.memoryFilter.from?'from '+escape(formatMemoryDate(state.memoryFilter.from)):''} ${state.memoryFilter.to?'through '+escape(formatMemoryDate(state.memoryFilter.to)):''}. Change this in Pause.`:'Showing memories from every date.'}</p><div class="memory-list">${activeMemories().map(m=>`<article><button data-memory="${escape(m.id)}"><span class="memory-symbol" style="color:${memoryAppearance(m).css}">${memoryAppearance(m).symbol}</span><span><strong>${escape(m.title)}</strong><small>${escape(m.description)}</small></span></button><button class="memory-go" data-memory-go="${escape(m.id)}">Go to this spot ↗</button>${m.local?`<button class="memory-go" data-memory-delete="${escape(m.id)}">Remove from this device</button>`:''}</article>`).join('')||'<p class="panel-intro">No memories in this time period. Change the date filter in Pause, or add a moment below.</p>'}</div><details class="add-memory"><summary>Add a memory from this device</summary><label class="field">A title<input id="memory-title" maxlength="80" placeholder="A moment worth keeping"></label><label class="field">Place the memory<select id="memory-placement"><option value="here">Where I am standing now</option>${MEMORY_PLACEMENTS.map(m=>`<option value="${m.id}">${escape(m.title)} · ${escape(m.room)}</option>`).join('')}</select></label><label class="file-picker">Choose photos or a video<input id="memory-file" type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"></label><p class="fine">Added files stay in this browser on this device. Keep your originals. Use the memory editor for cloud uploads.</p></details>`;
 if(type==='memory'){const m=memories.find(m=>m.id===selectedMemory);if(!m)return '';const count=memoryMedia(m).length;return `<div class="dream"><div class="memory-media"></div><div class="dream-caption"><p class="eyebrow">${m.date?escape(formatMemoryDate(m.date)):'A moment to come back to'}</p><h2>${escape(m.title)}</h2><p class="memory-caption">${escape(m.description)}</p>${count===1&&(m.soundtrack||m.type==='video')?'<div class="slideshow-controls"><button data-slide="pause">Pause memory</button></div>':''}${count>1?'<div class="slideshow-controls"><button data-slide="previous" aria-label="Previous photo">←</button><span class="slide-counter" aria-live="off"></span><button data-slide="pause">Pause slideshow</button><button data-slide="next" aria-label="Next photo">→</button></div>':''}${memoryMedia(m).some(a=>a.type==='video')?'<div class="slideshow-controls"><button data-video="retry">Retry video</button><button data-video="download">Load video first</button></div>':''}<p class="fine" id="memory-error">${touchMode()?'Use the playback buttons below.':`${count>1?'Photos every 2 seconds · ← → to browse · ':''}${count>1||m.type==='video'||m.soundtrack?'Space to pause · ':''}Esc to return`}</p><button data-action="resume" class="dream-return">Return to the house ↗</button></div></div>`;}
 if(type==='rooms')return heading('Find a quiet corner','Make yourself at home','Choose a place, then take a walk from there.')+`<div class="room-grid">${[['living','Living room','Light & company'],['balcony','Living balcony','A little fresh air'],['dining','Dining room','Room at the table'],['kitchen','Kitchen','Something warm'],['bedroom','Main bedroom','A place to rest'],['guest','Second bedroom','Books & music'],['theatre','Window lounge','A wider view'],['study','Home office','Ideas & little projects'],['wine','Wine cellar','For an evening together'],['door','Front door','The entrance']].map(([id,title,sub])=>`<button class="room" data-room="${id}"><strong>${title}</strong><small>${sub}</small><span>↗</span></button>`).join('')}</div>`;
 if(type==='pets'){const p=PETS.find(p=>p.id===selectedPet),needs=state.pets[p.id];return heading('Our little household',`${p.name} <span class="subheading">the ${p.kind.toLowerCase()}</span>`,'A little food, fresh water and time together.')+`<div class="tabs">${PETS.map(p=>`<button data-pet="${p.id}" aria-pressed="${selectedPet===p.id}">${p.name}</button>`).join('')}</div><div class="needs">${[['food','Food'],['water','Water'],['affection','Company']].map(([id,label])=>`<div><label for="need-${id}">${label}<span>${needs[id]>70?'Content':needs[id]>40?'A little care soon':'Ready for some care'}</span></label><meter id="need-${id}" min="0" max="100" value="${needs[id]}"></meter></div>`).join('')}</div><div class="stack"><button data-care="food">${p.id==='pebble'?'Offer leafy greens':'Fill the food bowl'} <span>♡</span></button><button data-care="water">Refresh the water <span>♡</span></button><button data-care="affection">${p.id==='pebble'?'Sit quietly with Pebble':'Spend time together'} <span>♡</span></button><button data-action="view-pet" class="primary">Spend a moment with ${p.name} <span>↗</span></button></div><p class="fine">Needs pause while you browse or leave the game. No pet can become ill or die. This is a gentle, fictional care routine.</p>`;}
 if(type==='rituals')return heading('The good in ordinary things','A little ritual','There is no checklist to finish. Pick whatever feels good.')+`<div class="stack">${Object.entries(ACTIVITIES).map(([id,a])=>`<button data-ritual="${id}">${id==='record'&&recordPlayer.enabled?'Let the record rest':a.title}<span>↗</span></button>`).join('')}</div>`;
 if(type==='journal')return heading('Things worth remembering','Small moments')+`<div class="journal">${state.journal.length?[...state.journal].reverse().map(j=>`<article><small>Day ${dayNumber(j.hours)} · ${clockLabel(j.hours)}</small><p>${escape(j.text)}</p></article>`).join(''):'<p>Your journal is waiting for its first small moment. Make some tea, put on a record, or spend time with a pet.</p>'}</div>`;
 if(type==='voice')return heading('A little company','Your home companion','Talk about your day, your pets or whatever is on your mind.')+`<p class="status" id="voice-status">${escape(voiceStatus)}</p><div class="stack"><button class="primary" data-action="connect">${companion.session?'Reconnect':'Connect microphone'} <span>↗</span></button><div class="inline-buttons"><button data-action="mute">${companion.muted?'Unmute microphone':'Mute microphone'}</button><button data-action="disconnect">Disconnect</button></div></div><p class="fine">Connecting shares microphone audio with the voice service. Your nickname and current game context help keep the conversation relevant. Disconnect at any time.</p><div class="transcript" id="transcript" aria-live="polite"></div><p class="fine" id="audio-note"></p>`;
 if(type==='help'&&touchMode())return heading('Make yourself at home','Touch controls','Use the left thumb pad to walk. Drag the view to look around. Aim at something nearby and tap Interact. Tap Jump to climb onto furniture.')+'<div class="stack"><button data-panel="rooms">Go to a room</button><button data-panel="memories">Memories</button><button data-panel="pets">Our pets</button><button data-panel="rituals">Little rituals</button><button data-panel="journal">Journal</button><button data-action="resume">Back to my day ↗</button></div>';
 if(type==='help')return heading('Leave the menus behind','A few simple keys')+'<dl class="key-guide"><dt>W A S D</dt><dd>Walk around the house</dd><dt>Mouse</dt><dd>Look around · click the house to resume mouse-look</dd><dt>E</dt><dd>Care for a pet, play the turntable or relive a memory</dd><dt>1–9</dt><dd>Choose a numbered popup option</dd><dt>↑ ↓ / Tab</dt><dd>Move between choices · Enter to select</dd><dt>Space</dt><dd>Jump onto furniture · pause a memory or slideshow</dd><dt>Esc</dt><dd>Close a popup or pause your walk</dd><dt>M · P · R</dt><dd>Memories · Pets · Little rituals</dd><dt>J · V</dt><dd>Journal · Voice</dd><dt>O · H</dt><dd>Room shortcuts · This guide</dd></dl><div class="stack"><button data-action="resume">Back to my day ↗</button><button data-action="admin">Edit memories ↗</button></div>';
 if(type==='settings')return heading('Take your time','A moment to pause','The house and your pets will wait for you.')+memoryFilterHTML()+`<label class="field">The pace of the day<select id="pace">${[[0,'Hold this time of day'],[.5,'Slow · 40 minutes per day'],[1,'Easy · 20 minutes per day'],[2,'Quick · 10 minutes per day']].map(([v,t])=>`<option value="${v}" ${state.pace===v?'selected':''}>${t}</option>`).join('')}</select></label><label class="check"><input type="checkbox" id="motion" ${world.motion?'checked':''}><span>Character animations & gentle walking motion</span></label><label class="check"><input type="checkbox" id="personalized-setting" ${state.personalized?'checked':''}><span>Include my name in spoken greetings</span></label><div class="inline-buttons"><button data-rest="6">Rest until sunrise</button><button data-rest="18">Skip to sunset</button></div><div class="stack"><button class="primary" data-action="resume">Back to my day <span>↗</span></button><button data-panel="help">Controls & places</button><button data-action="admin">Edit memories</button><button data-action="leave">Save & leave</button></div><p class="fine">Your progress is saved automatically on this device. There is no win or lose state. Care, explore and enjoy the passing day.</p>`;
 return '';
}
function updateTranscript(){const el=$('#transcript');if(el){el.innerHTML=transcript.map(m=>`<p><strong>${escape(m.who)}</strong>${escape(m.text)}</p>`).join('');el.scrollTop=el.scrollHeight;}}
app.addEventListener('change',e=>{if(e.target.id==='pace')state.pace=Number(e.target.value);if(e.target.id==='motion')world.motion=e.target.checked;if(e.target.id==='personalized-setting'){state.personalized=e.target.checked;if(!state.personalized)speech.stop();}save();});
app.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;const d=b.dataset;
 if(d.memory){if(b.closest('#memory-proximity')&&currentMemorySelection().memory?.id!==d.memory)return;selectedMemory=d.memory;openPanel('memory');return;}
 if(d.memoryGo){const m=memories.find(m=>m.id===d.memoryGo);world.focus(m.view||'living');world.camera.position.set(m.position[0],m.position[1]+1.67,m.position[2]);world.feet={x:m.position[0],y:m.position[1],z:m.position[2],vy:0,grounded:true};closePanel();return;}
 if(d.memoryDelete){const m=memories.find(m=>m.id===d.memoryDelete);await removeLocalMemory(m);memories=memories.filter(x=>x!==m);syncMemories();openPanel('memories');return;}
 if(d.panel){if(d.panel==='pets')world.lookAtPet(selectedPet);openPanel(d.panel);return;}
 if(d.room){world.focus(d.room);closePanel();return;}
 if(d.pet){selectedPet=d.pet;world.lookAtPet(d.pet);openPanel('pets');return;}
 if(d.care){const message=careForPet(state,selectedPet,d.care);world.showCare(selectedPet,d.care);sound.care();toast(message);openPanel('pets');save();companion.update(contextForVoice(state,world.room));return;}
 if(d.ritual){const a=ACTIVITIES[d.ritual];world.focus(d.ritual==='record'?'turntable':a.room);let text=a.text;if(d.ritual==='record'){await toggleRecord();if(!recordPlayer.enabled)text='You let the record rest. The house settles into quiet.';}remember(state,text);closePanel();sound.care();toast(text);save();return;}
 if(d.rest){restUntil(state,Number(d.rest));world.hours=state.hours;world.syncPets(state);closePanel();world.focus('balcony');updateHUD();save();return;}
 switch(d.action){
  case 'interact':interact();break;
  case 'jump':if(playing&&!panel&&!world.telescope.active)world.jumpQueued=true;break;
  case 'admin':window.open('/admin','_blank','noopener');break;
  case 'sound':try{await sound.start();sound.setVolume(sound.volume>0?0:.65);companion.setVolume(sound.volume);recordPlayer.setVolume(sound.volume);if(!sound.volume)speech.stop();$('#sound-button').textContent=sound.volume?'Sound on':'Sound off';}catch{toast('Sound is unavailable in this browser.');}break;
  case 'view-pet':world.lookAtPet(selectedPet);closePanel();toast(`Enjoy a moment with ${PETS.find(p=>p.id===selectedPet).name}. Press E to care for them.`);break;
  case 'resume':closePanel();break;
  case 'leave':disposeTouchControls();recordPlayer.stop();save();closePanel(false);await companion.disconnect();speech.stop();sound.setVolume(0);playing=false;world.mode='menu';renderMenu();break;
  case 'connect':try{speech.stop();if(companion.session)await companion.disconnect();await companion.connect(import.meta.env.ELEVENLABS_AGENT_ID,contextForVoice(state,world.room),state.name);}catch{$('#voice-status').textContent=import.meta.env.ELEVENLABS_AGENT_ID?'Could not connect. Check microphone permission and try again.':'Voice chat is not set up yet. Add a friendly companion agent to this deployment.';}break;
  case 'mute':companion.mute();b.textContent=companion.muted?'Unmute microphone':'Mute microphone';break;
  case 'disconnect':await companion.disconnect();break;
 }
});
function interact(){if(!playing||panel||world.paused||world.telescope.active)return;
 const selection=currentMemorySelection();if(selection.hovered&&!selection.memory)return;if(selection.aimed){selectedMemory=selection.memory.id;openPanel('memory');return;}
 if(world.lookTarget){const id=world.lookTarget;if(id==='telescope'){world.telescope.enter(state.hours);return;}if(id==='turntable'){toggleRecord();return;}if(PETS.some(p=>p.id===id)){selectedPet=id;world.lookAtPet(id);openPanel('pets');}return;}
 const m=selection.memory;if(m){selectedMemory=m.id;openPanel('memory');}
}
document.addEventListener('keydown',e=>{
 if(!playing||e.repeat||e.altKey||e.ctrlKey||e.metaKey||isTyping(e.target))return;
 if(world.telescope.active){e.preventDefault();if(['Escape','KeyE'].includes(e.code))leaveTelescope();else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))world.telescope.pan(e.code==='ArrowLeft'?-65:e.code==='ArrowRight'?65:0,e.code==='ArrowUp'?-65:e.code==='ArrowDown'?65:0);return;}
 if(panel){
  if(e.code==='Escape'){e.preventDefault();closePanel(false);return;}
  if(panel==='memory'&&['Space','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();if(e.code==='Space')memoryPlayer?.toggle();else if(e.code==='ArrowLeft')memoryPlayer?.previous();else memoryPlayer?.next();return;}
  navigateDialog(e,$('#panel'));return;
 }
 if(e.code==='Escape'){e.preventDefault();openPanel('settings');return;}
 const shortcut=PANEL_SHORTCUTS[e.code];if(shortcut){e.preventDefault();if(shortcut==='pets')world.lookAtPet(selectedPet);openPanel(shortcut);return;}
 if(e.code!=='KeyE')return;e.preventDefault();
 interact();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){recordPlayer.suspend();world.unlock();speech.stop();save();if(companion.session&&!companion.muted)companion.mute();}else if(panel!=='memory')recordPlayer.resume();});
window.addEventListener('pagehide',save);
function currentMemorySelection(){
 const p=world.camera.position,d=world.camera.getWorldDirection(p.clone()),all=activeMemories(),hovered=lookedAtMemory(all,p,d,{visible:m=>world.memoryVisible(m)});
 const nearby=all.filter(m=>Math.hypot(m.position[0]-p.x,m.position[2]-p.z)<=1.25&&world.memoryVisible(m));
 const selection=selectMemory(nearby,p,d,floorHeight(p.x,p.z));
 // Looking at a distant ring names it, but never opens another nearby moment.
 return {...(hovered&&selection.memory?.id!==hovered.id?{memory:null,aimed:false}:selection),hovered};
}
function tick(dt){if(!playing)return;timer+=dt;const selection=currentMemorySelection(),m=selection.hovered||selection.memory,available=selection.memory?.id===m?.id,prompt=$('#memory-proximity'),key=m?m.id+':'+available+':'+!!selection.hovered+':'+m.title:'';
 if(prompt&&prompt.dataset.ids!==key){prompt.dataset.ids=key;const content=m?`<small style="color:${memoryAppearance(m).css}">${memoryAppearance(m).symbol} ${memoryAppearance(m).label}</small><strong>${escape(m.title)}</strong><span>${available?`${selection.hovered?'':'Closest memory · '}${touchMode()?'Tap Interact':'E'} · Relive this moment`:'Walk closer to relive'}</span>`:'';prompt.innerHTML=m?(available?`<button data-memory="${escape(m.id)}">${content}</button>`:`<div class="memory-aim-label">${content}</div>`):'';}
 const hint=$('#look-hint');if(hint)hint.hidden=!!m;
 world.memoryMarkers?.children.forEach(g=>{const selected=g.userData.memoryId===m?.id;g.children.forEach(mesh=>mesh.material.opacity=selected?1:.6);});
 advanceLife(state,dt);world.hours=state.hours;sound.update(dt,state.hours,world.room.includes('balcony'));
 if(timer-savedAt>5){savedAt=timer;save();}if(timer-lastContext>10){lastContext=timer;companion.update(contextForVoice(state,world.room));}updateHUD();
 if(state.personalized&&!companion.session&&!speech.speaking&&timer-lastSpoken>180){lastSpoken=timer;speech.play({kind:'home',cue:1+Math.floor(Math.random()*3),name:state.name},{isCurrent:()=>playing&&!panel});}
}
renderMenu();
// Available only in local development for camera, lighting and state verification.
if(import.meta.env.DEV)window.__atHome={world,recordPlayer,get state(){return state;},setTime(hours){state.hours=hours;world.hours=hours;}};

app.addEventListener('change',async e=>{if(e.target.id!=='memory-file'||!e.target.files[0])return;const files=Array.from(e.target.files),selected=$('#memory-placement').value,placement=selected==='here'?{position:[world.camera.position.x,floorHeight(world.camera.position.x,world.camera.position.z),world.camera.position.z],description:roomNames[world.room]||'At home'}:placedMemory(MEMORY_PLACEMENTS.find(m=>m.id===selected));try{const memory=await addLocalMemory(files,placement,$('#memory-title').value.trim());memories.push(memory);syncMemories();openPanel('memories');toast('Your memory is saved on this device.');}catch(error){toast(error.message||'Could not save this memory. Your browser storage may be full.');}});

function memoryFilterHTML(){
 const f=state.memoryFilter,years=[...new Set([new Date().getFullYear(),new Date().getFullYear()-1,...memories.filter(m=>m.date).map(m=>Number(m.date.slice(0,4)))])].sort((a,b)=>b-a);
 const selected=!f.from&&!f.to?'all':f.from.endsWith('-01-01')&&f.to===f.from.slice(0,4)+'-12-31'?f.from.slice(0,4):'custom';
 return `<form id="memory-filter-form" class="memory-date-filter"><h3>Memories to relive</h3><p class="fine">Choose which moments appear in the house. The full collection stays in your library.</p><label class="field">Time period<select id="memory-year"><option value="all">All memories</option>${years.map(y=>`<option value="${y}" ${selected===String(y)?'selected':''}>${y}</option>`).join('')}<option value="custom" ${selected==='custom'?'selected':''}>Custom date range</option></select></label><div class="date-fields"><label class="field">From<input id="memory-from" name="from" type="date" value="${f.from}"></label><label class="field">Through<input id="memory-to" name="to" type="date" value="${f.to}"></label></div><label class="check"><input name="undated" type="checkbox" ${f.includeUndated?'checked':''}><span>Also include memories without a date</span></label><button type="submit">Apply memory dates</button><p class="fine" role="status" id="filter-status"></p></form>`;
}
app.addEventListener('change',e=>{
 if(e.target.id==='memory-year'){const y=e.target.value;if(y==='custom')return;$('#memory-from').value=y==='all'?'':y+'-01-01';$('#memory-to').value=y==='all'?'':y+'-12-31';}
 if(['memory-from','memory-to'].includes(e.target.id))$('#memory-year').value='custom';
});
app.addEventListener('submit',e=>{
 if(e.target.id!=='memory-filter-form')return;e.preventDefault();try{const fields=new FormData(e.target);state.memoryFilter=cleanMemoryFilter({from:fields.get('from'),to:fields.get('to'),includeUndated:fields.has('undated')});syncMemories();save();$('#filter-status').textContent=`Showing ${activeMemories().length} of ${memories.length} memories.`;}catch(error){$('#filter-status').textContent=error.message;}
});
