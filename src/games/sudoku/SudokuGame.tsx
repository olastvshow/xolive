import { useState } from "react";
import { usePlay, displayName } from "@/games/play-context";
import type { SudokuState } from "@/games/logic";
import { cn } from "@/lib/utils";

export function SudokuGame() {
  const { state, me, partner, play, restart, leaveGame } = usePlay();
  const [sel, setSel] = useState<number | null>(null);
  const s = state as SudokuState;
  if (!s?.cells) return null;

  const remaining = s.cells.filter((c) => c === null).length;
  const myMistakes = s.mistakes[me.id] ?? 0;
  const theirMistakes = s.mistakes[partner.id] ?? 0;

  const enter = (value: number) => {
    if (sel === null) return;
    play({ type: "fill", cell: sel, value });
    setSel(null);
  };

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3 text-xs uppercase tracking-widest">
        <span className="text-me tabular-nums">you · {myMistakes} slips</span>
        <span className="text-ink/40 tabular-nums">{remaining} left</span>
        <span className="text-them tabular-nums">{displayName(partner)} · {theirMistakes}</span>
      </div>

      <div className="grid grid-cols-9 gap-px rounded-2xl bg-night-2 p-1.5 overflow-hidden">
        {s.cells.map((v, i) => {
          const given = s.given[i] !== null;
          const owner = s.owner[i];
          const r = Math.floor(i / 9), c = i % 9;
          return (
            <button
              key={i}
              disabled={given || v !== null || s.done}
              onClick={() => setSel(i)}
              className={cn(
                "aspect-square grid place-items-center text-[3.4vw] max-[440px]:text-sm sm:text-base font-bold rounded-[3px]",
                given ? "bg-night-3 text-ink/70" : "bg-night-3/40 text-ink/25",
                v !== null && !given && (owner === me.id ? "text-me bg-me/10" : "text-them bg-them/10"),
                sel === i && "ring-2 ring-me",
                r % 3 === 2 && r !== 8 && "mb-1",
                c % 3 === 2 && c !== 8 && "mr-1",
              )}
            >
              {v ?? ""}
            </button>
          );
        })}
      </div>

      {!s.done && (
        <div className="mt-4 grid grid-cols-9 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              disabled={sel === null}
              onClick={() => enter(n)}
              className="aspect-square rounded-xl bg-night-3 text-ink font-bold text-lg active:scale-90 disabled:opacity-30 transition-transform"
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {s.done && (
        <div className="mt-5 rounded-3xl bg-night-3/70 p-5 text-center">
          <p className="text-lg font-bold text-ink">Solved it. Together 💫</p>
          <p className="mt-1 text-sm text-ink/50 tabular-nums">{myMistakes + theirMistakes} slips between you</p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => restart()} className="flex-1 h-12 rounded-2xl bg-me text-night font-bold active:scale-95">
              New puzzle
            </button>
            <button onClick={() => leaveGame()} className="h-12 px-5 rounded-2xl bg-night-2 text-ink/70 font-semibold active:scale-95">
              Done
            </button>
          </div>
        </div>
      )}

      {!s.done && (
        <button onClick={() => leaveGame()} className="mt-4 w-full h-11 rounded-2xl bg-night-2 text-ink/50 text-sm font-semibold active:scale-95">
          Leave game
        </button>
      )}
    </div>
  );
}
