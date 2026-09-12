import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { usePlay } from '../play-context';
import type { SportsState } from './logic';
import { Stage3D } from './Stage3D';
import { MatchSetup } from './MatchSetup';
import { CupScene } from './CupScene';
import { GestureInput, clamp } from '../engine/input';
import { ImpactFeedback } from '../engine/juice';
export default function SportsGame(){
 const p=usePlay(),s=p.state as SportsState,value=useRef(p);value.current=p;
 const stage=useRef<HTMLDivElement>(null),input=useRef(new GestureInput()),elapsed=useRef(0),juice=useRef(new ImpactFeedback());
 useEffect(()=>{const el=stage.current;if(!el)return;
  const shoot=()=>{const v=value.current,state=v.state as SportsState;if(v.busy||state.done||state.turn!==v.me.id||(v.live&&!v.partnerOnline)||(state.last&&elapsed.current<(state.last.duration??0)+.9))return;const i=input.current;v.play({type:'throw',seq:state.seq,aim:clamp(i.vx*.42,-1,1),power:clamp(-i.vy*.42,0,1),origin:clamp((i.x-.5)*2.4,-1.2,1.2)});};
  const clean=input.current.bind(el,shoot,()=>juice.current.unlock());const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement).tagName==='INPUT')return;if(e.key==='ArrowLeft')input.current.vx-=.1;if(e.key==='ArrowRight')input.current.vx+=.1;if(e.key==='ArrowUp')input.current.vy-=.15;if(e.key==='ArrowDown')input.current.vy+=.15;if(e.code==='Space'){e.preventDefault();shoot();}};window.addEventListener('keydown',key);return()=>{clean();window.removeEventListener('keydown',key);};
 },[s.phase]);
 useEffect(()=>()=>juice.current.dispose(),[]);
 if(s.phase==='setup')return <MatchSetup state={s} canChoose={p.isHost&&!s.ready.length&&!p.busy} iAmReady={s.ready.includes(p.me.id)||p.busy} waiting={p.live} onFormat={format=>p.play({type:'format',format})} onReady={()=>p.play({type:'ready'})}/>;
 return <section className="sports-fullscreen" aria-label="Cup Pong match"><div className="relative z-10 mx-auto flex max-w-md justify-between gap-3 px-6 py-4 text-ink"><strong>You</strong><span>{p.live&&!p.partnerOnline?'Paused · opponent disconnected':s.turn===p.me.id?'Your throw':'Opponent throws'} · {s.target} cups</span><strong>{p.partner.display_name}</strong></div><div ref={stage} className="sports-touch-stage touch-none"><Stage3D camera={[0,8.6,8]} background="#202c35"><CupScene value={value} input={input.current} elapsed={elapsed} juice={juice.current}/></Stage3D></div><div className="sports-exit"><Button variant="ghost" onClick={()=>void p.leaveGame()}>Leave game</Button></div></section>;
}
