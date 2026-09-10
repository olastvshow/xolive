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

export function applyAction(
  gameKey: string,
  state: unknown,
  action: GameAction,
  meta: Meta,
): unknown {
  if (gameKey === "xo") return xoReduce(state as XoState, action, meta);
  if (gameKey === "guess-me") return gmReduce(state as GmState, action, meta);
  throw new Error("Unknown game");
}
