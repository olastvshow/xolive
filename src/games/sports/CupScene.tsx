import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { CircleGeometry, InstancedMesh, LatheGeometry, Mesh, Object3D, TorusGeometry, Vector2 } from 'three';
import { rack, type SportsState } from './logic';
import { BALL_RADIUS, CUP_SCALE, cupTrajectory, frameAt } from './motion';
import { GestureInput, clamp } from '../engine/input';
import { FixedLoop } from '../engine/loop';
import { ImpactFeedback, burst } from '../engine/juice';
import { Table } from './Models';
import type { PlayValue } from '../play-context';
export function CupScene({value,input,elapsed,juice}:{value:RefObject<PlayValue>;input:GestureInput;elapsed:RefObject<number>;juice:ImpactFeedback}){
 const ball=useRef<Mesh>(null),shadow=useRef<Mesh>(null),arc=useRef<InstancedMesh>(null),trail=useRef<InstancedMesh>(null),splash=useRef<InstancedMesh>(null),ripple=useRef<Mesh>(null);
 const bodies=useRef<InstancedMesh>(null),rims=useRef<InstancedMesh>(null),liquid=useRef<InstancedMesh>(null);
 const loop=useRef(new FixedLoop()),seq=useRef(-1),hitPlayed=useRef(false),previewTime=useRef(0),preview=useRef(cupTrajectory(0,.3).frames);
 const assets=useMemo(()=>{const profile=[new Vector2(0,.02),new Vector2(.18,.02),new Vector2(.28,.58),new Vector2(.255,.58),new Vector2(.175,.06),new Vector2(0,.06)];return {body:new LatheGeometry(profile,32),rim:new TorusGeometry(.267,.023,8,32),water:new CircleGeometry(.232,32),dummy:new Object3D(),particles:burst()};},[]);
 useEffect(()=>loop.current.visibility(),[]);
 useEffect(()=>()=>{assets.body.dispose();assets.rim.dispose();assets.water.dispose();},[assets]);
 useFrame(({camera},dt)=>{
  const p=value.current,s=p.state as SportsState,shot=s.last;if(seq.current!==s.seq){seq.current=s.seq;elapsed.current=0;hitPlayed.current=false;}
  if(!p.live||p.partnerOnline)loop.current.advance(dt,d=>{elapsed.current+=d;});
  const time=elapsed.current,dir=shot?.by===p.me.id?1:-1,duration=shot?.duration??0,flight=!!shot&&time<duration;
  const pos=shot?.frames?.length?frameAt(shot.frames,time):{x:(input.x-.5)*2.4,y:1.6,z:3};
  if(ball.current){ball.current.position.set(pos.x*dir,pos.y,pos.z*dir);ball.current.visible=!shot||time<duration+.7;}
  if(shadow.current){shadow.current.position.set(pos.x*dir,.025,pos.z*dir);shadow.current.scale.setScalar(.8+Math.max(0,pos.y)*.3);shadow.current.visible=Math.abs(pos.x)<1.8&&Math.abs(pos.z)<4.1&&(!shot||flight);}
  const d=assets.dummy;const cups=rack(s.target);let n=0;
  for(const own of [false,true])for(const c of cups){const owner=own?p.me.id:p.partner.id;const removed=!s.cups[owner]?.includes(c.id);const current=removed&&shot?.hit===c.id&&shot.by!==(own?p.me.id:p.partner.id);const progress=current?clamp((time-duration)/.7,0,1):removed?1:0;const sign=own?-1:1,scale=CUP_SCALE*(1-progress);
   d.position.set(c.x*sign,.07-progress*.65,c.z*sign);d.rotation.set(0,0,0);d.scale.setScalar(scale);d.updateMatrix();bodies.current?.setMatrixAt(n,d.matrix);
   d.position.y=.07+.58*scale-progress*.65;d.rotation.x=Math.PI/2;d.updateMatrix();rims.current?.setMatrixAt(n,d.matrix);
   d.position.y=.07+.4*scale-progress*.65;d.rotation.x=-Math.PI/2;d.updateMatrix();liquid.current?.setMatrixAt(n,d.matrix);n++;
  }
  for(const mesh of [bodies.current,rims.current,liquid.current])if(mesh){mesh.count=n;mesh.instanceMatrix.needsUpdate=true;}
  if(input.down&&s.turn===p.me.id&&time>duration+.7){previewTime.current+=dt;if(previewTime.current>.05){previewTime.current=0;preview.current=cupTrajectory(clamp(input.vx*.42,-1,1),clamp(-input.vy*.42,0,1),cups,(input.x-.5)*2.4).frames;}}
  if(arc.current){arc.current.visible=input.down&&s.turn===p.me.id&&(!shot||time>duration+.7);for(let i=0;i<32;i++){const f=preview.current[Math.min(preview.current.length-1,i*3)];d.position.set(f.x,f.y,f.z);d.rotation.set(0,0,0);d.scale.setScalar(.025);d.updateMatrix();arc.current.setMatrixAt(i,d.matrix);}arc.current.instanceMatrix.needsUpdate=true;}
  if(trail.current){trail.current.visible=flight;for(let i=0;i<12;i++){const f=shot?.frames?.length?frameAt(shot.frames,Math.max(0,time-i*.025)):pos;d.position.set(f.x*dir,f.y,f.z*dir);d.scale.setScalar(.07*(1-i/12));d.updateMatrix();trail.current.setMatrixAt(i,d.matrix);}trail.current.instanceMatrix.needsUpdate=true;}
  const entry=shot?.hit!==null&&shot?.hit!==undefined&&time>duration-.25&&time<duration+.65;
  if(entry&&!hitPlayed.current){hitPlayed.current=true;juice.impact(loop.current,true);}
  if(splash.current){splash.current.visible=entry;const t=Math.max(0,time-duration+.25);for(let i=0;i<12;i++){const v=assets.particles[i];d.position.set(pos.x*dir+v.x*t*.5,.6+v.y*t*2-4*t*t,pos.z*dir+v.z*t*.5);d.scale.setScalar(.035*Math.max(0,1-t));d.updateMatrix();splash.current.setMatrixAt(i,d.matrix);}splash.current.instanceMatrix.needsUpdate=true;}
  if(ripple.current){ripple.current.visible=entry;ripple.current.position.set(pos.x*dir,.64,pos.z*dir);ripple.current.scale.setScalar(.4+Math.max(0,time-duration+.25)*2);}
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;const push=flight&&!reduced?Math.sin(Math.min(1,time/Math.max(duration,.1))*Math.PI)*.55:0;camera.position.z=8-push;camera.position.y=8.6-push;camera.lookAt(0,.15,0);juice.step(dt);
 });
 return <><Table tennis={false}/><instancedMesh ref={bodies} args={[assets.body,undefined,20]} castShadow><meshPhysicalMaterial color="#ed3446" roughness={.3} clearcoat={.6}/></instancedMesh><instancedMesh ref={rims} args={[assets.rim,undefined,20]}><meshStandardMaterial color="#faf7f4"/></instancedMesh><instancedMesh ref={liquid} args={[assets.water,undefined,20]}><meshPhysicalMaterial color="#e7b554" transparent opacity={.8} roughness={.1}/></instancedMesh><mesh ref={ball} castShadow><sphereGeometry args={[BALL_RADIUS,20,14]}/><meshStandardMaterial color="#fff8e7"/></mesh><mesh ref={shadow} rotation-x={-Math.PI/2}><circleGeometry args={[.19,24]}/><meshBasicMaterial color="#101b20" transparent opacity={.38} depthWrite={false}/></mesh><instancedMesh ref={arc} args={[undefined,undefined,32]}><sphereGeometry args={[1,6,4]}/><meshBasicMaterial color="#fff8e7" transparent opacity={.22}/></instancedMesh><instancedMesh ref={trail} args={[undefined,undefined,12]}><sphereGeometry args={[1,8,6]}/><meshBasicMaterial color="#fff8e7" transparent opacity={.24}/></instancedMesh><instancedMesh ref={splash} args={[undefined,undefined,12]}><sphereGeometry args={[1,6,4]}/><meshStandardMaterial color="#f2d179" transparent opacity={.8}/></instancedMesh><mesh ref={ripple} rotation-x={-Math.PI/2}><ringGeometry args={[.19,.21,24]}/><meshBasicMaterial color="#faf1cb" transparent opacity={.5}/></mesh></>;
}
