import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/solo")({
  head: () => ({ meta: [{ title: "XO Live — Play vs Computer" }] }),
  component: SoloPage,
});

type Cell = "X" | "O" | null;
type Difficulty = "easy" | "medium" | "hard";

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(b: Cell[]): { winner: "X" | "O" | null; line: number[] | null; draw: boolean } {
  for (const line of LINES) {
    const [a, b1, c] = line;
    if (b[a] && b[a] === b[b1] && b[a] === b[c]) return { winner: b[a], line, draw: false };
  }
  return { winner: null, line: null, draw: b.every((c) => c !== null) };
}

// Minimax with alpha-beta — perfect player ("hard")
function minimax(board: Cell[], aiMark: "X" | "O", isAi: boolean, alpha: number, beta: number, depth: number): number {
  const { winner, draw } = checkWinner(board);
  if (winner === aiMark) return 10 - depth;
  if (winner && winner !== aiMark) return depth - 10;
  if (draw) return 0;

  const mark = isAi ? aiMark : (aiMark === "X" ? "O" : "X");
  let best = isAi ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    board[i] = mark;
    const score = minimax(board, aiMark, !isAi, alpha, beta, depth + 1);
    board[i] = null;
    if (isAi) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, score);
    }
    if (beta <= alpha) break;
  }
  return best;
}

function bestMove(board: Cell[], aiMark: "X" | "O"): number {
  let best = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    board[i] = aiMark;
    const score = minimax(board, aiMark, false, -Infinity, Infinity, 0);
    board[i] = null;
    if (score > best) { best = score; move = i; }
  }
  return move;
}

function randomMove(board: Cell[]): number {
  const empty = board.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
  return empty[Math.floor(Math.random() * empty.length)];
}

function pickAiMove(board: Cell[], aiMark: "X" | "O", diff: Difficulty): number {
  if (diff === "easy") return randomMove(board);
  if (diff === "medium") return Math.random() < 0.55 ? bestMove(board, aiMark) : randomMove(board);
  return bestMove(board, aiMark);
}

function SoloPage() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [score, setScore] = useState({ you: 0, cpu: 0, draws: 0 });
  const [round, setRound] = useState(1);
  const youMark: "X" = "X";
  const aiMark: "O" = "O";

  const result = useMemo(() => checkWinner(board), [board]);
  const finished = !!result.winner || result.draw;

  // AI move
  useEffect(() => {
    if (finished || turn !== aiMark) return;
    const t = setTimeout(() => {
      setBoard((prev) => {
        const next = [...prev];
        const idx = pickAiMove(next, aiMark, difficulty);
        if (idx >= 0) next[idx] = aiMark;
        return next;
      });
      setTurn(youMark);
    }, 380);
    return () => clearTimeout(t);
  }, [turn, finished, difficulty]);

  // Score
  useEffect(() => {
    if (!finished) return;
    setScore((s) => ({
      you: s.you + (result.winner === youMark ? 1 : 0),
      cpu: s.cpu + (result.winner === aiMark ? 1 : 0),
      draws: s.draws + (result.draw ? 1 : 0),
    }));
  }, [finished]); // eslint-disable-line

  const onCell = (i: number) => {
    if (finished || board[i] || turn !== youMark) return;
    const next = [...board];
    next[i] = youMark;
    setBoard(next);
    setTurn(aiMark);
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setTurn(round % 2 === 0 ? aiMark : youMark);
    setRound((r) => r + 1);
  };
  const resetAll = () => {
    setBoard(Array(9).fill(null));
    setTurn(youMark);
    setRound(1);
    setScore({ you: 0, cpu: 0, draws: 0 });
  };

  return (
    <div className="min-h-[100dvh] bg-surface text-on-surface flex flex-col">
      <header className="flex items-center justify-between px-3 pt-3 pb-2">
        <button onClick={() => navigate({ to: "/" })} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
          <Icon name="arrow_back" />
        </button>
        <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-full">
          <Icon name="smart_toy" filled className="text-primary text-[16px]" />
          <span className="text-[11px] font-bold tracking-wider text-on-surface-variant">VS COMPUTER · ROUND {round}</span>
        </div>
        <button onClick={resetAll} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center" aria-label="Reset scores">
          <Icon name="restart_alt" />
        </button>
      </header>

      <section className="px-3 pb-2">
        <div className="flex gap-2">
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => {
            const active = difficulty === d;
            return (
              <button
                key={d}
                onClick={() => { setDifficulty(d); resetAll(); }}
                className={cn(
                  "flex-1 py-2 rounded-2xl text-sm font-bold capitalize transition active:scale-95",
                  active ? "bg-primary text-on-primary shadow-[0_4px_0_#394086]" : "bg-surface-container text-on-surface-variant",
                )}
              >
                {d}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex items-stretch justify-between gap-1.5 px-3">
        <PlayerCard name="You" mark="X" score={score.you} active={turn === youMark && !finished} side="left" />
        <div className="shrink-0 self-stretch flex flex-col items-center justify-center px-3 py-1.5 rounded-2xl bg-inverse-surface text-white">
          <div className="flex items-baseline gap-1.5 leading-none">
            <span className="text-2xl font-black text-primary-container tabular-nums">{score.you}</span>
            <span className="text-sm font-bold opacity-50">:</span>
            <span className="text-2xl font-black text-tertiary-container tabular-nums">{score.cpu}</span>
          </div>
          <div className="mt-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/10">
            <span className="text-[9px] font-bold tracking-widest opacity-70">DRAWS</span>
            <span className="text-[11px] font-black tabular-nums">{score.draws}</span>
          </div>
        </div>
        <PlayerCard name="CPU" mark="O" score={score.cpu} active={turn === aiMark && !finished} side="right" />
      </section>

      <section className="flex-1 min-h-0 flex items-center justify-center px-4 py-4">
        <div className="bg-primary-container/60 p-3 rounded-3xl shadow-[0_10px_0_-2px_rgba(57,64,134,0.25)] border-2 border-primary/20 aspect-square"
          style={{ width: "min(100%, calc(100dvh - 360px), 360px)" }}>
          <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full h-full">
            {board.map((c, i) => {
              const isWin = result.line?.includes(i);
              const playable = !c && !finished && turn === youMark;
              return (
                <button
                  key={i}
                  onClick={() => onCell(i)}
                  disabled={!playable}
                  className={cn(
                    "rounded-2xl flex items-center justify-center transition-all active:scale-95",
                    "bg-surface shadow-[inset_0_-3px_0_rgba(57,64,134,0.12),0_2px_0_rgba(57,64,134,0.08)]",
                    isWin && "bg-secondary-container ring-2 ring-secondary",
                    !playable && !c && "opacity-70",
                  )}
                >
                  {c === "X" && <Icon name="close" className="text-primary" style={{ fontSize: "min(13vw, 56px)", fontVariationSettings: '"wght" 700' }} />}
                  {c === "O" && <Icon name="radio_button_unchecked" className="text-tertiary" style={{ fontSize: "min(12vw, 52px)", fontVariationSettings: '"wght" 700' }} />}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="px-3 pb-4 pt-1">
        {finished ? (
          <div className="space-y-2">
            <div className={cn(
              "rounded-2xl px-4 py-3 text-center font-bold",
              result.winner === youMark && "bg-primary text-on-primary",
              result.winner === aiMark && "bg-error text-on-error",
              result.draw && "bg-surface-container text-on-surface",
            )}>
              {result.winner === youMark && "🏆 You win this round!"}
              {result.winner === aiMark && "💀 The computer wins"}
              {result.draw && "🤝 Draw"}
            </div>
            <button onClick={reset} className="bubbly w-full bg-secondary text-on-secondary py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_5px_0_#26288c] font-bold">
              <Icon name="replay" filled /> Next round
            </button>
          </div>
        ) : (
          <p className="text-center text-sm font-semibold text-on-surface-variant">
            {turn === youMark ? "Your turn — tap a square" : "Computer is thinking…"}
          </p>
        )}
      </div>
    </div>
  );
}

function PlayerCard({ name, mark, score, active, side }: { name: string; mark: "X" | "O"; score: number; active: boolean; side: "left" | "right" }) {
  const accent = mark === "X" ? "text-primary" : "text-tertiary";
  return (
    <div className={cn(
      "flex-1 flex items-center gap-2 p-2 rounded-2xl border-2 transition relative min-w-0",
      side === "right" && "flex-row-reverse",
      active ? "bg-secondary text-on-secondary border-[#FFD700] scale-[1.02] shadow-[0_0_20px_rgba(255,215,0,0.45)]" : "bg-surface-container text-on-surface border-transparent",
    )}>
      <div className={cn("w-11 h-11 rounded-full bg-primary-container flex items-center justify-center font-black text-on-primary-container shrink-0 text-lg")}>
        {mark === "X" ? "🧑" : "🤖"}
      </div>
      <div className={cn("min-w-0 flex-1", side === "right" && "text-right")}>
        <div className="text-[11px] font-bold truncate uppercase tracking-wide">{name}</div>
        <div className={cn("flex items-baseline gap-1.5", side === "right" && "justify-end flex-row-reverse")}>
          <span className={cn("text-2xl font-black leading-none tabular-nums", active ? "text-on-secondary" : accent)}>{score}</span>
          <span className={cn("text-[10px] font-bold opacity-70 tracking-widest", accent)}>{mark}</span>
        </div>
      </div>
    </div>
  );
}
