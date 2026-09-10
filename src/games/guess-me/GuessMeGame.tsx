import { usePlay, displayName } from "@/games/play-context";
import type { GmState } from "@/games/logic";
import { cn } from "@/lib/utils";

export function GuessMeGame() {
  const { state, me, partner, play, restart, leaveGame } = usePlay();
  const s = state as GmState;
  if (!s?.questions) return null;

  const q = s.questions[s.idx];
  const forQ = s.answers[String(s.idx)] ?? {};
  const myAnswer = forQ[me.id];
  const theirAnswer = forQ[partner.id];
  const iAmSubject = q?.subject === me.id;
  const partnerName = displayName(partner);

  if (s.done) {
    return (
      <div className="px-4">
        <div className="card-noir p-7 text-center">
          <p className="text-xs uppercase tracking-widest text-ink/40">how well you know each other</p>
          <p className="mt-2 text-5xl font-black text-me tabular-nums">
            {s.score}<span className="text-ink/30 text-2xl">/{s.questions.length}</span>
          </p>
          <p className="mt-2 text-sm text-ink/50">
            {s.score >= 7 ? "You two are frightening." : s.score >= 4 ? "Solid — still plenty to learn." : "Time to ask more questions."}
          </p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => restart()} className="flex-1 h-12 rounded-2xl bg-me text-night font-bold press">
              Play again
            </button>
            <button onClick={() => leaveGame()} className="h-12 px-5 rounded-2xl bg-night-2 text-ink/70 font-semibold press">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3 text-xs uppercase tracking-widest text-ink/40">
        <span>{q.category}</span>
        <span className="tabular-nums">{s.idx + 1} / {s.questions.length}</span>
        <span className="text-me">score {s.score}</span>
      </div>

      <div className="card-noir p-5">
        <p className="text-xs uppercase tracking-widest text-ink/40">
          {iAmSubject ? "your honest answer" : `what would ${partnerName} say?`}
        </p>
        <p className="mt-2 text-xl font-bold text-ink leading-snug">{q.prompt}</p>

        <div className="mt-4 grid gap-2">
          {q.options.map((opt, i) => {
            const chosenByMe = myAnswer === i;
            const chosenByThem = s.revealed && theirAnswer === i;
            return (
              <button
                key={i}
                disabled={myAnswer !== undefined || s.revealed}
                onClick={() => play({ type: "answer", option: i })}
                className={cn(
                  "w-full text-left rounded-2xl px-4 py-3.5 font-semibold transition-transform press",
                  "bg-night-2 text-ink/80 disabled:active:scale-100",
                  chosenByMe && "ring-2 ring-me text-ink",
                  chosenByThem && "ring-2 ring-them",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span>{opt}</span>
                  <span className="text-xs">
                    {chosenByMe && <span className="text-me">you</span>}
                    {chosenByMe && chosenByThem && <span className="text-ink/30"> · </span>}
                    {chosenByThem && <span className="text-them">{partnerName}</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {!s.revealed && myAnswer !== undefined && (
        <p className="mt-4 text-center text-sm text-ink/40">locked in — waiting for {partnerName}…</p>
      )}

      {s.revealed && (
        <button onClick={() => play({ type: "next" })} className="mt-4 w-full h-12 rounded-2xl bg-me text-night font-bold press">
          {myAnswer === theirAnswer ? "Matched — next" : "Missed it — next"}
        </button>
      )}

      <button onClick={() => leaveGame()} className="mt-3 w-full h-11 rounded-2xl bg-night-2 text-ink/50 text-sm font-semibold press">
        Leave game
      </button>
    </div>
  );
}
