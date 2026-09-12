import {NAME_CALLS,cleanName} from './voice-lines.js';
export const playerName=cleanName;
const CALLS=NAME_CALLS.slice(0,6);

// Count active play time, not wall time: pausing never causes queued calls.
export class Haunting {
  constructor(random = Math.random) { this.random = random; this.reset(); }
  reset() { this.remaining = 28 + Math.floor(this.random() * 18); this.last = -1; this.count = 0; }
  tick(seconds, { active, enabled, signalOff, ready, name }) {
    if (!active || !enabled || signalOff || this.count >= 6) return null;
    this.remaining = Math.max(0, this.remaining - seconds);
    if (this.remaining > 0 || !ready) return null;
    const choices = CALLS.map((_, i) => i).filter(i => i !== this.last);
    this.last = choices[Math.floor(this.random() * choices.length)];
    this.count++;
    this.remaining = 75 + Math.floor(this.random() * 46);
    return CALLS[this.last](playerName(name));
  }
}
