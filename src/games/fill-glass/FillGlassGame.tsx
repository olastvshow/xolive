import { useEffect, useRef, useState } from "react";
import { usePlay, displayName } from "@/games/play-context";
import { GLASS_MAX, type GlassState } from "@/games/logic";
import { cn } from "@/lib/utils";

/** Lightweight dimensional glass: transparent walls, elliptical water and overflow. */
function Glass({ level, pouring, splashed }: { level: number; pouring: boolean; splashed: boolean; mine: boolean }) {
  const fill = Math.min(level / GLASS_MAX, 1);
  return <div className="glass-scene" role="img" aria-label={`Glass ${Math.round(fill * 100)} percent full${splashed ? ', water spilling over the rim' : ''}`}>
    <div className="glass-spout" />
    {pouring && <div className="glass-stream" />}
    <div className={cn("glass-vessel", splashed && "pp-shake")}>
      <div className="glass-interior"><div className="glass-water" style={{ height: `${fill * 100}%` }}><div className="water-surface" /><i /><i /><i /></div></div>
      <div className="glass-rim" /><div className="glass-reflection" /><div className="glass-base" />
      {splashed && <div className="glass-overflow"><i /><i /><i /><i /></div>}
    </div>
    <div className={cn("glass-puddle", splashed && "is-spilled")} />
  </div>;
}

export function FillGlassGame() {
  const { state, me, partner, play, restart, leaveGame } = usePlay();
  const s = state as GlassState;
  const [pouring, setPouring] = useState(false);
  const prevLevel = useRef(0);

  useEffect(() => {
    if (!s) return;
    if (s.level !== prevLevel.current) {
      prevLevel.current = s.level;
      setPouring(true);
      const t = setTimeout(() => setPouring(false), 480);
      return () => clearTimeout(t);
    }
  }, [s?.level]);

  if (!s || typeof s.level !== "number") return null;

  const myTurn = s.turn === me.id && !s.loser;
  const over = Boolean(s.loser);
  const iLost = s.loser === me.id;
  const partnerName = displayName(partner);
  const pct = Math.min(Math.round((s.level / GLASS_MAX) * 100), 100);

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-me tabular-nums">You {s.scores[me.id] ?? 0}</span>
        <span className="text-[11px] uppercase tracking-[0.28em] text-ink/40">
          {over ? "spilled" : myTurn ? "your pour" : `${partnerName} is pouring`}
        </span>
        <span className="text-sm font-semibold text-them tabular-nums">{s.scores[partner.id] ?? 0} {partnerName}</span>
      </div>

      <div className="card-noir pt-6 pb-7">
        <Glass level={s.level} pouring={pouring} splashed={s.splashed} mine={myTurn} />

        <div className="mt-6 px-6">
          <div className="h-[3px] rounded-full bg-ink/10 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", pct > 85 ? "bg-knowus" : "bg-glass")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.2em] text-ink/35">
            <span>{pct}% full</span>
            <span>{s.lastPour ? `last pour +${s.lastPour}` : "rim at 100"}</span>
          </p>
        </div>
      </div>

      {!over ? (
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            disabled={!myTurn}
            onClick={() => play({ type: "pour" })}
            className="h-14 rounded-2xl bg-me text-night font-bold press disabled:opacity-25"
          >
            Pour
          </button>
          <button
            disabled={!myTurn || s.poured < 1}
            onClick={() => play({ type: "pass" })}
            className="h-14 rounded-2xl bg-night-2 hairline text-ink font-semibold press disabled:opacity-25"
          >
            Pass it over
          </button>
        </div>
      ) : (
        <div className="mt-4 card-noir p-6 text-center">
          <p className="font-display text-xl font-semibold text-ink">
            {iLost ? "You spilled it." : `${partnerName} spilled it.`}
          </p>
          <p className="mt-1.5 text-sm text-ink/45">
            {iLost ? "One pour too greedy." : "Held your nerve — the round is yours."}
          </p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => restart()} className="flex-1 h-12 rounded-2xl bg-me text-night font-bold press">
              Play again
            </button>
            <button onClick={() => leaveGame()} className="h-12 px-5 rounded-2xl bg-night-2 hairline text-ink/70 font-semibold press">
              Done
            </button>
          </div>
        </div>
      )}

      {!over && (
        <>
          <p className="mt-3 text-center text-xs text-ink/35">
            Pour at least once, then pass. Whoever makes it overflow loses.
          </p>
          <button onClick={() => leaveGame()} className="mx-auto mt-5 block text-[11px] font-bold uppercase tracking-[0.2em] text-ink/30 press">
            Leave game
          </button>
        </>
      )}
    </div>
  );
}
