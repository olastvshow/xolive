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

// ===================== Sudoku Duo (co-op) =====================

export type SudokuState = {
  given: (number | null)[];
  solution: number[];
  cells: (number | null)[];
  owner: (string | null)[];
  mistakes: Record<string, number>;
  done: boolean;
};

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fillGrid(g: number[]): boolean {
  const i = g.indexOf(0);
  if (i === -1) return true;
  const r = Math.floor(i / 9), c = i % 9;
  for (const v of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    let ok = true;
    for (let k = 0; k < 9; k++) {
      if (g[r * 9 + k] === v || g[k * 9 + c] === v) { ok = false; break; }
    }
    if (ok) {
      const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (let a = 0; a < 3 && ok; a++) for (let b = 0; b < 3; b++) {
        if (g[(br + a) * 9 + bc + b] === v) { ok = false; break; }
      }
    }
    if (!ok) continue;
    g[i] = v;
    if (fillGrid(g)) return true;
    g[i] = 0;
  }
  return false;
}

export function makeSudoku(holes = 44): { given: (number | null)[]; solution: number[] } {
  const grid = Array<number>(81).fill(0);
  fillGrid(grid);
  const solution = grid.slice();
  const given: (number | null)[] = solution.slice();
  const order = shuffled(Array.from({ length: 81 }, (_, i) => i));
  for (let n = 0; n < holes; n++) given[order[n]] = null;
  return { given, solution };
}

export function sudokuInit(given: (number | null)[], solution: number[]): SudokuState {
  return {
    given,
    solution,
    cells: given.slice(),
    owner: Array(81).fill(null),
    mistakes: {},
    done: false,
  };
}

export function sudokuReduce(state: SudokuState, action: GameAction, meta: Meta): SudokuState {
  if (action.type !== "fill") return state;
  if (state.done) throw new Error("Puzzle is finished");
  const cell = Number(action.cell);
  const value = Number(action.value);
  if (!Number.isInteger(cell) || cell < 0 || cell > 80) throw new Error("Bad cell");
  if (!Number.isInteger(value) || value < 1 || value > 9) throw new Error("Bad value");
  if (state.given[cell] !== null || state.cells[cell] !== null) throw new Error("Cell already set");

  if (state.solution[cell] !== value) {
    const mistakes = { ...state.mistakes };
    mistakes[meta.userId] = (mistakes[meta.userId] ?? 0) + 1;
    return { ...state, mistakes };
  }
  const cells = state.cells.slice();
  const owner = state.owner.slice();
  cells[cell] = value;
  owner[cell] = meta.userId;
  return { ...state, cells, owner, done: cells.every((c) => c !== null) };
}

// ===================== Bottle Rush (reaction duel) =====================

export type RushRound = { target: number; delay: number };

export type RushState = {
  rounds: RushRound[];
  idx: number;
  phase: "spin" | "live" | "result";
  scores: Record<string, number>;
  winner: string | null;
  locked: string[];
  done: boolean;
};

export function makeRushRounds(count = 7): RushRound[] {
  return Array.from({ length: count }, () => ({
    target: Math.floor(Math.random() * 4),
    delay: 900 + Math.floor(Math.random() * 2200),
  }));
}

export function rushInit(rounds: RushRound[], players: string[]): RushState {
  const scores: Record<string, number> = {};
  players.forEach((p) => { scores[p] = 0; });
  return { rounds, idx: 0, phase: "spin", scores, winner: null, locked: [], done: false };
}

export function rushReduce(state: RushState, action: GameAction, meta: Meta): RushState {
  if (state.done) throw new Error("Match is over");

  if (action.type === "go") {
    if (state.phase !== "spin") return state;
    return { ...state, phase: "live" };
  }

  if (action.type === "tap") {
    if (state.phase !== "live") return state;
    if (state.locked.includes(meta.userId)) return state;
    const idx = Number(action.idx);
    const round = state.rounds[state.idx];
    if (idx !== round.target) {
      return { ...state, locked: [...state.locked, meta.userId] };
    }
    const scores = { ...state.scores };
    scores[meta.userId] = (scores[meta.userId] ?? 0) + 1;
    const needed = Math.floor(state.rounds.length / 2) + 1;
    const done = scores[meta.userId] >= needed;
    return { ...state, phase: "result", scores, winner: meta.userId, done };
  }

  if (action.type === "next") {
    if (state.phase !== "result") return state;
    const nextIdx = state.idx + 1;
    if (nextIdx >= state.rounds.length) return { ...state, done: true };
    return { ...state, idx: nextIdx, phase: "spin", winner: null, locked: [] };
  }

  if (action.type === "miss") {
    if (state.phase !== "live") return state;
    return { ...state, phase: "result", winner: null };
  }

  return state;
}

export function rushLeader(state: RushState, players: string[]): string | null {
  const [a, b] = players;
  const sa = state.scores[a] ?? 0, sb = state.scores[b] ?? 0;
  if (sa === sb) return null;
  return sa > sb ? a : b;
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
  if (gameKey === "sudoku") return sudokuReduce(state as SudokuState, action, meta);
  if (gameKey === "bottle-rush") return rushReduce(state as RushState, action, meta);
  if (gameKey === "air-hockey") return hockeyReduce(state as HockeyState, action, meta);
  throw new Error("Unknown game");
}

export const GAME_KEYS = ["xo", "guess-me", "sudoku", "bottle-rush", "air-hockey"] as const;
export type GameKey = (typeof GAME_KEYS)[number];

