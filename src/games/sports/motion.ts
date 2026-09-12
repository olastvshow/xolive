import { velocity } from '../engine/input';
import { FIXED_STEP } from '../engine/loop';
import { Body, Sphere, Vec3, World } from 'cannon-es';
export const BALL_RADIUS = .16;
export const CUP_SCALE = 1.4;
export const CUP_TOP = .07 + .58 * CUP_SCALE;
export const STEP = FIXED_STEP;
export type Sample = { x: number; y: number; t: number };
export type Frame = { x: number; y: number; z: number };
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export function gesture(samples: Sample[]) {
 const v=velocity(samples); return {aim:clamp(v.x*.42,-1,1),power:clamp(-v.y*.42,0,1)};
}
export function cupTrajectory(aim: number, power: number, cups: {x:number;z:number;id:number}[] = [], origin = 0) {
 const world = new World({ gravity: new Vec3(0,-9.82,0) });
 const ball = new Body({mass:.0027, shape:new Sphere(BALL_RADIUS), position:new Vec3(origin,1.6,3)});
 ball.linearDamping=0; ball.velocity.set(aim*2.8,5.6,-(4.1+power*3.8)); world.addBody(ball);
 const frames: Frame[] = [{x:origin,y:1.6,z:3}]; let hit: number|null=null; let landing: Frame|undefined; let captured=false; let rim=false;
 for(let i=0;i<450;i++) {
  const prev=ball.position.clone(); world.step(STEP); const pos=ball.position;
  if(!landing && prev.y>=CUP_TOP && pos.y<CUP_TOP && ball.velocity.y<0) {
   const t=(prev.y-CUP_TOP)/(prev.y-pos.y); const crossing={x:prev.x+(pos.x-prev.x)*t,y:CUP_TOP,z:prev.z+(pos.z-prev.z)*t}; landing=crossing;
   const cup=cups.find(c=>Math.hypot(c.x-crossing.x,c.z-crossing.z)<.267*CUP_SCALE+BALL_RADIUS);
   if(cup){const d=Math.hypot(cup.x-crossing.x,cup.z-crossing.z);
    if(d<.255*CUP_SCALE-BALL_RADIUS){hit=cup.id;captured=true;ball.velocity.x*=.12;ball.velocity.z*=.12;}
    else {rim=true;pos.y=CUP_TOP+BALL_RADIUS;ball.velocity.y=Math.abs(ball.velocity.y)*.48;ball.velocity.x+=(pos.x-cup.x)*6;ball.velocity.z+=(pos.z-cup.z)*6;}
   }
  }
  if(captured && pos.y < .07+BALL_RADIUS){pos.y=.07+BALL_RADIUS;ball.velocity.set(0,0,0);}
  else if(!captured && pos.y<BALL_RADIUS && prev.y>=BALL_RADIUS && Math.abs(pos.x)<1.82 && Math.abs(pos.z)<4.15){pos.y=BALL_RADIUS;ball.velocity.y=Math.abs(ball.velocity.y)*.65;ball.velocity.x*=.86;ball.velocity.z*=.86;}
  frames.push({x:pos.x,y:pos.y,z:pos.z});
  if(captured && pos.y<=.07+BALL_RADIUS){ for(let j=0;j<35;j++) frames.push({...frames[frames.length-1]});break; }
  if(pos.y< -2)break;
 }
 return { frames, hit, rim, landing:landing??frames[frames.length-1], duration:(frames.length-1)*STEP };
}
export function frameAt(frames: Frame[], elapsed:number): Frame {
 const v=clamp(elapsed/STEP,0,frames.length-1), i=Math.floor(v), a=frames[i],b=frames[Math.min(i+1,frames.length-1)],t=v-i;
 return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};
}
