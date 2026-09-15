import {newLife,SAVE_KEY} from './life.js';

// Exploring has its own pet needs, clock and bone. Keep the regular life intact,
// including when autosave, pagehide or an interaction tries to save the visit.
export class HomeSession {
 constructor(savedState){this.state=savedState||newLife();this.hasSavedGame=!!savedState;this.exploring=false;this.regularState=null;}
 startNew(explore=false){
  if(this.exploring)this.leave();
  this.regularState=explore?this.state:null;
  this.exploring=explore;this.state=newLife();this.state.personalized=false;
  return this.state;
 }
 leave(){
  if(this.exploring)this.state=this.regularState;
  this.regularState=null;this.exploring=false;return this.state;
 }
 save(storage){
  if(this.exploring)return;
  storage.setItem(SAVE_KEY,JSON.stringify(this.state));this.hasSavedGame=true;
 }
}
