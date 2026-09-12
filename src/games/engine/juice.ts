import type { FixedLoop } from './loop';
export class ImpactFeedback {
 shake=0;audio:AudioContext|null=null;
 unlock(){if(!this.audio)this.audio=new AudioContext();void this.audio.resume();}
 impact(loop:FixedLoop,strong=false){loop.stop=strong?.05:0;this.shake=strong?.025:.008;if(typeof window==='undefined')return;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduced)this.shake=0;
 if(localStorage.getItem('duet-muted')==='true')return;
 if(strong&&!reduced)navigator.vibrate?.(15);
 const ctx=this.audio;if(!ctx||ctx.state!=='running')return;const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(strong?280:700,ctx.currentTime);g.gain.setValueAtTime(.035,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.045);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.05);
 }
 step(dt:number){this.shake*=Math.exp(-18*dt);return this.shake;}
 dispose(){void this.audio?.close();}
}
export function burst(count=12){return Array.from({length:count},(_,i)=>({x:Math.cos(i/count*Math.PI*2),y:1+(i%3)*.3,z:Math.sin(i/count*Math.PI*2)}));}
