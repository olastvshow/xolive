// Pure game reducers — shared by client (optimistic) and server (authoritative).

export type Mark = "X" | "O";

export type XoState = {
  board: (Mark | null)[];
  turn: Mark;
  marks: Record<string, Mark>;
  winner: string | null;
  draw: boolean;
  line: number[] | null;
  scores: Record<string, number>;
};

export type GmQuestion = { category: string; prompt: string; options: string[]; subject: string };

export type GmState = {
  questions: GmQuestion[];
  idx: number;
  answers: Record<string, Record<string, number>>;
  revealed: boolean;
  score: number;
  done: boolean;
};

export type GameAction = { type: string; [k: string]: unknown };
export type Meta = { userId: string; players: string[] };

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function xoInit(players: string[], starter?: string, scores?: Record<string, number>): XoState {
  const [a, b] = players;
  const first = starter && players.includes(starter) ? starter : a;
  const second = first === a ? b : a;
  return {
    board: Array(9).fill(null),
    turn: "X",
    marks: { [first]: "X", [second]: "O" },
    winner: null,
    draw: false,
    line: null,
    scores: scores ?? { [a]: 0, [b]: 0 },
  };
}

export function xoReduce(state: XoState, action: GameAction, meta: Meta): XoState {
  if (action.type === "rematch") {
    const prevSecond = Object.keys(state.marks).find((k) => state.marks[k] === "O") ?? meta.players[0];
    return xoInit(meta.players, prevSecond, state.scores);
  }
  if (action.type !== "play") return state;
  const cell = Number(action.cell);
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) throw new Error("Bad cell");
  if (state.winner || state.draw) throw new Error("Game is over");
  const mark = state.marks[meta.userId];
  if (!mark) throw new Error("Not a player in this game");
  if (mark !== state.turn) throw new Error("Not your turn");
  if (state.board[cell]) throw new Error("Cell taken");

  const board = state.board.slice();
  board[cell] = mark;

  let winner: string | null = null;
  let line: number[] | null = null;
  for (const l of LINES) {
    const [x, y, z] = l;
    if (board[x] && board[x] === board[y] && board[x] === board[z]) {
      winner = Object.keys(state.marks).find((k) => state.marks[k] === board[x]) ?? null;
      line = l;
      break;
    }
  }
  const draw = !winner && board.every((c) => c !== null);
  const scores = { ...state.scores };
  if (winner) scores[winner] = (scores[winner] ?? 0) + 1;

  return { ...state, board, line, winner, draw, scores, turn: state.turn === "X" ? "O" : "X" };
}

export function gmInit(questions: GmQuestion[]): GmState {
  return { questions, idx: 0, answers: {}, revealed: false, score: 0, done: false };
}

export function gmReduce(state: GmState, action: GameAction, meta: Meta): GmState {
  if (state.done) throw new Error("Round is over");
  const key = String(state.idx);

  if (action.type === "answer") {
    if (state.revealed) throw new Error("Already revealed");
    const option = Number(action.option);
    const q = state.questions[state.idx];
    if (!q || option < 0 || option >= q.options.length) throw new Error("Bad option");
    const forQ = { ...(state.answers[key] ?? {}) };
    if (forQ[meta.userId] !== undefined) return state;
    forQ[meta.userId] = option;
    const answers = { ...state.answers, [key]: forQ };
    const both = meta.players.every((p) => forQ[p] !== undefined);
    if (!both) return { ...state, answers };
    const subjectAnswer = forQ[q.subject];
    const guesser = meta.players.find((p) => p !== q.subject)!;
    const matched = subjectAnswer === forQ[guesser];
    return { ...state, answers, revealed: true, score: state.score + (matched ? 1 : 0) };
  }

  if (action.type === "next") {
    if (!state.revealed) throw new Error("Not revealed yet");
    const nextIdx = state.idx + 1;
    if (nextIdx >= state.questions.length) return { ...state, done: true, revealed: true };
    return { ...state, idx: nextIdx, revealed: false };
  }

  return state;
}

// ===================== Fill the Glass (nerve duel) =====================

export const GLASS_MAX = 100;
export const GLASS_MIN_POUR = 7;
export const GLASS_MAX_POUR = 19;

export type GlassState = {
  /** 0 – 100, where anything above 100 has splashed over the rim. */
  level: number;
  turn: string;
  /** pours the current player has made this turn */
  poured: number;
  lastPour: number;
  lastPourBy: string | null;
  splashed: boolean;
  loser: string | null;
  winner: string | null;
  scores: Record<string, number>;
};

function pourAmount() {
  return GLASS_MIN_POUR + Math.floor(Math.random() * (GLASS_MAX_POUR - GLASS_MIN_POUR + 1));
}

export function glassInit(players: string[], starter?: string, scores?: Record<string, number>): GlassState {
  const [a, b] = players;
  const first = starter && players.includes(starter) ? starter : a;
  return {
    level: 0,
    turn: first,
    poured: 0,
    lastPour: 0,
    lastPourBy: null,
    splashed: false,
    loser: null,
    winner: null,
    scores: scores ?? { [a]: 0, [b]: 0 },
  };
}

export function glassReduce(state: GlassState, action: GameAction, meta: Meta): GlassState {
  if (action.type === "rematch") {
    // The player who splashed pours first next round.
    return glassInit(meta.players, state.loser ?? state.turn, state.scores);
  }
  if (state.loser) throw new Error("Round is over");
  if (!meta.players.includes(meta.userId)) throw new Error("Not a player in this game");
  if (state.turn !== meta.userId) throw new Error("Not your turn");
  const other = meta.players.find((p) => p !== meta.userId) ?? meta.userId;

  if (action.type === "pour") {
    const amount = pourAmount();
    const level = state.level + amount;
    if (level > GLASS_MAX) {
      const scores = { ...state.scores };
      scores[other] = (scores[other] ?? 0) + 1;
      return {
        ...state,
        level: GLASS_MAX + 6,
        lastPour: amount,
        lastPourBy: meta.userId,
        splashed: true,
        loser: meta.userId,
        winner: other,
        scores,
      };
    }
    return { ...state, level, poured: state.poured + 1, lastPour: amount, lastPourBy: meta.userId };
  }

  if (action.type === "pass") {
    if (state.poured < 1) throw new Error("Pour at least once before passing");
    return { ...state, turn: other, poured: 0 };
  }

  return state;
}


// ===================== Air Hockey Live =====================

export type HockeyState = {
  scores: Record<string, number>;
  target: number;
  done: boolean;
  winner: string | null;
  serveTo: string | null;
};

export function hockeyInit(players: string[], target = 7): HockeyState {
  const scores: Record<string, number> = {};
  players.forEach((p) => { scores[p] = 0; });
  return { scores, target, done: false, winner: null, serveTo: players[0] ?? null };
}

export function hockeyReduce(state: HockeyState, action: GameAction, meta: Meta): HockeyState {
  if (action.type === "rematch") return hockeyInit(meta.players, state.target);
  if (action.type !== "goal") return state;
  if (state.done) throw new Error("Match is over");
  const scorer = String(action.scorer);
  if (!meta.players.includes(scorer)) throw new Error("Unknown scorer");
  const scores = { ...state.scores };
  scores[scorer] = (scores[scorer] ?? 0) + 1;
  const done = scores[scorer] >= state.target;
  const conceded = meta.players.find((p) => p !== scorer) ?? null;
  return { ...state, scores, done, winner: done ? scorer : null, serveTo: conceded };
}

export function applyAction(
  gameKey: string,
  state: unknown,
  action: GameAction,
  meta: Meta,
): unknown {
  if (gameKey === "xo") return xoReduce(state as XoState, action, meta);
  if (gameKey === "guess-me") return gmReduce(state as GmState, action, meta);
  if (gameKey === "fill-glass") return glassReduce(state as GlassState, action, meta);
  if (gameKey === "air-hockey") return hockeyReduce(state as HockeyState, action, meta);
  throw new Error("Unknown game");
}

export const GAME_KEYS = ["xo", "guess-me", "fill-glass", "air-hockey"] as const;
export type GameKey = (typeof GAME_KEYS)[number];

