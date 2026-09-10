import { useEffect, useRef, useState } from "react";
import { usePlay, displayName } from "@/games/play-context";
import { GLASS_MAX, type GlassState } from "@/games/logic";
import { cn } from "@/lib/utils";

/** 2D glass: liquid body, moving surface waves, rim and a spilling lip. */
function Glass({ level, pouring, splashed, mine }: { level: number; pouring: boolean; splashed: boolean; mine: boolean }) {
  const pct = Math.min(level / GLASS_MAX, 1.12);
  const liquidTop = 100 - pct * 88; // in % of the glass interior

  return (
    <div className="relative mx-auto w-[190px] select-none">
      {/* faucet */}
      <div className="relative h-[92px]">
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[150px] h-[13px] rounded-full bg-gradient-to-b from-ink/25 to-ink/10 hairline" />
        <div className="absolute left-1/2 -translate-x-1/2 top-[11px] w-[18px] h-[30px] rounded-b-[8px] bg-gradient-to-b from-ink/22 to-ink/8" />
        <div className="absolute left-1/2 -translate-x-1/2 top-[39px] w-[22px] h-[9px] rounded-b-[10px] bg-them/70" />
        {/* stream */}
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 top-[47px] w-[5px] rounded-full transition-opacity duration-150",
            pouring ? "opacity-100 pp-stream" : "opacity-0",
          )}
          style={{ height: "45px", background: "linear-gradient(180deg, rgba(150,215,245,0.35), rgba(120,190,225,0.95))" }}
        />
      </div>

      {/* glass */}
      <div className="relative h-[230px]">
        <div
          className={cn("absolute inset-0", splashed && "pp-shake")}
          style={{ clipPath: "polygon(3% 0, 97% 0, 88% 96%, 12% 96%)" }}
        >
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              clipPath: "polygon(3% 0, 97% 0, 88% 96%, 12% 96%)",
              background: "linear-gradient(100deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02) 40%, rgba(255,255,255,0.06))",
            }}
          >
            {/* liquid */}
            <div
              className="absolute inset-x-0 bottom-0 transition-[top] duration-500 ease-out"
              style={{ top: `${liquidTop}%` }}
            >
              <div className="absolute -top-[10px] left-0 right-0 h-[20px] pp-wave"
                style={{ background: "radial-gradient(60% 100% at 20% 100%, rgba(150,215,245,.95), transparent 70%), radial-gradient(60% 100% at 70% 100%, rgba(120,190,230,.95), transparent 70%)" }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: splashed
                    ? "linear-gradient(180deg, rgba(220,120,90,.92), rgba(150,60,50,.95))"
                    : "linear-gradient(180deg, rgba(140,205,240,.92), rgba(58,120,170,.95))",
                }}
              />
              {/* bubbles */}
              <span className="absolute left-[26%] bottom-3 w-1.5 h-1.5 rounded-full bg-white/40 pp-bubble" />
              <span className="absolute left-[58%] bottom-6 w-1 h-1 rounded-full bg-white/30 pp-bubble" style={{ animationDelay: "0.8s" }} />
              <span className="absolute left-[74%] bottom-2 w-1.5 h-1.5 rounded-full bg-white/25 pp-bubble" style={{ animationDelay: "1.6s" }} />
            </div>

            {/* glass shine */}
            <div className="absolute left-[16px] top-[10px] bottom-[26px] w-[9px] rounded-full bg-white/12" />
            <div className="absolute right-[22px] top-[24px] bottom-[46px] w-[4px] rounded-full bg-white/6" />
          </div>
          {/* wall outlines */}
          <div className="absolute inset-y-0 left-[3%] w-px bg-ink/20 origin-top" style={{ transform: "rotate(2.4deg)" }} />
          <div className="absolute inset-y-0 right-[3%] w-px bg-ink/20 origin-top" style={{ transform: "rotate(-2.4deg)" }} />
        </div>

        {/* rim */}
        <div className="absolute -top-[4px] left-[2px] right-[2px] h-[9px] rounded-[50%] border-[1.5px] border-ink/25 bg-night-2/70" />
        {/* base */}
        <div className="absolute bottom-[4px] left-[11%] right-[11%] h-[7px] rounded-[50%] border-[1.5px] border-t-0 border-ink/20 bg-night-2/50" />


        {splashed && (
          <>
            <span className="absolute -top-2 left-2 w-3 h-3 rounded-full bg-[#d97a5c] pp-splash" />
            <span className="absolute -top-4 right-6 w-2 h-2 rounded-full bg-[#d97a5c] pp-splash" style={{ animationDelay: ".1s" }} />
            <span className="absolute -top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#d97a5c] pp-splash" style={{ animationDelay: ".2s" }} />
          </>
        )}
      </div>

      {/* coaster */}
      <div className={cn("mx-auto mt-2 h-[10px] w-[150px] rounded-full blur-[6px]", mine ? "bg-me/20" : "bg-them/20")} />
    </div>
  );
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
        <Glass level={s.level} pouring={pouring && !over} splashed={s.splashed} mine={myTurn} />

        <div className="mt-6 px-6">
          <div className="h-[3px] rounded-full bg-ink/10 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", pct > 85 ? "bg-[#d97a5c]" : "bg-them")}
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
          <button onClick={() => leaveGame()} className="mt-3 w-full h-11 rounded-2xl bg-night-2 hairline text-ink/50 text-sm font-semibold press">
            Leave game
          </button>
        </>
      )}
    </div>
  );
}
