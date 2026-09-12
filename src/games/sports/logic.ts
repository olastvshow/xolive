import { cupTrajectory, type Frame } from './motion';
import type { GameAction, Meta } from '../logic';

export type SportsKind = 'cup-pong' | 'table-tennis';
export type SportsState = {
  kind: SportsKind; phase: 'setup' | 'playing'; format: 'quick' | 'full'; ready: string[];
  target: number; scores: Record<string, number>; turn: string; server: string;
  cups: Record<string, number[]>; winner: string | null; done: boolean;
  seq: number; rally: number; landing: number; launchedAt: number;
  last: { by: string; x: number; z: number; hit: number | null; point: boolean; frames?: Frame[]; duration?: number; origin?: number; power?: number } | null;
};
export function rack(count: number) {
  const rows = count === 10 ? 4 : 3;
  return Array.from({ length: count }, (_, id) => {
    let row = 0, first = 0;
    while (id >= first + row + 1) { first += row + 1; row++; }
    return { x: (id - first - row / 2) * .91, z: -1.25 - row * .82, id };
  });
}
export function sportsInit(players: string[], kind: SportsKind, format: 'quick' | 'full' = 'quick'): SportsState {
  const target = kind === 'cup-pong' ? format === 'quick' ? 6 : 10 : format === 'quick' ? 7 : 11;
  return { kind, format, phase: 'setup', ready: [], target, scores: Object.fromEntries(players.map(p => [p, 0])), turn: players[0], server: players[0], cups: Object.fromEntries(players.map(p => [p, Array.from({ length: target }, (_, i) => i)])), winner: null, done: false, seq: 0, rally: 0, landing: 0, launchedAt: 0, last: null };
}
export function cupLanding(aim: number, power: number) {
  const { landing } = cupTrajectory(aim, power);
  return { x: landing.x, z: landing.z };
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
    if (s.launchedAt && now < s.launchedAt + (s.last?.duration ?? 1.8) * 1000) throw new Error('Ball still moving');
    const shot = cupTrajectory(number(a.aim, -1, 1), number(a.power, 0, 1), rack(s.target).filter(c => s.cups[other].includes(c.id)), a.origin === undefined ? 0 : number(a.origin, -1.2, 1.2));
    const land = shot.landing; const hit = shot.hit;
    const cups = { ...s.cups, [other]: s.cups[other].filter(id => id !== hit) };
    const scores = { ...s.scores, [m.userId]: s.scores[m.userId] + (hit === null ? 0 : 1) };
    const done = cups[other].length === 0;
    return { ...s, cups, scores, done, winner: done ? m.userId : null, turn: other, launchedAt: now, seq: s.seq + 1, last: { by: m.userId, x:land.x, z:land.z, hit, point: hit !== null, frames:shot.frames, duration:shot.duration } };
  }
  if(a.type !== 'physics-point' || m.userId !== m.players[0]) throw new Error('Only the host can resolve a rally');
  if(typeof a.scorer !== 'string' || !m.players.includes(a.scorer)) throw new Error('Invalid scorer');
  if(!['net','volley','wrong half','double bounce','missed return','out'].includes(String(a.reason))) throw new Error('Invalid point');
  const scorer = a.scorer;
  const scores = { ...s.scores, [scorer]: s.scores[scorer] + 1 };
  const loser = m.players.find(p => p !== scorer) ?? s.turn;
  const done = scores[scorer] >= s.target && scores[scorer] - scores[loser] >= 2;
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const deuce = m.players.every(p => scores[p] >= s.target - 1);
  const server = m.players[(deuce ? total : Math.floor(total / 2)) % 2];
  return { ...s, scores, done, winner: done ? scorer : null, server, turn: server, launchedAt: 0, rally: 0, seq: s.seq + 1, last: { by: scorer, x: 0, z: 0, hit: null, point: true } };
}
export function sportsBot(s: SportsState, bot: string, now = Date.now()): GameAction | null {
  if (s.done) return null;
  if (s.phase === 'setup') return s.ready.length ? { type: 'ready' } : null;
  if(s.kind==='table-tennis'||s.turn!==bot)return null;
  if(s.launchedAt && now < s.launchedAt+(s.last?.duration??1.8)*1000+900)return null;
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
  return null;
}
