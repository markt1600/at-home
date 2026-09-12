import { cleanName } from './life.js';

const CUE_PREFIX = '[GAME_AMBIENT_CUE]';
// Loaded only when the player explicitly connects the intercom.
export class Intercom {
  constructor(onChange,onMessage,loadClient=()=>import('@elevenlabs/client')){
    this.session=null;this.connecting=false;this.generation=0;this.onChange=onChange;this.onMessage=onMessage;
    this.muted=false;this.mode='listening';this.lastActivity=0;this.pendingUntil=0;this.loadClient=loadClient;this.volume=.5;
  }
  async connect(agentId,context,name){
    if(this.session||this.connecting)return;
    if(!agentId)throw new Error('The home companion has not been configured yet.');
    const generation=++this.generation;this.connecting=true;this.lastActivity=Date.now();this.onChange('Connecting…');
    const current=()=>generation===this.generation;
    try{
      const {Conversation}=await this.loadClient();
      if(!current())return;
      const session=await Conversation.startSession({
        agentId,
        dynamicVariables:{game_context:context,player_name:cleanName(name)},
        onMessage:({message,source})=>{
          if(!current())return;
          this.lastActivity=Date.now();
          if(source==='user'&&message.startsWith(CUE_PREFIX))return;
          this.onMessage(source==='user'?'You':'Home companion',message);
        },
        onModeChange:({mode})=>{if(!current())return;this.mode=mode;this.lastActivity=Date.now();if(mode==='listening')this.pendingUntil=0;this.onChange(this.muted?'Microphone muted':mode==='speaking'?'Speaking':'Listening');},
        onVadScore:({vadScore})=>{if(current()&&vadScore>.35)this.lastActivity=Date.now();},
        onDisconnect:()=>{if(current()){this.session=null;this.pendingUntil=0;this.onChange('Disconnected');}},
        onError:()=>{if(current())this.onChange('Connection error — disconnect and retry');},
      });
      if(generation!==this.generation){await session.endSession();return;}
      this.session=session;session.setVolume({volume:this.volume});session.sendContextualUpdate(context);this.onChange('Listening');
    }catch(e){if(current())this.onChange('Disconnected');throw e;}finally{if(current())this.connecting=false;}
  }
  update(context){this.session?.sendContextualUpdate(context);}
  setVolume(volume){this.volume=volume;this.session?.setVolume({volume});}
  mute(){if(!this.session)return;this.muted=!this.muted;this.session.setMicMuted(this.muted);this.onChange(this.muted?'Microphone muted':'Listening');}
  async disconnect(){++this.generation;const s=this.session;this.session=null;this.connecting=false;this.muted=false;this.pendingUntil=0;this.onChange('Disconnected');if(s)await s.endSession();}
}
