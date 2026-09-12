import { useEffect, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, MeshStandardMaterial } from 'three';
import { usePlay, type PlayValue } from '../play-context';
import { Stage3D } from '../sports/Stage3D';
import { Table, Paddle } from '../sports/Models';
import { MatchSetup } from '../sports/MatchSetup';
import type { SportsState } from '../sports/logic';
import { FixedLoop } from '../engine/loop';
import { GestureInput, clamp } from '../engine/input';
import { ImpactFeedback } from '../engine/juice';
import { tennisInit, stepTennis, botStep, toss, type TennisSim, type Pad } from '../engine/tennis';
import { Button } from '@/components/ui/button';
function Scene({ value,input,juice }: {value:RefObject<PlayValue>;input:GestureInput;juice:ImpactFeedback}){
 const ball=useRef<Mesh>(null),near=useRef<Group>(null),far=useRef<Group>(null),glow=useRef<Mesh>(null);
 const loop=useRef(new FixedLoop()),sim=useRef(tennisInit(0)),seq=useRef(-1),sent=useRef(false),lastSend=useRef(0),counter=useRef(0),lastPacket=useRef(-1),held=useRef(false);
 const buffer=useRef<{time:number;frame:TennisSim}[]>([]),smooth=useRef({x:0,z:2.8}),stalled=useRef(0);
 useEffect(()=>loop.current.visibility(),[]);
 useEffect(()=>value.current.onStream(raw=>{
  const m=raw as {type?:string;seq?:number;n?:number;frame?:TennisSim;pad?:Pad};const p=value.current,s=p.state as SportsState;
  if(m.seq!==s.seq)return;
  if(p.isHost&&m.type==='tennis-input'&&m.pad){const a=m.pad;if(![a.x,a.y,a.z,a.vx,a.vy].every(Number.isFinite))return;sim.current.pads[1]={x:clamp(a.x,-1.6,1.6),y:clamp(a.y,.2,2),z:clamp(a.z,-3.9,-1),vx:clamp(a.vx,-8,8),vy:clamp(a.vy,-8,8),held:!!a.held};if(a.held)toss(sim.current,1);}
  if(!p.isHost&&m.type==='tennis-frame'&&m.frame&&typeof m.n==='number'&&m.n>lastPacket.current){lastPacket.current=m.n;buffer.current.push({time:performance.now(),frame:m.frame});buffer.current=buffer.current.slice(-8);}
 }),[value]);
 useFrame(({camera},delta)=>{
  const p=value.current,s=p.state as SportsState;const host=p.isHost,own=host?0:1,sign=host?1:-1;
  if(seq.current!==s.seq){seq.current=s.seq;sim.current=tennisInit(s.server===p.players[0]?0:1);sent.current=false;buffer.current=[];lastPacket.current=-1;loop.current.accumulator=0;}
   const f=sim.current;const swing=input.swing();
   // Target follows the finger directly; a short exponential chase removes jitter without adding lag.
   const targetX=(input.x-.5)*3.4,targetZ=clamp(2.5+(input.y-.5)*2.4,1.4,3.8);
   const chase=1-Math.exp(-26*Math.min(delta,.05));
   smooth.current.x+=(targetX-smooth.current.x)*chase;smooth.current.z+=(targetZ-smooth.current.z)*chase;
   const pad:Pad={x:smooth.current.x*sign,y:.85,z:smooth.current.z*sign,vx:swing.vx*sign,vy:swing.vy,held:input.down};f.pads[own]=pad;
   if(input.down&&!held.current)toss(f,own);held.current=input.down;
   // Never leave the table frozen: if a point is not confirmed quickly, restart the rally locally.
   if(f.point!==null){if(!stalled.current)stalled.current=performance.now();else if(performance.now()-stalled.current>1600){stalled.current=0;sim.current=tennisInit(s.server===p.players[0]?0:1);}}else stalled.current=0;
  const connected=!p.live||p.partnerOnline;
  let alpha=0;
  if(host&&connected&&!s.done){alpha=loop.current.advance(delta,dt=>{if(!p.live)botStep(f,dt);stepTennis(f,dt);if(f.impact)juice.impact(loop.current,f.impact>1);});if(f.point!==null&&!sent.current&&!p.busy){sent.current=true;p.play({type:'physics-point',seq:s.seq,scorer:p.players[f.point],reason:f.reason});}}
  else if(!host){const time=performance.now()-100;while(buffer.current.length>2&&buffer.current[1].time<time)buffer.current.shift();const [a,b]=buffer.current;if(a){const t=b?clamp((time-a.time)/(b.time-a.time),0,1):1;sim.current={...a.frame,pads:[a.frame.pads[0],pad],p:b?{x:a.frame.p.x+(b.frame.p.x-a.frame.p.x)*t,y:a.frame.p.y+(b.frame.p.y-a.frame.p.y)*t,z:a.frame.p.z+(b.frame.p.z-a.frame.p.z)*t}:a.frame.p};}}
  const now=performance.now();if(p.live&&connected&&now-lastSend.current>40){lastSend.current=now;p.sendStream(host?{type:'tennis-frame',seq:s.seq,n:++counter.current,frame:sim.current}:{type:'tennis-input',seq:s.seq,pad});}
  const frame=sim.current,position=host?{x:frame.previous.x+(frame.p.x-frame.previous.x)*alpha,y:frame.previous.y+(frame.p.y-frame.previous.y)*alpha,z:frame.previous.z+(frame.p.z-frame.previous.z)*alpha}:frame.p;
  ball.current?.position.set(position.x*sign,position.y,position.z*sign);
   if(near.current){near.current.position.set(pad.x*sign,pad.y-.6,pad.z*sign-3.2);
    // The bat tilts with the swipe so the stroke direction is visible.
    near.current.rotation.z=clamp(-swing.vx*.22,-.7,.7);near.current.rotation.x=clamp(-swing.vy*.18,-.6,.6);}
  const other=frame.pads[host?1:0];far.current?.position.set(other.x*sign,other.y-.6,other.z*sign+3.2);
  if(glow.current){glow.current.position.set(pad.x*sign,pad.y,pad.z*sign);const d=Math.hypot(frame.p.x-pad.x,frame.p.y-pad.y,frame.p.z-pad.z);(glow.current.material as MeshStandardMaterial).opacity=clamp(1-d/1.7,0,.65);}
  const shake=juice.step(delta);camera.position.x=position.x*sign*.08+Math.sin(now*.08)*shake;camera.lookAt(0,.15,-.7);
 });
 return <><Table tennis/><group ref={near}><Paddle x={0} z={3.2}/></group><group ref={far}><Paddle x={0} z={-3.2} blue/></group><mesh ref={ball} castShadow><sphereGeometry args={[.12,20,14]}/><meshStandardMaterial color="#fff8e7"/></mesh><mesh ref={glow}><sphereGeometry args={[.34,16,12]}/><meshStandardMaterial color="#e8e99e" transparent opacity={0} depthWrite={false}/></mesh></>;
}
export default function TennisGame(){
 const p=usePlay(),s=p.state as SportsState,value=useRef(p);value.current=p;
 const stage=useRef<HTMLDivElement>(null),input=useRef(new GestureInput()),juice=useRef(new ImpactFeedback());
 useEffect(()=>{const el=stage.current;if(!el)return;const cleanup=input.current.bind(el,undefined,()=>juice.current.unlock());const key=(e:KeyboardEvent)=>{if(e.code==='Space'){e.preventDefault();input.current.down=true;input.current.vy=-1;}if(e.key==='ArrowLeft')input.current.x=clamp(input.current.x-.06,0,1);if(e.key==='ArrowRight')input.current.x=clamp(input.current.x+.06,0,1);};const up=()=>{input.current.down=false;};window.addEventListener('keydown',key);window.addEventListener('keyup',up);return()=>{cleanup();window.removeEventListener('keydown',key);window.removeEventListener('keyup',up);};},[s.phase]);
 useEffect(()=>()=>juice.current.dispose(),[]);
 if(s.phase==='setup')return <MatchSetup state={s} canChoose={p.isHost&&!s.ready.length} iAmReady={s.ready.includes(p.me.id)} waiting={p.live} onFormat={format=>p.play({type:'format',format})} onReady={()=>p.play({type:'ready'})}/>;
 return <section className="sports-fullscreen" aria-label="Table Tennis match"><div className="relative z-10 mx-auto grid max-w-lg grid-cols-[auto_1fr_auto] items-start gap-4 px-6 py-4 text-sm text-ink"><strong>You · {s.scores[p.me.id]}</strong><span className="text-center">{p.live&&!p.partnerOnline?'Paused · opponent disconnected':s.seq===0?'Hold to toss · swipe up for topspin, down for backspin':`${s.format} · ${s.target} points`}</span><strong>{s.scores[p.partner.id]} · {p.partner.display_name}</strong></div><div ref={stage} className="sports-touch-stage touch-none"><Stage3D camera={[0,3.5,8.6]} fov={52} background="#202c35"><Scene value={value} input={input.current} juice={juice.current}/></Stage3D></div><div className="sports-exit"><Button variant="ghost" onClick={()=>void p.leaveGame()}>Leave game</Button></div></section>;
}
