import { clamp } from './input';
export type V3={x:number;y:number;z:number};
export type Pad=V3 & {vx:number;vy:number;held:boolean};
export type Side=0|1;
export type TennisSim={p:V3;previous:V3;v:V3;spin:V3;pads:[Pad,Pad];server:Side;hitter:Side;bounce:number;serve:boolean;toss:boolean;active:boolean;point:Side|null;reason:string;net:boolean;hits:number;impact:number;time:number};
export const R=.12, WIDTH=1.825,LENGTH=4.15,NET=.74;
export const side=(z:number):Side=>z>=0?0:1;
export const opposite=(s:Side):Side=>s===0?1:0;
export function tennisInit(server:Side):TennisSim {const p={x:0,y:.8,z:server===0?3:-3};return {p,previous:{...p},v:{x:0,y:0,z:0},spin:{x:0,y:0,z:0},pads:[{x:0,y:.8,z:3,vx:0,vy:0,held:false},{x:0,y:.8,z:-3,vx:0,vy:0,held:false}],server,hitter:server,bounce:0,serve:true,toss:false,active:false,point:null,reason:'',net:false,hits:0,impact:0,time:0};}
export function toss(s:TennisSim,who:Side){if(s.active||s.toss||s.point!==null||who!==s.server)return;s.p={x:s.pads[who].x,y:.85,z:s.pads[who].z};s.v={x:0,y:3.2,z:0};s.toss=true;}
function award(s:TennisSim,winner:Side,reason:string){s.point=winner;s.reason=reason;s.active=false;s.toss=false;s.impact=3;}
export function strike(s:TennisSim,who:Side,edge=0){
 if(s.point!==null)return;const pad=s.pads[who],dir=who===0?-1:1;
 if(!s.toss){if(s.hitter===who)return;if((s.serve&&s.bounce!==2)||(!s.serve&&s.bounce!==1)){award(s,opposite(who),'volley');return;}}
 const serving=s.toss;const power=clamp(Math.hypot(pad.vx,pad.vy),0,4),sweet=1-clamp(edge,0,1)*.3;
 s.v={x:pad.vx*1.5+(edge*.25),y:serving?-3.5:3.9+power*.25,z:dir*(serving?6.8:7.8+power*1.35)*sweet};
 s.spin={x:-dir*pad.vy*24,y:pad.vx*22,z:0};s.hitter=who;s.bounce=0;s.serve=serving;s.toss=false;s.active=true;s.net=false;s.hits++;s.impact=2;
}
export function stepTennis(s:TennisSim,dt:number){
 s.time+=dt;s.impact=0;s.previous={...s.p};if(s.point!==null||(!s.active&&!s.toss))return;
 const {p,v,spin:w}=s;const speed=Math.hypot(v.x,v.y,v.z),k=.0035;
 const ax=k*(w.y*v.z-w.z*v.y)-.012*speed*v.x,ay=-9.81+k*(w.z*v.x-w.x*v.z)-.012*speed*v.y,az=k*(w.x*v.y-w.y*v.x)-.012*speed*v.z;
 v.x+=ax*dt;v.y+=ay*dt;v.z+=az*dt;p.x+=v.x*dt;p.y+=v.y*dt;p.z+=v.z*dt;const old=s.previous;
 if(s.toss){if(s.pads[s.server].held&&Math.hypot(s.pads[s.server].vx,s.pads[s.server].vy)>.3&&Math.abs(p.y-s.pads[s.server].y)<.7)strike(s,s.server);else if(p.y<R){s.toss=false;p.y=.8;v.y=0;}return;}
 // Swept plane crossing at the net, with a ball-radius slab.
 if((old.z>R&&p.z<=R)||(old.z< -R&&p.z>=-R)) {const plane=old.z>0?R:-R,t=(plane-old.z)/(p.z-old.z),y=old.y+(p.y-old.y)*t,x=old.x+(p.x-old.x)*t;if(y<NET+R&&Math.abs(x)<1.95){s.net=true;s.impact=2;if(y<NET-.08){award(s,opposite(s.hitter),'net');return;}v.z*=.3;v.y=Math.abs(v.y)*.15;p.y=NET+R;}}
 if(old.y>=R&&p.y<R&&v.y<0){const t=(old.y-R)/(old.y-p.y),x=old.x+(p.x-old.x)*t,z=old.z+(p.z-old.z)*t;
 if(Math.abs(x)<=WIDTH&&Math.abs(z)<=LENGTH){const half=side(z),expected=s.serve&&s.bounce===0?s.hitter:opposite(s.hitter);
 if(half!==expected){award(s,opposite(s.hitter),'wrong half');return;}s.bounce++;if(s.bounce>(s.serve?2:1)){award(s,s.hitter,'double bounce');return;}
 if(s.serve&&s.bounce===2&&s.net){Object.assign(s,tennisInit(s.server));return;}
 p.y=R;v.y=Math.abs(v.y)*.85;v.z+=clamp(w.x*R*.12,-1.8,1.8);v.x+=clamp(w.z*R*.12,-1.8,1.8);w.x*=.8;w.y*=.85;s.impact=1;
 }}
 for(const who of [0,1] as Side[]){if(who===s.hitter)continue;const pad=s.pads[who];const approaching=who===0?v.z>0:v.z<0;if(!approaching)continue;
 const plane=pad.z+(who===0?-R:R);if((old.z-plane)*(p.z-plane)<=0){const t=clamp((plane-old.z)/(p.z-old.z),0,1),dx=old.x+(p.x-old.x)*t-pad.x,dy=old.y+(p.y-old.y)*t-pad.y;const d=Math.hypot(dx,dy);if(d<.62){p.z=plane;strike(s,who,d/.62);break;}}
 }
 if(p.y< -1||Math.abs(p.z)>6||Math.abs(p.x)>3.5){const legal=s.bounce===(s.serve?2:1);award(s,legal?s.hitter:opposite(s.hitter),legal?'missed return':'out');}
}
export function botStep(s:TennisSim,dt:number,skill='medium'){
 const pad=s.pads[1],rate=skill==='hard'?4:skill==='easy'?1.6:2.6;
 const target=s.p.z<0?s.p.x+Math.sin(Math.floor(s.time*4)*2.7)*.17:0;pad.x+=clamp(target-pad.x,-rate*dt,rate*dt);pad.z=-3;pad.y=.85;pad.held=true;pad.vy=-.55;pad.vx=Math.sin(s.time*.8)*.3;
 if(s.server===1&&!s.active&&!s.toss&&s.time>.8)toss(s,1);
}
