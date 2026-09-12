import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import { Button } from '@/components/ui/button';
import { usePlay, displayName } from '../play-context';
import { cupLanding, rack, type SportsState } from './logic';
import { Stage3D } from './Stage3D';
import { MatchSetup } from './MatchSetup';
import { Cup, Paddle, Table } from './Models';

function Ball({ state, me }: { state: SportsState; me: string }) {
 const ref=useRef<Mesh>(null);const start=useRef(0);const seq=useRef(-1);
 useFrame(({clock})=>{if(!ref.current)return; if(seq.current!==state.seq){seq.current=state.seq;start.current=clock.elapsedTime;}
  const t=Math.min(1,(clock.elapsedTime-start.current)/1.4); const shot=state.last; const direction=shot?.by===me?1:-1;
  if(!shot||shot.point&&state.kind==='table-tennis'){ref.current.position.set(0,1,2.8);return;}
  if(state.kind==='cup-pong') ref.current.position.set(shot.x*t*direction,1.3+Math.sin(t*Math.PI)*2.4-t*.7,(3+(shot.z-3)*t)*direction);
  else ref.current.position.set(shot.x*t*direction,.25+Math.abs(Math.sin(t*Math.PI*2))*.85,(3-6*t)*direction);
  ref.current.visible=state.kind==='table-tennis'||t<1;
 });
 return <mesh ref={ref} castShadow><sphereGeometry args={[.085,20,12]}/><meshStandardMaterial color="#fff8e7" roughness={.4}/></mesh>;
}
export default function SportsGame() {
 const p=usePlay();const s=p.state as SportsState;const tennis=s.kind==='table-tennis';
 const [aim,setAim]=useState(0);const [power,setPower]=useState(.42);const [paddle,setPaddle]=useState(0);const [clock,setClock]=useState(Date.now());const [locked,setLocked]=useState(false);
 const touch=useRef<{x:number;y:number}|null>(null);
 const mine=s.turn===p.me.id;const frozen=p.busy||locked||(p.live&&!p.partnerOnline);
 useEffect(()=>{if(!s.seq)return;setLocked(true);const t=setTimeout(()=>setLocked(false),1400);return()=>clearTimeout(t);},[s.seq]);
 useEffect(()=>{if(!tennis||s.phase!=='playing')return;const timer=setInterval(()=>setClock(Date.now()),75);return()=>clearInterval(timer);},[tennis,s.phase]);
 useEffect(()=>{if(!p.live||!tennis||!s.launchedAt||mine||clock-s.launchedAt<2800||p.busy)return; p.play({type:'timeout',seq:s.seq});},[clock,s.seq,s.launchedAt,mine,tennis,p.live,p.busy]);
 const stroke=()=>{if(frozen||!mine)return;p.play(tennis?{type:s.launchedAt?'return':'serve',seq:s.seq,x:paddle,aim}:{type:'throw',seq:s.seq,aim,power});};
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement)?.tagName==='INPUT')return;if(e.key==='ArrowLeft'){setAim(v=>Math.max(-1,v-.06));setPaddle(v=>Math.max(-1.4,v-.15));}if(e.key==='ArrowRight'){setAim(v=>Math.min(1,v+.06));setPaddle(v=>Math.min(1.4,v+.15));}if(e.code==='Space'){e.preventDefault();stroke();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
 if(s.phase==='setup')return <MatchSetup state={s} canChoose={p.me.id===p.players[0]&&!s.ready.length&&!p.busy} iAmReady={s.ready.includes(p.me.id)||p.busy} waiting={p.live} onFormat={format=>p.play({type:'format',format})} onReady={()=>p.play({type:'ready'})}/>;
 const land=cupLanding(aim,power);const elapsed=clock-s.launchedAt;const hitWindow=mine&&s.launchedAt>0&&elapsed>=1100&&elapsed<=2500;
 return <section className="mx-auto w-full max-w-3xl" aria-label={tennis?'Table Tennis match':'Cup Pong match'}>
  <div className="mx-auto flex max-w-md items-center justify-between gap-4 px-5 pb-3"><div className="min-w-0 flex-1"><p className="truncate text-sm text-ink/60">You</p><strong className="font-display text-3xl text-pop">{s.scores[p.me.id]}</strong></div><div className="text-center"><p className="text-xs uppercase text-ink/40">{s.format} · {s.target}{tennis?' points':' cups'}</p><p role="status" className="text-sm font-bold text-ink">{tennis?s.launchedAt?`Rally ${s.rally}`:mine?'Your serve':'Opponent serves':mine?'Your throw':`${displayName(p.partner)} throws`}</p></div><div className="min-w-0 flex-1 text-right"><p className="truncate text-sm text-ink/60">{displayName(p.partner)}</p><strong className="font-display text-3xl text-xo">{s.scores[p.partner.id]}</strong></div></div>
  <div onPointerDown={e=>{touch.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(!touch.current)return;const r=e.currentTarget.getBoundingClientRect();if(tennis)setPaddle(Math.max(-1.4,Math.min(1.4,((e.clientX-r.left)/r.width-.5)*3)));else {setAim(Math.max(-1,Math.min(1,((e.clientX-r.left)/r.width-.5)*2)));setPower(Math.max(0,Math.min(1,.4+(touch.current.y-e.clientY)/250)));}}} onPointerUp={()=>{touch.current=null;}} onPointerCancel={()=>{touch.current=null;}} className="touch-none">
  <Stage3D camera={[0,9.7,8.7]} background="#202c35"><Table tennis={tennis}/>
   {tennis?<><Paddle x={paddle} z={3.2}/><Paddle x={s.landing} z={-3.2} blue/></>:<>{rack(s.target).map(c=><group key={c.id}>{s.cups[p.partner.id]?.includes(c.id)&&<Cup x={c.x} z={c.z}/>} {s.cups[p.me.id]?.includes(c.id)&&<Cup x={-c.x} z={-c.z} blue/>}</group>)}{mine&&<mesh position={[land.x,.03,land.z]} rotation-x={-Math.PI/2}><ringGeometry args={[.13,.17,32]}/><meshBasicMaterial color="#ffdf70"/></mesh>}</>}
   <Ball state={s} me={p.me.id}/>
  </Stage3D></div>
  <div className="mx-auto max-w-md space-y-3 px-5 py-4">
   {!p.partnerOnline&&p.live&&<p role="status" className="text-center text-sm text-ink/60">Paused — waiting for your opponent</p>}
   <label className="block text-xs font-bold text-ink/60">{tennis?'Paddle position':'Aim'}<input aria-label={tennis?'Paddle position':'Aim'} className="mt-2 h-8 w-full accent-current text-pop" type="range" min={tennis?-1.4:-1} max={tennis?1.4:1} step=".01" value={tennis?paddle:aim} onChange={e=>tennis?setPaddle(+e.target.value):setAim(+e.target.value)}/></label>
   <label className="block text-xs font-bold text-ink/60">{tennis?'Shot direction':`Power · ${Math.round(power*100)}%`}<input aria-label={tennis?'Shot direction':'Power'} className="mt-2 h-8 w-full accent-current text-pop" type="range" min={tennis?-1:0} max="1" step=".01" value={tennis?aim:power} onChange={e=>tennis?setAim(+e.target.value):setPower(+e.target.value)}/></label>
   <Button className="btn-pop h-12 w-full" disabled={frozen||!mine||(tennis&&Boolean(s.launchedAt)&&!hitWindow)} onClick={stroke}>{!mine?'Opponent’s turn':tennis?s.launchedAt?hitWindow?'Return ball':'Ball approaching…':'Serve':'Throw ball'}</Button>
   <Button variant="ghost" className="w-full text-ink/50" onClick={()=>void p.leaveGame()}>Leave game</Button>
  </div>
 </section>;
}
