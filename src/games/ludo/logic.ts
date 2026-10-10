import type { GameAction, GmQuestion, Meta } from "../logic";

/**
 * Ludo for two. Progress per piece: -1 = base, 0..50 = shared track
 * (relative to the owner's start), 51..55 = home column, 56 = home.
 */
export const HOME = 56;
export const TRACK = 52;
/** absolute track squares where nobody can be cut */
export const SAFE = [0, 8, 13, 21, 26, 34, 39, 47];
export const GATE_AFTER = 3;

type GateQ = { category: string; prompt: string; options: string[] };

export type LudoGate = { player: string; q: GmQuestion; answers: Record<string, number> };
export type LudoState = {
  kind: "ludo";
  starts: Record<string, number>;
  pieces: Record<string, number[]>;
  turn: string;
  dice: number | null;
  rollId: number;
  dry: Record<string, number>;
  gate: LudoGate | null;
  gateQs: GateQ[];
  lastGate: (LudoGate & { matched: boolean }) | null;
  last: { by: string; piece: number; from: number; to: number; captured: boolean } | null;
  note: string | null;
  winner: string | null;
};

export function ludoInit(players: string[], first: string, gateQs: GateQ[]): LudoState {
  const [a, b] = players;
  return {
    kind: "ludo",
    starts: { [a]: 0, [b]: 26 },
    pieces: { [a]: [-1, -1, -1, -1], [b]: [-1, -1, -1, -1] },
    turn: players.includes(first) ? first : a,
    dice: null,
    rollId: 0,
    dry: { [a]: 0, [b]: 0 },
    gate: null,
    gateQs,
    lastGate: null,
    last: null,
    note: null,
    winner: null,
  };
}

export const absOf = (start: number, p: number) => (start + p) % TRACK;

export function canMove(p: number, dice: number) {
  if (p === HOME) return false;
  if (p < 0) return dice === 6;
  return p + dice <= HOME;
}

export function movable(s: LudoState, uid: string) {
  if (s.dice === null) return [] as number[];
  return (s.pieces[uid] ?? []).map((p, i) => (canMove(p, s.dice!) ? i : -1)).filter((i) => i >= 0);
}

const otherOf = (m: Meta) => m.players.find((p) => p !== m.userId) ?? m.userId;

function endTurn(s: LudoState, m: Meta, extra: boolean): LudoState {
  const me = m.userId;
  const other = otherOf(m);
  if ((s.dry[me] ?? 0) >= GATE_AFTER && s.gateQs.length) {
    // Quiz Gate: three rolls without a six — answer one about your partner.
    const [q, ...rest] = s.gateQs;
    return {
      ...s, dice: null, gateQs: [...rest, q], dry: { ...s.dry, [me]: 0 },
      gate: { player: me, q: { ...q, subject: other }, answers: {} },
      note: "Quiz Gate open",
    };
  }
  return { ...s, dice: null, turn: extra ? me : other };
}

export function ludoReduce(s: LudoState, a: GameAction, m: Meta): LudoState {
  if (s.winner) throw new Error("Game is over");
  if (!m.players.includes(m.userId)) throw new Error("Not a player in this game");

  if (a.type === "answer") {
    if (!s.gate) throw new Error("No gate open");
    if (s.gate.answers[m.userId] !== undefined) return s;
    const opt = Number(a.option);
    if (!Number.isInteger(opt) || opt < 0 || opt >= s.gate.q.options.length) throw new Error("Bad option");
    const answers = { ...s.gate.answers, [m.userId]: opt };
    if (!m.players.every((p) => answers[p] !== undefined)) return { ...s, gate: { ...s.gate, answers } };
    const g = s.gate;
    const guesser = g.player;
    const matched = answers[g.q.subject] === answers[guesser];
    const other = m.players.find((p) => p !== guesser) ?? guesser;
    return {
      ...s, gate: null, lastGate: { ...g, answers, matched },
      turn: matched ? guesser : other,
      note: matched ? "Gate matched: bonus roll" : "No match this time",
    };
  }

  if (s.gate) throw new Error("Answer the Quiz Gate first");
  if (s.turn !== m.userId) throw new Error("Not your turn");

  if (a.type === "roll") {
    if (s.dice !== null) throw new Error("Move a piece first");
    const dice = 1 + Math.floor(Math.random() * 6);
    const dry = { ...s.dry, [m.userId]: dice === 6 ? 0 : (s.dry[m.userId] ?? 0) + 1 };
    const next: LudoState = { ...s, dice, dry, rollId: s.rollId + 1, note: null, lastGate: null };
    if (movable(next, m.userId).length === 0) {
      return endTurn({ ...next, note: dice === 6 ? null : "No move" }, m, false);
    }
    return next;
  }

  if (a.type === "move") {
    if (s.dice === null) throw new Error("Roll first");
    const i = Number(a.piece);
    const mine = s.pieces[m.userId];
    if (!mine || !Number.isInteger(i) || i < 0 || i > 3) throw new Error("Bad piece");
    const from = mine[i];
    if (!canMove(from, s.dice)) throw new Error("That piece cannot move");
    const to = from < 0 ? 0 : from + s.dice;
    const pieces = { ...s.pieces, [m.userId]: mine.map((p, k) => (k === i ? to : p)) };
    let captured = false;
    if (to <= 50) {
      const sq = absOf(s.starts[m.userId], to);
      if (!SAFE.includes(sq)) {
        const other = otherOf(m);
        const theirs = pieces[other].map((p) => {
          if (p >= 0 && p <= 50 && absOf(s.starts[other], p) === sq) { captured = true; return -1; }
          return p;
        });
        pieces[other] = theirs;
      }
    }
    const winner = pieces[m.userId].every((p) => p === HOME) ? m.userId : null;
    const next: LudoState = {
      ...s, pieces, winner,
      last: { by: m.userId, piece: i, from, to, captured },
      note: captured ? "Cut!" : to === HOME ? "Home" : null,
    };
    if (winner) return { ...next, dice: null };
    return endTurn(next, m, s.dice === 6 || captured || to === HOME);
  }

  return s;
}

/** Computer: capture > reach home > leave base > furthest piece. */
export function ludoBot(s: LudoState, botId: string): GameAction | null {
  if (s.winner) return null;
  if (s.gate) {
    if (s.gate.answers[botId] !== undefined) return null;
    return { type: "answer", option: Math.floor(Math.random() * s.gate.q.options.length) };
  }
  if (s.turn !== botId) return null;
  if (s.dice === null) return { type: "roll" };
  const opts = movable(s, botId);
  if (!opts.length) return null;
  const other = Object.keys(s.pieces).find((k) => k !== botId)!;
  const score = (i: number) => {
    const from = s.pieces[botId][i];
    const to = from < 0 ? 0 : from + s.dice!;
    if (to <= 50) {
      const sq = absOf(s.starts[botId], to);
      if (!SAFE.includes(sq) && s.pieces[other].some((p) => p >= 0 && p <= 50 && absOf(s.starts[other], p) === sq)) return 1000;
    }
    if (to === HOME) return 900;
    if (from < 0) return 800;
    return to;
  };
  const best = opts.sort((x, y) => score(y) - score(x))[0];
  return { type: "move", piece: best };
}
