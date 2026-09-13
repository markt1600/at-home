import './style.css';
import {House} from './scene.js';
import {PANEL_SHORTCUTS,isTyping,prepareDialog,navigateDialog} from './keyboard.js';
import {formatMemoryDate} from './memory-metadata.js';
import {loadMemories,nearMemories,addLocalMemory,removeLocalMemory,MEMORY_PLACEMENTS,placedMemory} from './memories.js';
import {floorHeight,planPoint} from './house-layout.js';
import {HomeSound} from './audio.js';
import {RenderedVoice} from './rendered-voice.js';
import {Intercom} from './voice.js';
import {SAVE_KEY,NEIGHBORS,PETS,ACTIVITIES,newLife,restoreLife,clockLabel,dayNumber,dayPhase,advanceLife,invite,careForPet,restUntil,remember,contextForVoice} from './life.js';

const $=s=>document.querySelector(s),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const app=$('#app'),sound=new HomeSound(),speech=new RenderedVoice(sound);
let state;try{state=restoreLife(localStorage.getItem(SAVE_KEY));}catch{}state??=newLife();
let playing=false,panel=null,selectedPet='miso',selectedNeighbor=null,voiceStatus='Disconnected',transcript=[],timer=0,savedAt=0,lastContext=0,lastSpoken=0,toastTimer;
let memories=[],selectedMemory=null,memoryVolume=null,memoryMutedMic=false;
const companion=new Intercom(status=>{voiceStatus=status;const el=$('#voice-status');if(el)el.textContent=status;},(who,text)=>{transcript.push({who,text});transcript=transcript.slice(-12);updateTranscript();});
const world=new House($('#scene'),id=>{const el=$('#look-hint');if(el)el.textContent=id?`E · ${PETS.find(p=>p.id===id)?.name||NEIGHBORS.find(n=>n.id===id)?.name}`:'';},tick);
world.onUnlock=()=>openPanel('settings');
world.onStep=()=>sound.step();world.hours=state.hours;world.syncPeople(state);
async function refreshMemories(){const items=await loadMemories();for(const m of memories)if(m.src?.startsWith('blob:'))URL.revokeObjectURL(m.src);memories=items;world.setMemories(items);}
refreshMemories();
window.addEventListener('focus',()=>{if(panel!=='memory')refreshMemories();});
sound.onVoiceUnavailable=()=>{const el=$('#audio-note');if(el)el.textContent='Spoken audio is unavailable. All conversations remain available as text.';};
world.onAssetError=()=>toast('Some character artwork could not load. Please refresh to try again.');
const roomNames={living:'Living room',living_landing:'Living room',living_south:'Living room',hall:'Entrance',passage:'Hallway',dining:'Dining room',balcony:'Living balcony',dining_bay:'Dining balcony',kitchen:'Kitchen',bedroom:'Main bedroom',guest:'Second bedroom',study:'Home office',wine:'Wine cellar',theatre:'Window lounge',bath:'Main bathroom',powder:'Guest bathroom',vanity:'Vanity',wardrobe:'Wardrobe',meditation:'Meditation alcove',utility:'Utility yard'};
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch{}}
function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),6500);}
function renderMenu(){
 app.innerHTML=`<main class="welcome"><div class="welcome-copy"><p class="eyebrow">A place to take your time</p><h1>At Home<span>.</span></h1><p class="intro">Watch the light change. Share a cup of tea.<br>Look after a few little friends.</p><p class="quiet">No score. No rush. Just a day that belongs to you.</p></div><form id="welcome-form" class="welcome-card"><p class="eyebrow">Make yourself comfortable</p><h2>Enter your name<br>or nickname</h2><label class="sr-only" for="name">Name or nickname</label><input id="name" name="name" maxlength="28" autocomplete="given-name" placeholder="What shall we call you?" value="${state.name==='Friend'?'':escape(state.name)}"><label class="check"><input id="personalized" type="checkbox" ${state.personalized?'checked':''}><span>Include my name in spoken greetings</span></label><p class="fine">Optional. Your nickname is used to generate these greetings. Your microphone stays off until you connect Voice.</p><button class="primary" type="submit">${state.journal.length?'Welcome back':'Come on in'} <span>↗</span></button><p class="fine">Your day is saved on this device. Pets rest while you are away.</p></form><div class="menu-footer">An unhurried life, one small moment at a time.</div></main>`;
 $('#welcome-form').addEventListener('submit',async e=>{e.preventDefault();state.name=newLife($('#name').value).name;state.personalized=$('#personalized').checked;await enter();});
}
async function enter(){
 playing=true;world.mode='play';world.paused=false;world.syncPeople(state);save();renderHUD();world.lock();
 try{await sound.start();sound.setVolume(.65);}catch{toast('Sound could not start. You can try the Sound button.');}
 if(state.personalized){lastSpoken=timer;speech.play({kind:'home',cue:0,name:state.name});}
 toast('Welcome home. WASD to wander · Mouse to look · E to interact · Space to jump · H for keys');
 setTimeout(()=>$('#controls')?.classList.add('quiet-controls'),14000);
}
function renderHUD(){app.innerHTML=`<header class="hud-top"><div class="brand">At Home<span>.</span><small id="phase"></small></div><div class="clock"><span id="clock"></span><small id="place"></small></div><div class="top-actions"><button data-action="sound" id="sound-button" aria-label="Toggle sound">Sound on</button><button data-panel="voice">Voice</button><button data-panel="settings" aria-label="Pause and settings">Pause</button></div></header><div class="look-hint" id="look-hint"></div><div class="arrival" id="arrival"></div><div class="memory-proximity" id="memory-proximity"></div><p class="controls" id="controls">WASD · Mouse to look · E to interact · Space to jump · H for keys</p><div class="touch-walk" aria-label="Walking controls"><button data-move="KeyW" aria-label="Walk forward">↑</button><button data-move="KeyA" aria-label="Walk left">←</button><button data-move="KeyS" aria-label="Walk backward">↓</button><button data-move="KeyD" aria-label="Walk right">→</button></div><dialog id="panel" class="panel"><button id="close-panel" class="close" aria-label="Close panel">×</button><div id="panel-content"></div></dialog>`;
 $('#close-panel').onclick=closePanel;$('#panel').addEventListener('cancel',e=>{e.preventDefault();closePanel(false);});
 for(const b of document.querySelectorAll('[data-move]')){b.addEventListener('pointerdown',e=>{b.setPointerCapture(e.pointerId);world.keys[b.dataset.move]=true;});for(const event of ['pointerup','pointercancel'])b.addEventListener(event,()=>delete world.keys[b.dataset.move]);}
 updateHUD();
}
function updateHUD(){if(!playing)return;$('#clock').textContent=`Day ${dayNumber(state.hours)} · ${clockLabel(state.hours)}`;$('#phase').textContent=dayPhase(state.hours);$('#place').textContent=roomNames[world.room]||'At home';
 const n=NEIGHBORS.find(n=>n.id===state.pending),arrival=$('#arrival');if(n){if(arrival.dataset.person!==n.id){arrival.dataset.person=n.id;arrival.innerHTML=`<button data-action="answer">${n.name} is at the door <span>Come to the front door · E</span></button>`;}}else{arrival.innerHTML='';delete arrival.dataset.person;}
}
function openPanel(type){
 if(!playing)return;if(panel==='memory')releaseMemory();world.paused=true;world.unlock();world.previewAnimation=['pets','neighbors'].includes(type);panel=type;
 const dialog=$('#panel');dialog.classList.toggle('wide',type==='rooms');dialog.classList.toggle('memory-panel',type==='memory');$('#panel-content').innerHTML=panelHTML(type);if(!dialog.open)dialog.showModal();
 if(type==='voice')updateTranscript();prepareDialog(dialog,type);
 if(type==='memory'){
  speech.stop();memoryVolume=sound.volume;sound.setVolume(0);if(companion.session&&!companion.muted){companion.mute();memoryMutedMic=true;}companion.setVolume(0);
  const media=$('#memory-player')||$('.memory-media img');media?.addEventListener('error',()=>{$('#memory-error').textContent='This memory could not be loaded. Your original file is unchanged.';});
  if(media?.tagName==='VIDEO'){media.play().catch(()=>{if(panel==='memory')$('#memory-error').textContent='Press Space to play this memory.';});}
 }
}
function releaseMemory(){$('#memory-player')?.pause();if(memoryVolume!==null){sound.setVolume(memoryVolume);companion.setVolume(memoryVolume);memoryVolume=null;}if(memoryMutedMic&&companion.session&&companion.muted)companion.mute();memoryMutedMic=false;}
function closePanel(resume=true){if(!panel)return;if(panel==='memory')releaseMemory();$('#panel').close();panel=null;world.paused=false;world.previewAnimation=false;speech.stop();save();if(resume)world.lock();}
const heading=(eyebrow,title,text='')=>`<p class="eyebrow">${eyebrow}</p><h2>${title}</h2>${text?`<p class="panel-intro">${text}</p>`:''}`;
function panelHTML(type){
 if(type==='memories')return heading('The house remembers the good things','Memories','Find a little memory marker as you walk, or return to a moment here.')+`<div class="memory-list">${memories.map(m=>`<article><button data-memory="${escape(m.id)}"><span class="memory-symbol">${m.type==='video'?'▷':'▧'}</span><span><strong>${escape(m.title)}</strong><small>${escape(m.description)}</small></span></button><button class="memory-go" data-memory-go="${escape(m.id)}">Go to this spot ↗</button>${m.local?`<button class="memory-go" data-memory-delete="${escape(m.id)}">Remove from this device</button>`:''}</article>`).join('')||'<p class="panel-intro">Your first memory is waiting to be added.</p>'}</div><details class="add-memory"><summary>Add a memory from this device</summary><label class="field">A title<input id="memory-title" maxlength="80" placeholder="A moment worth keeping"></label><label class="field">Place the memory<select id="memory-placement"><option value="here">Where I am standing now</option>${MEMORY_PLACEMENTS.map(m=>`<option value="${m.id}">${escape(m.title)} · ${escape(m.room)}</option>`).join('')}</select></label><label class="file-picker">Choose a photo or video<input id="memory-file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"></label><p class="fine">Added files stay in this browser on this device. They are not uploaded. Clearing browser data removes them. Keep your originals.</p></details>`;
 if(type==='memory'){const m=memories.find(m=>m.id===selectedMemory);if(!m)return '';return `<div class="dream"><div class="memory-media">${m.type==='video'?`<video id="memory-player" tabindex="0" playsinline autoplay preload="auto" ${m.poster?`poster="${escape(m.poster)}"`:''} src="${escape(m.src)}"></video>`:`<img src="${escape(m.src)}" alt="${escape(m.title)}">`}</div><div class="dream-caption"><p class="eyebrow">${m.date?escape(formatMemoryDate(m.date)):'A moment to come back to'}</p><h2>${escape(m.title)}</h2><p class="memory-caption">${escape(m.description)}</p><p class="fine" id="memory-error">${m.type==='video'?'Space to pause · ':''}Esc to return</p><button data-action="resume" class="dream-return">Return to the house ↗</button></div></div>`;}
 if(type==='rooms')return heading('Find a quiet corner','Make yourself at home','Choose a place, then take a walk from there.')+`<div class="room-grid">${[['living','Living room','Light & company'],['balcony','Living balcony','A little fresh air'],['dining','Dining room','Room at the table'],['kitchen','Kitchen','Something warm'],['bedroom','Main bedroom','A place to rest'],['guest','Second bedroom','Books & music'],['theatre','Window lounge','A wider view'],['study','Home office','Ideas & little projects'],['wine','Wine cellar','For an evening together'],['door','Front door','Say hello']].map(([id,title,sub])=>`<button class="room" data-room="${id}"><strong>${title}</strong><small>${sub}</small><span>↗</span></button>`).join('')}</div>`;
 if(type==='pets'){const p=PETS.find(p=>p.id===selectedPet),needs=state.pets[p.id];return heading('Our little household',`${p.name} <span class="subheading">the ${p.kind.toLowerCase()}</span>`,'A little food, fresh water and time together.')+`<div class="tabs">${PETS.map(p=>`<button data-pet="${p.id}" aria-pressed="${selectedPet===p.id}">${p.name}</button>`).join('')}</div><div class="needs">${[['food','Food'],['water','Water'],['affection','Company']].map(([id,label])=>`<div><label for="need-${id}">${label}<span>${needs[id]>70?'Content':needs[id]>40?'A little care soon':'Ready for some care'}</span></label><meter id="need-${id}" min="0" max="100" value="${needs[id]}"></meter></div>`).join('')}</div><div class="stack"><button data-care="food">${p.id==='pebble'?'Offer leafy greens':'Fill the food bowl'} <span>♡</span></button><button data-care="water">Refresh the water <span>♡</span></button><button data-care="affection">${p.id==='pebble'?'Sit quietly with Pebble':'Spend time together'} <span>♡</span></button><button data-action="view-pet" class="primary">Spend a moment with ${p.name} <span>↗</span></button></div><p class="fine">Needs pause while you browse or leave the game. No pet can become ill or die. This is a gentle, fictional care routine.</p>`;}
 if(type==='rituals')return heading('The good in ordinary things','A little ritual','There is no checklist to finish. Pick whatever feels good.')+`<div class="stack">${Object.entries(ACTIVITIES).map(([id,a])=>`<button data-ritual="${id}">${id==='record'&&sound.music?'Let the record rest':a.title}<span>↗</span></button>`).join('')}</div>`;
 if(type==='neighbors'){
  const id=selectedNeighbor||state.pending||state.guests[0]?.id,n=NEIGHBORS.find(n=>n.id===id),here=n&&(state.pending===id||state.guests.some(g=>g.id===id));
  if(here)return heading(n.detail,n.name,escape(n.greeting))+`<div class="conversation" id="neighbor-line">“${escape(n.greeting)}”</div><div class="stack">${n.topics.slice(0,2).map(([q],i)=>`<button data-topic="${i}" data-id="${n.id}">${q}</button>`).join('')}${state.pending===id?`<button class="primary" data-action="invite">Invite ${n.name} in for tea <span>↗</span></button><button data-action="later">Another time, thank you</button>`:`<button data-action="find-neighbor" data-id="${n.id}">Join ${n.name} in the house ↗</button>`}</div><p class="fine">Conversations are available as text and spoken audio. Voice lets you chat with your home companion.</p>`;
  return heading('There is always room for a friend','Around the neighborhood','Neighbors stop by throughout the day. You can welcome them in or enjoy some time to yourself.')+`<div class="schedule">${NEIGHBORS.map(n=>`<div><strong>${n.name}</strong><span>around ${String(n.hour).padStart(2,'0')}:00</span><small>${n.detail}</small></div>`).join('')}</div><p class="fine">Invited friends stay for a little while in the living or dining room. You can see them, walk up to them, and press E to chat.</p>`;
 }
 if(type==='journal')return heading('Things worth remembering','Small moments')+`<div class="journal">${state.journal.length?[...state.journal].reverse().map(j=>`<article><small>Day ${dayNumber(j.hours)} · ${clockLabel(j.hours)}</small><p>${escape(j.text)}</p></article>`).join(''):'<p>Your journal is waiting for its first small moment. Make some tea, meet a neighbor, or spend time with a pet.</p>'}</div>`;
 if(type==='voice')return heading('A little company','Your home companion','Talk about your day, your pets or whatever is on your mind.')+`<p class="status" id="voice-status">${escape(voiceStatus)}</p><div class="stack"><button class="primary" data-action="connect">${companion.session?'Reconnect':'Connect microphone'} <span>↗</span></button><div class="inline-buttons"><button data-action="mute">${companion.muted?'Unmute microphone':'Mute microphone'}</button><button data-action="disconnect">Disconnect</button></div></div><p class="fine">Connecting shares microphone audio with the voice service. Your nickname and current game context help keep the conversation relevant. Disconnect at any time.</p><div class="transcript" id="transcript" aria-live="polite"></div><p class="fine" id="audio-note"></p>`;
 if(type==='help')return heading('Leave the menus behind','A few simple keys')+'<dl class="key-guide"><dt>W A S D</dt><dd>Walk around the house</dd><dt>Mouse</dt><dd>Look around · click the house to resume mouse-look</dd><dt>E</dt><dd>Talk, care for a nearby pet or relive a memory</dd><dt>1–9</dt><dd>Choose a numbered popup option</dd><dt>↑ ↓ / Tab</dt><dd>Move between choices · Enter to select</dd><dt>Space</dt><dd>Jump onto furniture · play/pause an open video memory</dd><dt>Esc</dt><dd>Close a popup or pause your walk</dd><dt>M · P · R</dt><dd>Memories · Pets · Little rituals</dd><dt>J · N · V</dt><dd>Journal · Neighbors · Voice</dd><dt>O · H</dt><dd>Room shortcuts · This guide</dd></dl><div class="stack"><button data-action="resume">Back to my day ↗</button><button data-action="admin">Edit memories ↗</button></div>';
 if(type==='settings')return heading('Take your time','A moment to pause','The house and your pets will wait for you.')+`<label class="field">The pace of the day<select id="pace">${[[0,'Hold this time of day'],[.5,'Slow · 40 minutes per day'],[1,'Easy · 20 minutes per day'],[2,'Quick · 10 minutes per day']].map(([v,t])=>`<option value="${v}" ${state.pace===v?'selected':''}>${t}</option>`).join('')}</select></label><label class="check"><input type="checkbox" id="motion" ${world.motion?'checked':''}><span>Character animations & gentle walking motion</span></label><label class="check"><input type="checkbox" id="personalized-setting" ${state.personalized?'checked':''}><span>Include my name in spoken greetings</span></label><div class="inline-buttons"><button data-rest="6">Rest until sunrise</button><button data-rest="18">Skip to sunset</button></div><div class="stack"><button class="primary" data-action="resume">Back to my day <span>↗</span></button><button data-panel="help">Keyboard guide</button><button data-action="admin">Edit memories</button><button data-action="leave">Save & leave</button></div><p class="fine">Your progress is saved automatically on this device. There is no win or lose state. Care, explore and enjoy the passing day.</p>`;
 return '';
}
function updateTranscript(){const el=$('#transcript');if(el){el.innerHTML=transcript.map(m=>`<p><strong>${escape(m.who)}</strong>${escape(m.text)}</p>`).join('');el.scrollTop=el.scrollHeight;}}
async function speakNeighbor(id,line){speech.stop();if(!companion.session)await speech.play({kind:'neighbor',id,line},{isCurrent:()=>panel==='neighbors'&&selectedNeighbor===id});}
function focusNeighbor(id){const g=world.actors.get(id);if(!g)return;world.focus(state.pending===id?'door':'living');if(state.pending!==id)world.lookAtActor(id);}
app.addEventListener('change',e=>{if(e.target.id==='pace')state.pace=Number(e.target.value);if(e.target.id==='motion')world.motion=e.target.checked;if(e.target.id==='personalized-setting'){state.personalized=e.target.checked;if(!state.personalized)speech.stop();}save();});
app.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;const d=b.dataset;
 if(d.memory){selectedMemory=d.memory;openPanel('memory');return;}
 if(d.memoryGo){const m=memories.find(m=>m.id===d.memoryGo);closePanel();world.focus(m.view||'living');world.camera.position.set(m.position[0],m.position[1]+1.67,m.position[2]);return;}
 if(d.memoryDelete){const m=memories.find(m=>m.id===d.memoryDelete);await removeLocalMemory(m);memories=memories.filter(x=>x!==m);world.setMemories(memories);openPanel('memories');return;}
 if(d.panel){if(d.panel==='neighbors')selectedNeighbor=state.pending||state.guests[0]?.id||null;if(d.panel==='pets')world.lookAtPet(selectedPet);openPanel(d.panel);return;}
 if(d.room){world.focus(d.room);closePanel();return;}
 if(d.pet){selectedPet=d.pet;world.lookAtPet(d.pet);openPanel('pets');return;}
 if(d.care){const message=careForPet(state,selectedPet,d.care);world.showCare(selectedPet,d.care);sound.care();toast(message);openPanel('pets');save();companion.update(contextForVoice(state,world.room));return;}
 if(d.ritual){const a=ACTIVITIES[d.ritual];world.focus(a.room);let text=a.text;if(d.ritual==='record'){sound.music=!sound.music;if(!sound.music)text='You let the record rest. The house settles into quiet.';}remember(state,text);closePanel();sound.care();toast(text);save();return;}
 if(d.topic!==undefined){const n=NEIGHBORS.find(n=>n.id===d.id),text=n.topics[Number(d.topic)][1];$('#neighbor-line').textContent=`“${text}”`;remember(state,`${n.name}: ${text}`);speakNeighbor(n.id,Number(d.topic));save();return;}
 if(d.rest){restUntil(state,Number(d.rest));world.hours=state.hours;world.syncPeople(state);closePanel();world.focus('balcony');updateHUD();save();return;}
 switch(d.action){
  case 'admin':window.open('/admin','_blank','noopener');break;
  case 'sound':try{await sound.start();sound.setVolume(sound.volume>0?0:.65);companion.setVolume(sound.volume);if(!sound.volume)speech.stop();$('#sound-button').textContent=sound.volume?'Sound on':'Sound off';}catch{toast('Sound is unavailable in this browser.');}break;
  case 'answer':selectedNeighbor=state.pending;focusNeighbor(selectedNeighbor);openPanel('neighbors');speakNeighbor(selectedNeighbor,'greeting');break;
  case 'invite':{const id=invite(state);world.syncPeople(state);closePanel();toast(`${NEIGHBORS.find(n=>n.id===id).name} has joined you for tea. You can find them in the living room.`);save();updateHUD();break;}
  case 'later':remember(state,`You wished ${NEIGHBORS.find(n=>n.id===state.pending).name} a lovely day.`);state.pending=null;world.syncPeople(state);closePanel();updateHUD();break;
  case 'view-pet':world.lookAtPet(selectedPet);closePanel();toast(`Enjoy a moment with ${PETS.find(p=>p.id===selectedPet).name}. Press E to care for them.`);break;
  case 'find-neighbor':focusNeighbor(d.id);closePanel();break;
  case 'resume':closePanel();break;
  case 'leave':save();closePanel(false);await companion.disconnect();speech.stop();sound.setVolume(0);playing=false;world.mode='menu';renderMenu();break;
  case 'connect':try{speech.stop();if(companion.session)await companion.disconnect();await companion.connect(import.meta.env.ELEVENLABS_AGENT_ID,contextForVoice(state,world.room),state.name);}catch{$('#voice-status').textContent=import.meta.env.ELEVENLABS_AGENT_ID?'Could not connect. Check microphone permission and try again.':'Voice chat is not set up yet. Add a friendly companion agent to this deployment.';}break;
  case 'mute':companion.mute();b.textContent=companion.muted?'Unmute microphone':'Mute microphone';break;
  case 'disconnect':await companion.disconnect();break;
 }
});
document.addEventListener('keydown',e=>{
 if(!playing||e.repeat||e.altKey||e.ctrlKey||e.metaKey||isTyping(e.target))return;
 if(panel){
  if(e.code==='Escape'){e.preventDefault();closePanel(false);return;}
  if(panel==='memory'&&e.code==='Space'){e.preventDefault();const video=$('#memory-player');if(video){if(video.paused)video.play().catch(()=>toast('Press play to start the memory.'));else video.pause();}return;}
  navigateDialog(e,$('#panel'));return;
 }
 if(e.code==='Escape'){e.preventDefault();openPanel('settings');return;}
 const shortcut=PANEL_SHORTCUTS[e.code];if(shortcut){e.preventDefault();if(shortcut==='neighbors')selectedNeighbor=state.pending||state.guests[0]?.id||null;if(shortcut==='pets')world.lookAtPet(selectedPet);openPanel(shortcut);return;}
 if(e.code!=='KeyE')return;e.preventDefault();
 if(world.lookTarget){const id=world.lookTarget;if(PETS.some(p=>p.id===id)){selectedPet=id;world.lookAtPet(id);openPanel('pets');}else{selectedNeighbor=id;openPanel('neighbors');speakNeighbor(id,'greeting');}return;}
 const m=nearMemories(memories,world.camera.position.x,floorHeight(world.camera.position.x,world.camera.position.z),world.camera.position.z)[0];if(m){selectedMemory=m.id;openPanel('memory');}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){world.unlock();speech.stop();save();if(companion.session&&!companion.muted)companion.mute();}});
window.addEventListener('pagehide',save);
function tick(dt){if(!playing)return;timer+=dt;const nearby=nearMemories(memories,world.camera.position.x,floorHeight(world.camera.position.x,world.camera.position.z),world.camera.position.z);const memoryPrompt=$('#memory-proximity');if(memoryPrompt&&memoryPrompt.dataset.ids!==nearby.map(m=>m.id).join()){memoryPrompt.dataset.ids=nearby.map(m=>m.id).join();memoryPrompt.innerHTML=nearby.map(m=>`<button data-memory="${escape(m.id)}"><small>A MEMORY HERE</small>${escape(m.title)}<span>Relive this moment · E ↗</span></button>`).join('');}const events=advanceLife(state,dt);world.hours=state.hours;sound.update(dt,state.hours,world.room.includes('balcony'));
 for(const event of events){const n=NEIGHBORS.find(n=>n.id===event.id);if(event.type==='arrival'){sound.chime();toast(`${n.name} has stopped by. Say hello whenever you are ready.`);}else toast(`${n.name} heads home after a lovely visit.`);}if(events.length)world.syncPeople(state);
 if(timer-savedAt>5){savedAt=timer;save();}if(timer-lastContext>10){lastContext=timer;companion.update(contextForVoice(state,world.room));}updateHUD();
 if(state.personalized&&!companion.session&&!speech.speaking&&timer-lastSpoken>180){lastSpoken=timer;speech.play({kind:'home',cue:1+Math.floor(Math.random()*3),name:state.name},{isCurrent:()=>playing&&!panel});}
}
renderMenu();
// Available only in local development for camera, lighting and state verification.
if(import.meta.env.DEV)window.__atHome={world,get state(){return state;},setTime(hours){state.hours=hours;world.hours=hours;},visit(id='ken'){state.pending=id;world.syncPeople(state);updateHUD();}};

app.addEventListener('change',async e=>{if(e.target.id!=='memory-file'||!e.target.files[0])return;const file=e.target.files[0],selected=$('#memory-placement').value,placement=selected==='here'?{position:[world.camera.position.x,floorHeight(world.camera.position.x,world.camera.position.z),world.camera.position.z],description:roomNames[world.room]||'At home'}:placedMemory(MEMORY_PLACEMENTS.find(m=>m.id===selected));try{const memory=await addLocalMemory(file,placement,$('#memory-title').value.trim());memories.push(memory);world.setMemories(memories);openPanel('memories');toast('Your memory is saved on this device.');}catch(error){toast(error.message||'Could not save this memory. Your browser storage may be full.');}});
