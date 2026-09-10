import type { GameAction, Mark, XoState } from "@/games/logic";
import type { Difficulty } from "@/games/difficulty";

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

type Cell = Mark | null;

function outcome(b: Cell[]): { winner: Mark | null; draw: boolean } {
  for (const [x, y, z] of LINES) {
    if (b[x] && b[x] === b[y] && b[x] === b[z]) return { winner: b[x], draw: false };
  }
  return { winner: null, draw: b.every((c) => c !== null) };
}

function minimax(b: Cell[], mine: Mark, turn: Mark, alpha: number, beta: number, depth: number): number {
  const { winner, draw } = outcome(b);
  if (winner === mine) return 10 - depth;
  if (winner) return depth - 10;
  if (draw) return 0;

  const maxing = turn === mine;
  let best = maxing ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = turn;
    const score = minimax(b, mine, turn === "X" ? "O" : "X", alpha, beta, depth + 1);
    b[i] = null;
    if (maxing) { best = Math.max(best, score); alpha = Math.max(alpha, score); }
    else { best = Math.min(best, score); beta = Math.min(beta, score); }
    if (beta <= alpha) break;
  }
  return best;
}

export function xoBotMove(state: XoState, botId: string, difficulty: Difficulty): GameAction | null {
  if (state.winner || state.draw) return null;
  const mark = state.marks[botId];
  if (!mark || state.turn !== mark) return null;

  const board = state.board.slice() as Cell[];
  const empty = board.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
  if (!empty.length) return null;

  const blunder = difficulty === "easy" ? 0.55 : difficulty === "medium" ? 0.2 : 0;
  if (Math.random() < blunder) {
    return { type: "play", cell: empty[Math.floor(Math.random() * empty.length)] };
  }

  let bestScore = -Infinity;
  let bestCell = empty[0];
  for (const i of empty) {
    board[i] = mark;
    const score = minimax(board, mark, mark === "X" ? "O" : "X", -Infinity, Infinity, 1);
    board[i] = null;
    if (score > bestScore) { bestScore = score; bestCell = i; }
  }
  return { type: "play", cell: bestCell };
}
