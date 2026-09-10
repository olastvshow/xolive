import { useEffect, useRef } from "react";
import { usePlay, displayName } from "@/games/play-context";
import type { HockeyState } from "@/games/logic";
import { hockeyBotSkill } from "./bot";
import type { Difficulty } from "@/games/difficulty";

const R_PUCK = 0.045;
const R_PAD = 0.075;
const GOAL_HALF = 0.22;

type Vec = { x: number; y: number };
type Frame = { p: Vec & { vx: number; vy: number }; h: Vec; g: Vec };

export function AirHockeyGame({ difficulty = "medium" }: { difficulty?: Difficulty }) {
  const { state, me, partner, isHost, live, play, restart, leaveGame, sendStream, onStream } = usePlay();
  const s = state as HockeyState;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frame = useRef<Frame>({
    p: { x: 0.5, y: 0.5, vx: 0, vy: 0.006 },
    h: { x: 0.5, y: 0.86 },
    g: { x: 0.5, y: 0.14 },
  });
  const myPad = useRef<Vec>({ x: 0.5, y: isHost ? 0.86 : 0.14 });
  const doneRef = useRef(false);
  doneRef.current = Boolean(s?.done);

  // receive the other side's stream
  useEffect(() => {
    return onStream((payload) => {
      const m = payload as Partial<Frame> & { from?: string };
      if (m.from === me.id) return;
      if (isHost) {
        if (m.g) frame.current.g = m.g;
      } else {
        if (m.p) frame.current.p = m.p;
        if (m.h) frame.current.h = m.h;
      }
    });
  }, [onStream, isHost, me.id]);

  // main loop
  useEffect(() => {
    let raf = 0;
    let lastSend = 0;
    const skill = hockeyBotSkill[difficulty];

    const step = (t: number) => {
      raf = requestAnimationFrame(step);
      const f = frame.current;

      if (isHost) {
        f.h = myPad.current;
        if (!live) {
          // computer paddle
          const targetX = f.p.y < 0.55 ? f.p.x + (Math.random() - 0.5) * skill.error : 0.5;
          f.g.x += (targetX - f.g.x) * skill.speed * 3;
          const targetY = f.p.y < skill.reach ? Math.max(0.06, f.p.y - 0.02) : 0.14;
          f.g.y += (targetY - f.g.y) * skill.speed * 2;
          f.g.x = Math.min(0.94, Math.max(0.06, f.g.x));
          f.g.y = Math.min(0.45, Math.max(0.05, f.g.y));
        }

        if (!doneRef.current) {
          // puck integration
          f.p.x += f.p.vx;
          f.p.y += f.p.vy;
          f.p.vx *= 0.999;
          f.p.vy *= 0.999;

          if (f.p.x < R_PUCK) { f.p.x = R_PUCK; f.p.vx = Math.abs(f.p.vx); }
          if (f.p.x > 1 - R_PUCK) { f.p.x = 1 - R_PUCK; f.p.vx = -Math.abs(f.p.vx); }

          const inGoalX = Math.abs(f.p.x - 0.5) < GOAL_HALF;
          if (f.p.y < R_PUCK) {
            if (inGoalX) { scored(me.id); } else { f.p.y = R_PUCK; f.p.vy = Math.abs(f.p.vy); }
          }
          if (f.p.y > 1 - R_PUCK) {
            if (inGoalX) { scored(partner.id); } else { f.p.y = 1 - R_PUCK; f.p.vy = -Math.abs(f.p.vy); }
          }

          for (const pad of [f.h, f.g]) {
            const dx = f.p.x - pad.x;
            const dy = (f.p.y - pad.y) * 1.5;
            const d = Math.hypot(dx, dy);
            if (d < R_PUCK + R_PAD && d > 0) {
              const nx = dx / d, ny = dy / d;
              const speed = Math.max(0.009, Math.hypot(f.p.vx, f.p.vy) * 1.06);
              f.p.vx = nx * speed;
              f.p.vy = ny * speed;
              f.p.x = pad.x + nx * (R_PUCK + R_PAD) * 1.02;
              f.p.y = pad.y + ny * (R_PUCK + R_PAD) * 1.02;
            }
          }
          const sp = Math.hypot(f.p.vx, f.p.vy);
          if (sp > 0.03) { f.p.vx *= 0.03 / sp; f.p.vy *= 0.03 / sp; }
          if (sp < 0.004) { f.p.vy += f.p.vy >= 0 ? 0.0004 : -0.0004; }
        }

        if (live && t - lastSend > 45) {
          lastSend = t;
          sendStream({ from: me.id, p: f.p, h: f.h });
        }
      } else {
        f.g = myPad.current;
        if (t - lastSend > 45) {
          lastSend = t;
          sendStream({ from: me.id, g: f.g });
        }
      }

      draw();
    };

    const scored = (scorer: string) => {
      const f = frame.current;
      f.p = { x: 0.5, y: 0.5, vx: (Math.random() - 0.5) * 0.006, vy: scorer === me.id ? 0.008 : -0.008 };
      if (navigator.vibrate) navigator.vibrate(scorer === me.id ? [20, 40, 20] : 30);
      play({ type: "goal", scorer });
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = canvas.width, H = canvas.height;
      const f = frame.current;
      // my side is always the bottom of my screen
      const conv = (v: Vec) => (isHost ? { x: v.x, y: v.y } : { x: 1 - v.x, y: 1 - v.y });
      const puck = conv(f.p);
      const mine = conv(isHost ? f.h : f.g);
      const theirs = conv(isHost ? f.g : f.h);

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#12142a";
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(W / 2, H / 2, W * 0.16, 0, Math.PI * 2); ctx.stroke();

      // goals
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(120,170,255,0.55)";
      ctx.beginPath(); ctx.moveTo(W * (0.5 - GOAL_HALF), H - 3); ctx.lineTo(W * (0.5 + GOAL_HALF), H - 3); ctx.stroke();
      ctx.strokeStyle = "rgba(255,180,110,0.55)";
      ctx.beginPath(); ctx.moveTo(W * (0.5 - GOAL_HALF), 3); ctx.lineTo(W * (0.5 + GOAL_HALF), 3); ctx.stroke();

      const disc = (v: Vec, r: number, fill: string, glow: string) => {
        ctx.shadowBlur = 18; ctx.shadowColor = glow;
        ctx.fillStyle = fill;
        ctx.beginPath(); ctx.arc(v.x * W, v.y * H, r * W, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      };
      disc(theirs, R_PAD, "#ffb56b", "rgba(255,181,107,0.6)");
      disc(mine, R_PAD, "#78aaff", "rgba(120,170,255,0.6)");
      disc(puck, R_PUCK, "#f4f6ff", "rgba(255,255,255,0.5)");
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, live, difficulty, me.id, partner.id]);

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const lx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const ly = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    // clamp to my half (bottom of my own screen)
    const localY = Math.max(0.52, ly);
    myPad.current = isHost ? { x: lx, y: localY } : { x: 1 - lx, y: 1 - localY };
  };

  if (!s?.scores) return null;
  const myScore = s.scores[me.id] ?? 0;
  const theirScore = s.scores[partner.id] ?? 0;

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3 text-xs uppercase tracking-widest">
        <span className="text-me tabular-nums">you {myScore}</span>
        <span className="text-ink/40">first to {s.target}</span>
        <span className="text-them tabular-nums">{theirScore} {displayName(partner)}</span>
      </div>

      <div className="relative rounded-3xl overflow-hidden bg-night-3">
        <canvas
          ref={canvasRef}
          width={360}
          height={540}
          onPointerMove={move}
          onPointerDown={move}
          className="w-full touch-none block"
          style={{ aspectRatio: "2 / 3" }}
        />
        {s.done && (
          <div className="absolute inset-0 bg-night/85 grid place-items-center px-6 text-center">
            <div>
              
              <p className="mt-2 text-xl font-bold text-ink">
                {s.winner === me.id ? "You took it." : `${displayName(partner)} took it.`}
              </p>
              <div className="mt-5 flex gap-2">
                <button onClick={() => restart()} className="h-12 px-6 rounded-2xl bg-me text-night font-bold active:scale-95">
                  Rematch
                </button>
                <button onClick={() => leaveGame()} className="h-12 px-5 rounded-2xl bg-night-2 text-ink/70 font-semibold active:scale-95">
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <button onClick={() => leaveGame()} className="mx-auto mt-5 block text-[11px] font-bold uppercase tracking-[0.2em] text-ink/30 press">
        Leave game
      </button>
    </div>
  );
}
