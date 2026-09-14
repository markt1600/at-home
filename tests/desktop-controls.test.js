import test from 'node:test';
import assert from 'node:assert/strict';
import {installDesktopInteraction} from '../src/desktop-controls.js';

test('only a primary mouse press in the game activates; touch and UI clicks cannot activate twice',t=>{
 const oldWindow=globalThis.window,oldDocument=globalThis.document;
 globalThis.window=new EventTarget();globalThis.document=new EventTarget();
 t.after(()=>{globalThis.window=oldWindow;globalThis.document=oldDocument;});
 const canvas=new EventTarget();let actions=0,locks=0;
 const world={mode:'play',paused:false,telescope:{active:false},onInteract:()=>actions++,lock:()=>locks++};
 installDesktopInteraction(canvas,world);
 const send=(type,props={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,{pointerType:'mouse',button:0,...props});canvas.dispatchEvent(e);};
 const click=(props={})=>{send('pointerdown',props);send('click',props);};
 click();assert.equal(actions,1);assert.equal(locks,1);
 click({button:2});click({button:1});click({ctrlKey:true});click({pointerType:'touch'});click({pointerType:'pen'});
 click({sourceCapabilities:{firesTouchEvents:true}});send('click');assert.equal(actions,1);
 world.paused=true;send('pointerdown');world.paused=false;send('click');assert.equal(actions,1,'closing a dialog cannot click through');
 send('pointerdown');world.paused=true;send('click');world.paused=false;assert.equal(actions,1);
 world.mode='menu';click();world.mode='play';world.telescope.active=true;click();world.telescope.active=false;assert.equal(actions,1);
 send('pointerdown');send('pointercancel');send('click');send('pointerdown');window.dispatchEvent(new Event('blur'));send('click');assert.equal(actions,1);
 world.onInteract=()=>{actions++;world.paused=true;};click();assert.equal(actions,2);assert.equal(locks,1,'opening a panel does not immediately re-lock');
 world.paused=false;world.onInteract=()=>{actions++;world.telescope.active=true;};click();assert.equal(actions,3);assert.equal(locks,1);
});
