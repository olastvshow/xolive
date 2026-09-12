import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import { Button } from '@/components/ui/button';
import { usePlay, displayName } from '../play-context';
import { rack, type SportsState } from './logic';
import { BALL_RADIUS, CUP_TOP, clamp, frameAt, gesture, type Sample } from './motion';
import { Stage3D } from './Stage3D';
import { MatchSetup } from './MatchSetup';
import { Cup, Paddle, Table } from './Models';

/** Draws the exact trajectory the match rules resolved, so what you see is what scored. */
function Ball({ state, me }: { state: SportsState; me: string }) {
  const ref = useRef<Mesh>(null); const start = useRef(0); const seq = useRef(-1);
  useFrame(({ clock }) => {
    const ball = ref.current; if (!ball) return;
    if (seq.current !== state.seq) { seq.current = state.seq; start.current = clock.elapsedTime; }
    const shot = state.last; const elapsed = clock.elapsedTime - start.current;
    const direction = shot?.by === me ? 1 : -1;
    if (!shot || (shot.point && state.kind === 'table-tennis')) { ball.position.set(0, .9, 2.9); ball.visible = true; return; }
    if (state.kind === 'cup-pong') {
      const frames = shot.frames;
      if (!frames?.length) { ball.visible = false; return; }
      const pos = frameAt(frames, elapsed);
      ball.position.set(pos.x * direction, pos.y, pos.z * direction);
      ball.visible = elapsed < (shot.duration ?? 1.8) + .9;
      return;
    }
    const t = Math.min(1, elapsed / 1.9);
    ball.position.set(shot.x * t * direction, .28 + Math.abs(Math.sin(t * Math.PI * 2)) * .95, (3 - 6 * t) * direction);
    ball.visible = true;
  });
  return <mesh ref={ref} castShadow><sphereGeometry args={[BALL_RADIUS, 26, 18]} /><meshStandardMaterial color="#fff8e7" roughness={.35} /></mesh>;
}

export default function SportsGame() {
  const p = usePlay(); const s = p.state as SportsState; const tennis = s.kind === 'table-tennis';
  const [paddle, setPaddle] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [locked, setLocked] = useState(false);
  const drag = useRef<{ id: number; samples: Sample[] } | null>(null);
  const control = useRef({ aim: 0, power: .45, paddle: 0, origin: 0 });
  const mine = s.turn === p.me.id;
  const flight = (s.last?.duration ?? 1.6) * 1000 + 500;
  const frozen = p.busy || locked || (p.live && !p.partnerOnline);

  useEffect(() => { if (!s.seq || tennis) return; setLocked(true); const t = setTimeout(() => setLocked(false), flight); return () => clearTimeout(t); }, [s.seq, tennis, flight]);
  useEffect(() => { if (!tennis || s.phase !== 'playing') return; const timer = setInterval(() => setClock(Date.now()), 75); return () => clearInterval(timer); }, [tennis, s.phase]);
  useEffect(() => { if (!p.live || !tennis || !s.launchedAt || mine || clock - s.launchedAt < 2800 || p.busy) return; p.play({ type: 'timeout', seq: s.seq }); }, [clock, s.seq, s.launchedAt, mine, tennis, p.live, p.busy]);

  const stroke = () => {
    if (frozen || !mine) return;
    const c = control.current;
    p.play(tennis
      ? { type: s.launchedAt ? 'return' : 'serve', seq: s.seq, x: c.paddle, aim: clamp(c.aim * 1.2, -1.2, 1.2), power: c.power }
      : { type: 'throw', seq: s.seq, aim: c.aim, power: c.power, origin: c.origin });
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const c = control.current;
      if (e.key === 'ArrowLeft') { c.aim = clamp(c.aim - .07, -1, 1); c.paddle = clamp(c.paddle - .18, -1.4, 1.4); setPaddle(c.paddle); }
      if (e.key === 'ArrowRight') { c.aim = clamp(c.aim + .07, -1, 1); c.paddle = clamp(c.paddle + .18, -1.4, 1.4); setPaddle(c.paddle); }
      if (e.key === 'ArrowUp') c.power = clamp(c.power + .06, 0, 1);
      if (e.key === 'ArrowDown') c.power = clamp(c.power - .06, 0, 1);
      if (e.code === 'Space') { e.preventDefault(); stroke(); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  if (s.phase === 'setup') return <MatchSetup state={s} canChoose={p.me.id === p.players[0] && !s.ready.length && !p.busy} iAmReady={s.ready.includes(p.me.id) || p.busy} waiting={p.live} onFormat={format => p.play({ type: 'format', format })} onReady={() => p.play({ type: 'ready' })} />;

  const elapsed = clock - s.launchedAt;
  const hitWindow = mine && s.launchedAt > 0 && elapsed >= 900 && elapsed <= 2500;
  const sample = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, t: performance.now() };
  };

  return <section className="sports-fullscreen" aria-label={tennis ? 'Table Tennis match' : 'Cup Pong match'}>
    <div className="mx-auto flex max-w-md items-center justify-between gap-4 px-5 pb-3">
      <div className="min-w-0 flex-1"><p className="truncate text-sm text-ink/60">You</p><strong className="font-display text-3xl text-pop">{s.scores[p.me.id]}</strong></div>
      <div className="text-center"><p className="text-xs uppercase text-ink/40">{s.format} · {s.target}{tennis ? ' points' : ' cups'}</p>
        <p role="status" className="text-sm font-bold text-ink">{tennis ? (s.launchedAt ? `Rally ${s.rally}` : mine ? 'Tap, then flick to serve' : 'Opponent serves') : mine ? 'Flick to throw' : `${displayName(p.partner)} throws`}</p></div>
      <div className="min-w-0 flex-1 text-right"><p className="truncate text-sm text-ink/60">{displayName(p.partner)}</p><strong className="font-display text-3xl text-xo">{s.scores[p.partner.id]}</strong></div>
    </div>
    <div
      className="sports-touch-stage touch-none"
      onPointerDown={e => {
        if (drag.current) return;
        const point = sample(e);
        drag.current = { id: e.pointerId, samples: [point] };
        e.currentTarget.setPointerCapture(e.pointerId);
        const x = clamp((point.x - .5) * 3, -1.4, 1.4);
        if (tennis) { control.current.paddle = x; setPaddle(x); } else control.current.origin = clamp(x, -1.2, 1.2);
      }}
      onPointerMove={e => {
        const current = drag.current; if (!current || current.id !== e.pointerId) return;
        current.samples = [...current.samples, sample(e)].slice(-16);
        const g = gesture(current.samples);
        control.current.aim = g.aim; control.current.power = g.power;
        if (tennis) { const x = clamp((current.samples[current.samples.length - 1].x - .5) * 3, -1.4, 1.4); control.current.paddle = x; setPaddle(x); }
      }}
      onPointerUp={e => {
        const current = drag.current; if (!current || current.id !== e.pointerId) return;
        const samples = [...current.samples, sample(e)];
        drag.current = null;
        const g = gesture(samples);
        control.current.aim = g.aim;
        control.current.power = tennis ? Math.max(.12, g.power) : g.power;
        if (tennis ? (!s.launchedAt || hitWindow) : g.power > .04) stroke();
      }}
      onPointerCancel={() => { drag.current = null; }}
    >
      <Stage3D camera={tennis ? [0, 8.3, 8.4] : [0, 8.6, 8]} background="#202c35">
        <Table tennis={tennis} />
        {tennis
          ? <><Paddle x={paddle} z={3.2} /><Paddle x={s.landing} z={-3.2} blue /></>
          : rack(s.target).map(c => {
            const mid = locked && s.last?.hit === c.id;
            const theirs = s.cups[p.partner.id]?.includes(c.id) || (mid && s.last?.by === p.me.id);
            const ours = s.cups[p.me.id]?.includes(c.id) || (mid && s.last?.by !== p.me.id);
            return <group key={c.id}>{theirs && <Cup x={c.x} z={c.z} />}{ours && <Cup x={-c.x} z={-c.z} blue />}</group>;
          })}
        <Ball state={s} me={p.me.id} />
      </Stage3D>
    </div>
    <div className="sports-exit"><Button variant="ghost" onClick={() => void p.leaveGame()}>Leave game</Button></div>
  </section>;
}
