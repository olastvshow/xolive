import { useEffect, useState } from "react";
import { usePlay, displayName } from "@/games/play-context";
import type { GmState } from "@/games/logic";
import { resolveOption } from "@/games/couples/logic";
import { gameByKey } from "@/games/registry";
import { cn } from "@/lib/utils";

/** Shared by Know Us, This or That and Who's More Likely: both answer secretly, then reveal. */
export function GuessMeGame() {
  const { state, me, partner, play, restart, leaveGame, gameKey } = usePlay();
  const s = state as GmState;
  const [sent, setSent] = useState<string | null>(null);
  const stepKey = `${s?.idx}-${s?.revealed}`;
  useEffect(() => { setSent(null); }, [stepKey]);
  if (!s?.questions) return null;

  const entry = gameByKey(gameKey);
  const accent = entry?.accent ?? "#ff4d8d";
  const q = s.questions[s.idx];
  const forQ = s.answers[String(s.idx)] ?? {};
  const myAnswer = forQ[me.id];
  const theirAnswer = forQ[partner.id];
  const partnerName = displayName(partner);
  const label = (opt: string) => (q ? resolveOption(opt, q.subject, me.id, "Me", partnerName) : opt);
  const total = s.questions.length;

  if (s.done) {
    const pct = s.score / Math.max(1, total);
    const verdict = gameKey === "this-or-that"
      ? pct >= 0.7 ? "Same brain, two bodies." : pct >= 0.4 ? "Opposites, nicely balanced." : "You keep life interesting."
      : gameKey === "memory"
        ? pct >= 0.7 ? "You've been paying attention." : pct >= 0.4 ? "Good memory, a few gaps." : "Time to take notes, darling."
      : gameKey === "likely"
        ? pct >= 0.7 ? "You see each other clearly." : pct >= 0.4 ? "Mostly on the same page." : "Time for a friendly debate."
        : pct >= 0.7 ? "You two are frightening." : pct >= 0.4 ? "Solid. Still plenty to learn." : "Time to ask more questions.";
    return (
      <div className="px-4">
        <div className="card-noir p-7 text-center">
          <p className="text-xs uppercase tracking-widest text-ink/40">{gameKey === "guess-me" || gameKey === "memory" ? "how well you know each other" : "in sync"}</p>
          <p className="mt-2 font-display text-6xl tabular-nums" style={{ color: accent }}>
            {s.score}<span className="text-2xl text-ink/30">/{total}</span>
          </p>
          <p className="mt-2 text-sm text-ink/60">{verdict}</p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => restart()} className="h-12 flex-1 rounded-2xl font-bold text-night press" style={{ background: accent }}>
              New questions
            </button>
            <button onClick={() => leaveGame()} className="h-12 rounded-2xl bg-night-2 px-5 font-semibold text-ink/70 press">Done</button>
          </div>
        </div>
      </div>
    );
  }

  if (!q) return null;
  const iAmSubject = q.subject === me.id;
  const hint = gameKey === "this-or-that"
    ? `pick yours, does ${partnerName} pick the same?`
    : gameKey === "likely"
      ? `tap who, and hope ${partnerName} agrees`
      : iAmSubject ? "your honest answer" : `what would ${partnerName} say?`;
  const locked = myAnswer !== undefined || sent !== null || s.revealed;
  const matched = s.revealed && myAnswer === theirAnswer;

  return (
    <div className="mx-auto max-w-xl px-4">
      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-widest text-ink/40">
        <span>{q.category}</span>
        <span className="tabular-nums">{s.idx + 1} / {total}</span>
        <span style={{ color: accent }}>score {s.score}</span>
      </div>
      <div className="mb-4 h-1 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((s.idx + (s.revealed ? 1 : 0)) / total) * 100}%`, background: accent }} />
      </div>

      <div className="card-noir p-5">
        <p className="text-xs uppercase tracking-widest text-ink/40">{hint}</p>
        <p className="mt-2 font-display text-2xl leading-snug text-ink">{label(q.prompt)}</p>

        <div className={cn("mt-4 grid gap-2", q.options.length === 2 && "grid-cols-2")}>
          {q.options.map((opt, i) => {
            const chosenByMe = myAnswer === i || (myAnswer === undefined && sent === String(i));
            const chosenByThem = s.revealed && theirAnswer === i;
            return (
              <button
                key={i}
                disabled={locked}
                onClick={() => { if (locked) return; setSent(String(i)); play({ type: "answer", option: i }); }}
                className={cn(
                  "w-full rounded-2xl bg-night-2 px-4 text-left font-semibold text-ink/80 transition-all press disabled:active:scale-100",
                  q.options.length === 2 ? "py-6 text-center text-lg" : "py-3.5",
                  chosenByMe && "text-ink ring-2",
                )}
                style={chosenByMe ? { boxShadow: `0 0 0 2px ${accent}` } : chosenByThem ? { boxShadow: "0 0 0 2px var(--color-xo)" } : undefined}
              >
                <span className={cn("flex items-center gap-2", q.options.length === 2 ? "flex-col" : "justify-between")}>
                  <span>{label(opt)}</span>
                  <span className="text-xs">
                    {chosenByMe && <span style={{ color: accent }}>you</span>}
                    {chosenByMe && chosenByThem && <span className="text-ink/30"> · </span>}
                    {chosenByThem && <span className="text-xo">{partnerName}</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {!s.revealed && locked && (
        <p className="mt-4 text-center text-sm text-ink/40">Locked in. Waiting for {partnerName}…</p>
      )}

      {s.revealed && (
        <>
          <p className={cn("mt-4 text-center font-display text-xl", matched ? "text-pop" : "text-ink/60")}>
            {matched ? "It's a match" : "Not quite"}
          </p>
          <button onClick={() => play({ type: "next" })} className="mt-3 h-12 w-full rounded-2xl font-bold text-night press" style={{ background: accent }}>
            Next
          </button>
        </>
      )}

      <button onClick={() => leaveGame()} className="mx-auto mt-5 block text-[11px] font-bold uppercase tracking-[0.2em] text-ink/30 press">
        Leave game
      </button>
    </div>
  );
}
