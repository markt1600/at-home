import {installGameGestures} from './game-gestures.js';
installGameGestures();

// Give the HTML welcome screen a paint before fetching/evaluating the 3D code.
const painted=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
await painted();
const fonts=document.createElement('link');fonts.rel='stylesheet';fonts.media='print';
fonts.href='https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap';
fonts.onload=()=>{fonts.media='all';};document.head.append(fonts);
try{
 await import('./main.js');
 document.documentElement.removeAttribute('data-starting');
}catch{
 const status=document.querySelector('#boot-status'),retry=document.querySelector('#boot-retry');
 if(status)status.textContent='The house could not finish loading. Check your connection and try again.';
 document.querySelector('#boot-progress')?.setAttribute('hidden','');
 if(retry){retry.hidden=false;retry.onclick=()=>location.reload();}
}
