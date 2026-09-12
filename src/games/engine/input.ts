export type Sample = { x:number;y:number;t:number };
export const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export function velocity(samples:Sample[]) {
 const end=samples.at(-1);if(!end)return {x:0,y:0};
 const points=samples.filter(p=>end.t-p.t<=80);if(points.length<2)return {x:0,y:0};
 const n=points.length, mean=points.reduce((a,p)=>({t:a.t+(p.t-end.t)/1000/n,x:a.x+p.x/n,y:a.y+p.y/n}),{t:0,x:0,y:0});
 let den=0,x=0,y=0;for(const p of points){const t=(p.t-end.t)/1000-mean.t;den+=t*t;x+=t*(p.x-mean.x);y+=t*(p.y-mean.y);}
 return den>1e-8?{x:clamp(x/den,-8,8),y:clamp(y/den,-8,8)}:{x:0,y:0};
}
export class GestureInput {
 samples:Sample[]=[];id:number|null=null; x=.5;y=.8;vx=0;vy=0;down=false;stroke=0;releasedAt=0;
 private rect:DOMRect|null=null;
 /** Swing energy: full while the finger moves, fading over ~250ms after release so a lifted finger stops swinging. */
 swing(){const fade=this.down?1:clamp(1-(performance.now()-this.releasedAt)/250,0,1);return {vx:this.vx*fade,vy:this.vy*fade};}
 bind(element:HTMLElement,onRelease?:()=>void,onStart?:()=>void){
  const measure=()=>{this.rect=element.getBoundingClientRect();};measure();
  const sample=(e:PointerEvent)=>{const r=this.rect;if(!r)return;this.x=clamp((e.clientX-r.left)/r.width,0,1);this.y=clamp((e.clientY-r.top)/r.height,0,1);this.samples.push({x:this.x,y:this.y,t:e.timeStamp});if(this.samples.length>32)this.samples.shift();const v=velocity(this.samples);this.vx=v.x;this.vy=v.y;};
  const start=(e:PointerEvent)=>{if(this.id!==null||!e.isPrimary)return;measure();this.id=e.pointerId;this.down=true;this.samples=[];this.vx=this.vy=0;element.setPointerCapture(e.pointerId);sample(e);onStart?.();};
   const move=(e:PointerEvent)=>{
    if(this.id===null){const r=this.rect;if(r&&e.pointerType==='mouse'){this.x=clamp((e.clientX-r.left)/r.width,0,1);this.y=clamp((e.clientY-r.top)/r.height,0,1);}return;}
    if(e.pointerId!==this.id)return;const events=e.getCoalescedEvents?.();for(const p of events?.length?events:[e])sample(p);};
   const end=(e:PointerEvent)=>{if(e.pointerId!==this.id)return;sample(e);this.down=false;this.id=null;this.releasedAt=performance.now();this.stroke++;onRelease?.();};
   const cancel=()=>{this.down=false;this.id=null;this.releasedAt=performance.now();this.vx=this.vy=0;this.samples=[];};
  element.style.touchAction='none';element.addEventListener('pointerdown',start);element.addEventListener('pointermove',move);element.addEventListener('pointerup',end);element.addEventListener('pointercancel',cancel);window.addEventListener('resize',measure);window.addEventListener('orientationchange',measure);
  return ()=>{element.removeEventListener('pointerdown',start);element.removeEventListener('pointermove',move);element.removeEventListener('pointerup',end);element.removeEventListener('pointercancel',cancel);window.removeEventListener('resize',measure);window.removeEventListener('orientationchange',measure);};
 }
}
