import { usePlay, displayName } from "@/games/play-context";
import type { XoState } from "@/games/logic";
import { cn } from "@/lib/utils";

function XMark({ tone }: { tone: "me" | "them" }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("w-[54%] h-[54%]", tone === "me" ? "text-me" : "text-them")}>
      <g stroke="currentColor" strokeWidth="9" strokeLinecap="round" fill="none">
        <line x1="18" y1="18" x2="82" y2="82" className="pp-draw" />
        <line x1="82" y1="18" x2="18" y2="82" className="pp-draw" style={{ animationDelay: "0.12s" }} />
      </g>
    </svg>
  );
}

function OMark({ tone }: { tone: "me" | "them" }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("w-[54%] h-[54%]", tone === "me" ? "text-me" : "text-them")}>
      <circle
        cx="50" cy="50" r="32"
        stroke="currentColor" strokeWidth="9" fill="none" strokeLinecap="round"
        className="pp-draw-o"
      />
    </svg>
  );
}

export function XoGame() {
  const { state, me, partner, play, restart, leaveGame } = usePlay();
  const s = state as XoState;
  if (!s?.board) return null;
  const myMark = s.marks[me.id];
  const myTurn = s.turn === myMark && !s.winner && !s.draw;
  const over = Boolean(s.winner) || s.draw;
  const partnerName = displayName(partner);

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-me tabular-nums">You {s.scores[me.id] ?? 0}</span>
        <span className="text-[11px] uppercase tracking-[0.28em] text-ink/40">
          {over ? "round over" : myTurn ? "your turn" : `${partnerName}'s turn`}
        </span>
        <span className="text-sm font-semibold text-them tabular-nums">{s.scores[partner.id] ?? 0} {partnerName}</span>
      </div>

      <div className="card-noir p-3">
        <div className="relative grid grid-cols-3">
          {/* grid rules */}
          <span className="pointer-events-none absolute left-1/3 top-[6%] bottom-[6%] w-px bg-ink/10" />
          <span className="pointer-events-none absolute left-2/3 top-[6%] bottom-[6%] w-px bg-ink/10" />
          <span className="pointer-events-none absolute top-1/3 left-[6%] right-[6%] h-px bg-ink/10" />
          <span className="pointer-events-none absolute top-2/3 left-[6%] right-[6%] h-px bg-ink/10" />

          {s.board.map((cell, i) => {
            const mine = Boolean(cell) && s.marks[me.id] === cell;
            const inLine = s.line?.includes(i);
            return (
              <button
                key={i}
                disabled={!myTurn || Boolean(cell)}
                onClick={() => play({ type: "play", cell: i })}
                aria-label={`Cell ${i + 1}`}
                className={cn(
                  "aspect-square grid place-items-center rounded-2xl transition-colors duration-200",
                  !cell && myTurn && "hover:bg-ink/[0.04] active:bg-ink/[0.07]",
                  inLine && (mine ? "bg-me/10" : "bg-them/10"),
                )}
              >
                {cell === "X" && <XMark tone={mine ? "me" : "them"} />}
                {cell === "O" && <OMark tone={mine ? "me" : "them"} />}
                {!cell && <span className="w-1 h-1 rounded-full bg-ink/10" />}
              </button>
            );
          })}
        </div>
      </div>

      {over && (
        <div className="mt-4 card-noir p-6 text-center">
          <p className="font-display text-xl font-semibold text-ink">
            {s.draw ? "Dead even." : s.winner === me.id ? "You got it." : `${partnerName} got it.`}
          </p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => restart()} className="flex-1 h-12 rounded-2xl bg-me text-night font-bold press">
              Rematch
            </button>
            <button onClick={() => leaveGame()} className="h-12 px-5 rounded-2xl bg-night-2 hairline text-ink/70 font-semibold press">
              Done
            </button>
          </div>
        </div>
      )}

      {!over && (
        <button onClick={() => leaveGame()} className="mx-auto mt-5 block text-[11px] font-bold uppercase tracking-[0.2em] text-ink/30 press">
          Leave game
        </button>
      )}
    </div>
  );
}
