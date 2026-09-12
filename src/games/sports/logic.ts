import { Body, Plane, Sphere, Vec3, World } from 'cannon-es';
import type { GameAction, Meta } from '../logic';

export type SportsKind = 'cup-pong' | 'table-tennis';
export type SportsState = {
  kind: SportsKind; phase: 'setup' | 'playing'; format: 'quick' | 'full'; ready: string[];
  target: number; scores: Record<string, number>; turn: string; server: string;
  cups: Record<string, number[]>; winner: string | null; done: boolean;
  seq: number; rally: number; landing: number; launchedAt: number;
  last: { by: string; x: number; z: number; hit: number | null; point: boolean } | null;
};
export function rack(count: number) {
  const rows = count === 10 ? 4 : 3;
  return Array.from({ length: count }, (_, id) => {
    let row = 0, first = 0;
    while (id >= first + row + 1) { first += row + 1; row++; }
    return { x: (id - first - row / 2) * .68, z: -1.8 - row * .6, id };
  });
}
export function sportsInit(players: string[], kind: SportsKind, format: 'quick' | 'full' = 'quick'): SportsState {
  const target = kind === 'cup-pong' ? format === 'quick' ? 6 : 10 : format === 'quick' ? 7 : 11;
  return { kind, format, phase: 'setup', ready: [], target, scores: Object.fromEntries(players.map(p => [p, 0])), turn: players[0], server: players[0], cups: Object.fromEntries(players.map(p => [p, Array.from({ length: target }, (_, i) => i)])), winner: null, done: false, seq: 0, rally: 0, landing: 0, launchedAt: 0, last: null };
}
export function cupLanding(aim: number, power: number) {
  // Fixed-step ballistic simulation, shared with the server. Clients never submit a hit or score.
  const world = new World({ gravity: new Vec3(0, -9.82, 0) });
  const ball = new Body({ mass: .0027, shape: new Sphere(.075), position: new Vec3(0, 1.6, 3) });
  ball.linearDamping = 0;
  ball.velocity.set(aim * 2.8, 5.6, -(4.7 + power * 2.8));
  world.addBody(ball);
  let old = ball.position.clone();
  for (let i = 0; i < 240; i++) {
    old.copy(ball.position); world.step(1 / 120);
    if (ball.position.y < .62 && ball.velocity.y < 0) {
      const t = (old.y - .62) / (old.y - ball.position.y);
      return { x: old.x + (ball.position.x - old.x) * t, z: old.z + (ball.position.z - old.z) * t };
    }
  }
  return { x: ball.position.x, z: ball.position.z };
}
function number(v: unknown, min: number, max: number) { if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new Error('Invalid shot'); return v; }
export function sportsReduce(s: SportsState, a: GameAction, m: Meta & { now?: number }): SportsState {
  if (!m.players.includes(m.userId)) throw new Error('Not your match');
  if (s.done) throw new Error('Match finished');
  if (a.type === 'format') {
    if (s.phase !== 'setup' || m.userId !== m.players[0] || s.ready.length) throw new Error('Match already configured');
    if (a.format !== 'quick' && a.format !== 'full') throw new Error('Invalid match length');
    return sportsInit(m.players, s.kind, a.format);
  }
  if (a.type === 'ready') {
    if (s.phase !== 'setup') return s;
    const ready = [...new Set([...s.ready, m.userId])];
    return { ...s, ready, phase: m.players.every(p => ready.includes(p)) ? 'playing' : 'setup' };
  }
  if (s.phase !== 'playing') throw new Error('Both players must be ready');
  if (a.seq !== s.seq) throw new Error('Shot already played');
  const now = m.now ?? Date.now();
  const other = m.players.find(p => p !== s.turn) ?? m.players[0];
  if (s.kind === 'cup-pong') {
    if (a.type !== 'throw' || m.userId !== s.turn) throw new Error('Wait for your turn');
    const land = cupLanding(number(a.aim, -1, 1), number(a.power, 0, 1));
    const hit = rack(s.target).find(c => s.cups[other].includes(c.id) && Math.hypot(c.x - land.x, c.z - land.z) < .235)?.id ?? null;
    const cups = { ...s.cups, [other]: s.cups[other].filter(id => id !== hit) };
    const scores = { ...s.scores, [m.userId]: s.scores[m.userId] + (hit === null ? 0 : 1) };
    const done = cups[other].length === 0;
    return { ...s, cups, scores, done, winner: done ? m.userId : null, turn: other, seq: s.seq + 1, last: { by: m.userId, ...land, hit, point: hit !== null } };
  }
  let scorer: string | null = null;
  if (a.type === 'timeout') {
    if (!s.launchedAt || now - s.launchedAt < 2600 || m.userId !== other) throw new Error('Rally is still in play');
    scorer = other;
  } else {
    if (m.userId !== s.turn || (a.type !== 'serve' && a.type !== 'return')) throw new Error('Wait for the ball');
    const x = number(a.x, -1.4, 1.4);
    const aim = number(a.aim, -1.2, 1.2);
    if (s.launchedAt) {
      const elapsed = now - s.launchedAt;
      if (elapsed < 1100) throw new Error('Ball has not reached you');
      if (elapsed > 2500 || Math.abs(x - s.landing) > .42) scorer = other;
    } else if (a.type !== 'serve') throw new Error('Serve first');
    if (!scorer) return { ...s, turn: other, rally: s.rally + 1, landing: aim, launchedAt: now, seq: s.seq + 1, last: { by: m.userId, x: aim, z: -3, hit: null, point: false } };
  }
  const scores = { ...s.scores, [scorer]: s.scores[scorer] + 1 };
  const loser = m.players.find(p => p !== scorer) ?? s.turn;
  const done = scores[scorer] >= s.target && scores[scorer] - scores[loser] >= 2;
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const deuce = m.players.every(p => scores[p] >= s.target - 1);
  const server = m.players[(deuce ? total : Math.floor(total / 2)) % 2];
  return { ...s, scores, done, winner: done ? scorer : null, server, turn: server, launchedAt: 0, rally: 0, seq: s.seq + 1, last: { by: scorer, x: 0, z: 0, hit: null, point: true } };
}
export function sportsBot(s: SportsState, bot: string): GameAction | null {
  if (s.done) return null;
  if (s.phase === 'setup') return s.ready.length ? { type: 'ready' } : null;
  if (s.turn !== bot) return null;
  if (s.kind === 'cup-pong') {
    const opponent = Object.keys(s.cups).find(p => p !== bot) ?? '';
    const options = rack(s.target).filter(c => s.cups[opponent]?.includes(c.id));
    const c = options[Math.floor(Math.random() * options.length)];
    if (!c) return null;
    let best = { aim: 0, power: 0, distance: Infinity };
    for (let power = 0; power <= 1; power += .025) {
      const base = cupLanding(0, power); const aim = c.x / 3.64;
      const d = Math.abs(base.z - c.z);
      if (d < best.distance) best = { aim, power, distance: d };
    }
    return { type: 'throw', seq: s.seq, aim: Math.max(-1, Math.min(1, best.aim + (Math.random() - .5) * .13)), power: Math.max(0, Math.min(1, best.power + (Math.random() - .5) * .14)) };
  }
  return { type: s.launchedAt ? 'return' : 'serve', seq: s.seq, x: Math.max(-1.4, Math.min(1.4, s.landing + (Math.random() < .17 ? .7 : (Math.random() - .5) * .3))), aim: (Math.random() - .5) * 2.3 };
}
