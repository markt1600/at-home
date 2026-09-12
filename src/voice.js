// Loaded only when the player explicitly connects the intercom.
export class Intercom {
  constructor(onChange,onMessage){this.session=null;this.connecting=false;this.generation=0;this.onChange=onChange;this.onMessage=onMessage;this.muted=false;}
  async connect(agentId,context){
    if(this.session||this.connecting)return;
    if(!agentId)throw new Error('The intercom has not been configured with an ElevenLabs agent yet.');
    const generation=++this.generation;this.connecting=true;this.onChange('Connecting…');
    try{
      const {Conversation}=await import('@elevenlabs/client');
      const session=await Conversation.startSession({
        agentId,
        dynamicVariables:{game_context:context},
        onMessage:({message,source})=>this.onMessage(source==='user'?'You':'The intercom',message),
        onModeChange:({mode})=>this.onChange(mode==='speaking'?'Speaking':'Listening'),
        onDisconnect:()=>{if(generation===this.generation){this.session=null;this.onChange('Disconnected');}},
        onError:()=>this.onChange('Connection error — disconnect and retry'),
      });
      if(generation!==this.generation){await session.endSession();return;}
      this.session=session;session.sendContextualUpdate(context);this.onChange('Listening');
    }catch(e){this.onChange('Disconnected');throw e;}finally{this.connecting=false;}
  }
  update(context){this.session?.sendContextualUpdate(context);}
  mute(){if(!this.session)return;this.muted=!this.muted;this.session.setMicMuted(this.muted);this.onChange(this.muted?'Microphone muted':'Listening');}
  async disconnect(){++this.generation;const s=this.session;this.session=null;this.muted=false;this.onChange('Disconnected');if(s)await s.endSession();}
}
