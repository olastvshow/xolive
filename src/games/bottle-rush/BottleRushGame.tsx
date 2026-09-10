import { useEffect, useRef, useState } from "react";
import { usePlay, displayName } from "@/games/play-context";
import type { RushState } from "@/games/logic";
import { cn } from "@/lib/utils";

const BOTTLES = ["🍾", "🥤", "🍼", "🧴"];

export function BottleRushGame() {
  const { state, me, partner, isHost, play, restart, leaveGame } = usePlay();
  const s = state as RushState;
  const timers = useRef<number[]>([]);
  const [tooSoon, setTooSoon] = useState(false);

  const round = s?.rounds?.[s.idx];
  const phase = s?.phase;

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (!s || s.done || !isHost || !round) return;
    if (phase === "spin") {
      timers.current.push(window.setTimeout(() => play({ type: "go" }), round.delay));
    }
    if (phase === "result") {
      timers.current.push(window.setTimeout(() => play({ type: "next" }), 1800));
    }
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, s?.idx, isHost, s?.done]);

  useEffect(() => { setTooSoon(false); }, [s?.idx]);

  if (!s?.rounds) return null;

  const locked = s.locked.includes(me.id);
  const partnerName = displayName(partner);
  const myScore = s.scores[me.id] ?? 0;
  const theirScore = s.scores[partner.id] ?? 0;

  const tap = (i: number) => {
    if (s.phase !== "live") { setTooSoon(true); if (navigator.vibrate) navigator.vibrate(20); return; }
    play({ type: "tap", idx: i });
  };

  if (s.done) {
    const iWon = myScore > theirScore;
    return (
      <div className="px-4">
        <div className="rounded-3xl bg-night-3/70 p-7 text-center">
          <p className="text-5xl">{iWon ? "⚡" : "🐢"}</p>
          <p className="mt-3 text-xl font-bold text-ink">
            {myScore === theirScore ? "Dead heat." : iWon ? "Fastest hands 💙" : `${partnerName} was quicker 🧡`}
          </p>
          <p className="mt-1 text-sm tabular-nums text-ink/50">{myScore} — {theirScore}</p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => restart()} className="flex-1 h-12 rounded-2xl bg-me text-night font-bold active:scale-95">
              Run it back
            </button>
            <button onClick={() => leaveGame()} className="h-12 px-5 rounded-2xl bg-night-2 text-ink/70 font-semibold active:scale-95">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3 text-xs uppercase tracking-widest">
        <span className="text-me tabular-nums">you {myScore}</span>
        <span className="text-ink/40 tabular-nums">round {s.idx + 1}/{s.rounds.length}</span>
        <span className="text-them tabular-nums">{theirScore} {partnerName}</span>
      </div>

      <div className="rounded-3xl bg-night-3/70 p-5 text-center min-h-[76px] grid place-items-center">
        {s.phase === "spin" && <p className="text-sm text-ink/50">wait for the glow…</p>}
        {s.phase === "live" && (
          <p className={cn("text-lg font-black", locked ? "text-ink/30" : "text-me")}>
            {locked ? "you jumped early" : "GRAB IT"}
          </p>
        )}
        {s.phase === "result" && (
          <p className="text-lg font-bold text-ink">
            {s.winner === me.id ? "Yours 💙" : s.winner === partner.id ? `${partnerName} got it 🧡` : "Nobody moved"}
          </p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {BOTTLES.map((b, i) => {
          const isTarget = s.phase !== "spin" && round?.target === i;
          return (
            <button
              key={i}
              onClick={() => tap(i)}
              disabled={locked || s.phase === "result"}
              className={cn(
                "aspect-square rounded-3xl grid place-items-center text-5xl transition-all duration-100 active:scale-90",
                "bg-night-2",
                isTarget && s.phase === "live" && "bg-me/25 ring-2 ring-me scale-[1.02]",
                isTarget && s.phase === "result" && "ring-2 ring-them",
                locked && "opacity-30",
              )}
            >
              {b}
            </button>
          );
        })}
      </div>

      {tooSoon && s.phase === "spin" && (
        <p className="mt-3 text-center text-xs text-them">easy — wait for the glow</p>
      )}

      <button onClick={() => leaveGame()} className="mt-4 w-full h-11 rounded-2xl bg-night-2 text-ink/50 text-sm font-semibold active:scale-95">
        Leave game
      </button>
    </div>
  );
}
