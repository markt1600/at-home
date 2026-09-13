// Failed transfers are retryable; a partially loaded house is never treated as ready.
export class AssetReadiness{
 constructor(tasks,{onChange=()=>{},delay=ms=>new Promise(r=>setTimeout(r,ms)),attempts=3}={}){this.tasks=tasks;this.onChange=onChange;this.delay=delay;this.attempts=attempts;this.done=new Set();this.failed=[];this.running=false;}
 get ready(){return this.done.size===this.tasks.length;}
 get status(){return {ready:this.ready,loading:this.running,loaded:this.done.size,total:this.tasks.length,failed:[...this.failed]};}
 run(){
  if(this.pending)return this.pending;
  this.running=true;this.failed=[];this.onChange(this.status);
  this.pending=Promise.all(this.tasks.filter(t=>!this.done.has(t.id)).map(async task=>{
   for(let attempt=0;attempt<this.attempts;attempt++){
    try{await task.load(attempt);this.done.add(task.id);this.onChange(this.status);return;}catch{if(attempt+1<this.attempts)await this.delay(450*(attempt+1));}
   }
   this.failed.push(task.id);
  })).then(()=>{this.running=false;this.pending=null;this.onChange(this.status);return this.ready;});return this.pending;
 }
}
