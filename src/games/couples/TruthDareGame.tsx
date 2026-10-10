import { usePlay, displayName } from "@/games/play-context";
import type { TdState } from "./logic";
import { cn } from "@/lib/utils";

export function TruthDareGame() {
  const { state, me, partner, play, restart, leaveGame, busy } = usePlay();
  const s = state as TdState;
  if (!s?.truths) return null;
  const partnerName = displayName(partner);
  const myTurn = s.turn === me.id;
  const who = myTurn ? "Your turn" : `${partnerName}'s turn`;
  const skipsLeft = 1 - (s.skips[me.id] ?? 0);

  if (s.done) {
    const done = s.log.filter((l) => !l.skipped);
    return (
      <div className="mx-auto max-w-xl px-4">
        <div className="card-noir p-7 text-center">
          <p className="text-xs uppercase tracking-widest text-ink/40">round complete</p>
          <p className="mt-2 font-display text-4xl">{done.length} cards played</p>
          <p className="mt-2 text-sm text-ink/60">
            {done.filter((d) => d.kind === "truth").length} truths, {done.filter((d) => d.kind === "dare").length} dares. Brave and sweet.
          </p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => restart()} className="btn-pop h-12 flex-1">New cards</button>
            <button onClick={() => leaveGame()} className="h-12 rounded-2xl bg-night-2 px-5 font-semibold text-ink/70 press">Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4">
      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-widest text-ink/40">
        <span className={cn(myTurn && "text-pop")}>{who}</span>
        <span className="tabular-nums">{Math.min(s.round + 1, s.rounds)} / {s.rounds}</span>
      </div>

      {!s.current ? (
        <div className="card-noir p-6 text-center">
          <p className="font-display text-2xl">{myTurn ? "Truth or dare?" : `${partnerName} is choosing…`}</p>
          {myTurn && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button disabled={busy} onClick={() => play({ type: "spin", kind: "truth" })} className="h-28 rounded-3xl bg-xo/15 font-display text-2xl text-xo ring-1 ring-xo/30 press">Truth</button>
              <button disabled={busy} onClick={() => play({ type: "spin", kind: "dare" })} className="h-28 rounded-3xl bg-knowus/15 font-display text-2xl text-knowus ring-1 ring-knowus/30 press">Dare</button>
            </div>
          )}
        </div>
      ) : (
        <div key={s.current.text} className="card-noir animate-in fade-in zoom-in-95 p-6 text-center duration-300">
          <p className={cn("text-xs font-bold uppercase tracking-[0.3em]", s.current.kind === "truth" ? "text-xo" : "text-knowus")}>
            {s.current.kind} for {myTurn ? "you" : partnerName}
          </p>
          <p className="mt-3 font-display text-2xl leading-snug">{s.current.text}</p>
          {myTurn ? (
            <div className="mt-6 flex gap-2">
              <button disabled={busy} onClick={() => play({ type: "complete" })} className="btn-pop h-12 flex-1">Done it</button>
              <button disabled={busy || skipsLeft < 1} onClick={() => play({ type: "skip" })} className="h-12 rounded-2xl bg-night-2 px-5 font-semibold text-ink/70 press disabled:opacity-40">
                Skip ({skipsLeft})
              </button>
            </div>
          ) : (
            <p className="mt-5 text-sm text-ink/45">Watch, listen and react in the room.</p>
          )}
        </div>
      )}

      <button onClick={() => leaveGame()} className="mx-auto mt-5 block text-[11px] font-bold uppercase tracking-[0.2em] text-ink/30 press">
        Leave game
      </button>
    </div>
  );
}
