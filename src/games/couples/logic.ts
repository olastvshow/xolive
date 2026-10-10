import type { GameAction, GmQuestion, GmState, Meta } from "../logic";
import { KNOW_US, THIS_OR_THAT, LIKELY, TRUTHS, DARES, SENTENCES, pickFresh } from "./banks";

export const COUPLES_KEYS = ["guess-me", "this-or-that", "likely", "truth-dare", "finish"] as const;
export const isCouplesKey = (k: string) => (COUPLES_KEYS as readonly string[]).includes(k);

// ---------- Truth or Dare ----------
export type TdCard = { kind: "truth" | "dare"; text: string };
export type TdState = {
  kind: "truth-dare";
  truths: string[];
  dares: string[];
  turn: string;
  round: number;
  rounds: number;
  current: TdCard | null;
  skips: Record<string, number>;
  log: (TdCard & { by: string; skipped?: boolean })[];
  done: boolean;
};

export function tdReduce(s: TdState, a: GameAction, m: Meta): TdState {
  if (s.done) throw new Error("Round is over");
  if (s.turn !== m.userId) throw new Error("Not your turn");
  const other = m.players.find((p) => p !== m.userId) ?? m.userId;
  const draw = (kind: "truth" | "dare", st: TdState) => {
    const deck = kind === "truth" ? st.truths : st.dares;
    if (!deck.length) throw new Error("No cards left");
    const [text, ...rest] = deck;
    return { card: { kind, text } as TdCard, rest };
  };
  if (a.type === "spin") {
    if (s.current) return s;
    const kind = a.kind === "dare" ? "dare" : "truth";
    const { card, rest } = draw(kind, s);
    return { ...s, current: card, [kind === "truth" ? "truths" : "dares"]: rest };
  }
  if (a.type === "skip") {
    if (!s.current) return s;
    if ((s.skips[m.userId] ?? 0) >= 1) throw new Error("No skips left");
    const { card, rest } = draw(s.current.kind, s);
    return {
      ...s, current: card, [card.kind === "truth" ? "truths" : "dares"]: rest,
      skips: { ...s.skips, [m.userId]: (s.skips[m.userId] ?? 0) + 1 },
      log: [...s.log, { ...s.current, by: m.userId, skipped: true }],
    };
  }
  if (a.type === "complete") {
    if (!s.current) return s;
    const round = s.round + 1;
    return {
      ...s, current: null, turn: other, round, done: round >= s.rounds,
      log: [...s.log, { ...s.current, by: m.userId }],
    };
  }
  return s;
}

// ---------- Finish the Sentence ----------
export type FsReaction = "heart" | "laugh" | "more";
export type FsState = {
  kind: "finish";
  prompts: string[];
  idx: number;
  writer: string;
  entries: { by: string; prompt: string; text: string; reaction: FsReaction | null }[];
  done: boolean;
};

export function fsReduce(s: FsState, a: GameAction, m: Meta): FsState {
  if (s.done) throw new Error("Round is over");
  const other = m.players.find((p) => p !== m.userId) ?? m.userId;
  const writing = s.entries.length === s.idx;
  if (a.type === "write") {
    if (!writing || m.userId !== s.writer) throw new Error("Not your turn to write");
    const text = String(a.text ?? "").trim().slice(0, 140);
    if (!text) throw new Error("Write something first");
    return { ...s, entries: [...s.entries, { by: m.userId, prompt: s.prompts[s.idx], text, reaction: null }] };
  }
  if (a.type === "react") {
    if (writing || m.userId === s.writer) throw new Error("Not your turn to react");
    const r = (["heart", "laugh", "more"] as const).find((x) => x === a.reaction);
    if (!r) throw new Error("Bad reaction");
    const entries = s.entries.slice();
    entries[s.idx] = { ...entries[s.idx], reaction: r };
    const idx = s.idx + 1;
    return { ...s, entries, idx, writer: m.userId === other ? s.writer : m.userId, done: idx >= s.prompts.length };
  }
  return s;
}

// ---------- builders (shared by solo and the server) ----------
export function buildCouplesState(gameKey: string, players: string[], subjectFirst: string, seen: Set<string>) {
  const [a, b] = players;
  const other = players.find((p) => p !== subjectFirst) ?? b;
  if (gameKey === "guess-me") {
    const { items, reset } = pickFresh(KNOW_US, (q) => q.prompt, seen, 10);
    const questions: GmQuestion[] = items.map((q, i) => ({ ...q, subject: i % 2 === 0 ? subjectFirst : other }));
    return { state: { kind: "guess-me", ...gmBase(questions) } as GmState, used: items.map((q) => q.prompt), reset };
  }
  if (gameKey === "this-or-that") {
    const { items, reset } = pickFresh(THIS_OR_THAT, (p) => p.join("|"), seen, 15);
    const questions: GmQuestion[] = items.map(([x, y]) => ({ category: "This or That", prompt: `${x} or ${y}?`, options: [x, y], subject: a }));
    return { state: { kind: "this-or-that", ...gmBase(questions) } as GmState, used: items.map((p) => p.join("|")), reset };
  }
  if (gameKey === "likely") {
    const { items, reset } = pickFresh(LIKELY, (p) => p, seen, 12);
    const questions: GmQuestion[] = items.map((p) => ({ category: "Who's more likely", prompt: `Who's more likely to ${p}?`, options: ["{s}", "{o}"], subject: a }));
    return { state: { kind: "likely", ...gmBase(questions) } as GmState, used: items, reset };
  }
  if (gameKey === "truth-dare") {
    const t = pickFresh(TRUTHS, (x) => `t:${x}`, seen, 12);
    const d = pickFresh(DARES, (x) => `d:${x}`, seen, 12);
    const state: TdState = {
      kind: "truth-dare", truths: t.items, dares: d.items, turn: subjectFirst, round: 0, rounds: 10,
      current: null, skips: {}, log: [], done: false,
    };
    return { state, used: [...t.items.map((x) => `t:${x}`), ...d.items.map((x) => `d:${x}`)], reset: t.reset || d.reset };
  }
  if (gameKey === "finish") {
    const { items, reset } = pickFresh(SENTENCES, (p) => p, seen, 6);
    const state: FsState = { kind: "finish", prompts: items, idx: 0, writer: subjectFirst, entries: [], done: false };
    return { state, used: items, reset };
  }
  throw new Error("Unknown game");
}

function gmBase(questions: GmQuestion[]) {
  return { questions, idx: 0, answers: {}, revealed: false, score: 0, done: false };
}

/** Resolve {s}/{o} tokens for the person viewing. */
export function resolveOption(text: string, subject: string, viewer: string, myName: string, partnerName: string) {
  const subjectName = subject === viewer ? myName : partnerName;
  const otherName = subject === viewer ? partnerName : myName;
  return text.replaceAll("{s}", subjectName).replaceAll("{o}", otherName);
}
