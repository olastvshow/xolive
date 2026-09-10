import { useRoom } from "@/components/room/RoomProvider";
import type { GmState } from "@/games/logic";
import { cn } from "@/lib/utils";

export function GuessMeGame() {
  const { session, me, partner, play, restart, leaveGame } = useRoom();
  if (!session) return null;
  const s = session.state as GmState;
  const q = s.questions[s.idx];
  const partnerName = partner.display_name ?? partner.username;
  const answers = s.answers[String(s.idx)] ?? {};
  const myAnswer = answers[me.id];
  const theirAnswer = answers[partner.id];
  const iAmSubject = q?.subject === me.id;
  const subjectName = iAmSubject ? "you" : partnerName;
  const prompt = q?.prompt.replaceAll("{name}", iAmSubject ? "you" : partnerName);

  if (s.done) {
    const total = s.questions.length;
    return (
      <div className="px-4">
        <div className="rounded-3xl bg-night-3/70 p-7 text-center">
          <p className="text-xs uppercase tracking-widest text-ink/40">You matched</p>
          <p className="mt-2 text-6xl font-black text-ink tabular-nums">
            {s.score}<span className="text-2xl text-ink/30">/{total}</span>
          </p>
          <p className="mt-3 text-sm text-ink/60">
            {s.score >= total * 0.8 ? "Frankly a little scary." : s.score >= total * 0.5 ? "Solid. Room to snoop." : "You two have some catching up to do."}
          </p>
          <div className="mt-6 flex gap-2">
            <button onClick={() => restart()} className="flex-1 h-12 rounded-2xl bg-me text-night font-bold active:scale-95">
              Play again
            </button>
            <button onClick={() => leaveGame()} className="h-12 px-5 rounded-2xl bg-night-2 text-ink/70 font-semibold active:scale-95">
              Shelf
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3 text-xs uppercase tracking-widest text-ink/40">
        <span>{q?.category ?? "Guess Me"}</span>
        <span className="tabular-nums">{s.idx + 1} / {s.questions.length}</span>
        <span className="text-me tabular-nums">{s.score} matched</span>
      </div>

      <div className="rounded-3xl bg-night-3/70 p-5">
        <p className="text-[11px] uppercase tracking-widest text-them mb-2">
          {iAmSubject ? "answer as yourself" : `guess what ${partnerName} picks`}
        </p>
        <p className="text-xl font-bold text-ink leading-snug">{prompt}</p>

        <div className="mt-4 grid gap-2.5">
          {q?.options.map((opt, i) => {
            const chosenByMe = myAnswer === i;
            const chosenByThem = s.revealed && theirAnswer === i;
            return (
              <button
                key={i}
                disabled={myAnswer !== undefined}
                onClick={() => play({ type: "answer", option: i })}
                className={cn(
                  "w-full text-left rounded-2xl px-4 py-3.5 text-[15px] font-medium transition-all active:scale-[0.98]",
                  "bg-night-2 text-ink/85",
                  chosenByMe && "bg-me/20 text-ink ring-2 ring-me",
                  chosenByThem && !chosenByMe && "bg-them/20 text-ink ring-2 ring-them",
                  chosenByThem && chosenByMe && "ring-2 ring-me bg-gradient-to-r from-me/25 to-them/25",
                )}
              >
                {opt}
                {s.revealed && (chosenByMe || chosenByThem) && (
                  <span className="ml-2 text-xs text-ink/50">
                    {chosenByMe && chosenByThem ? "both" : chosenByMe ? "you" : partnerName}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          {!s.revealed && myAnswer !== undefined && (
            <p className="text-center text-sm text-ink/45">waiting for {partnerName}…</p>
          )}
          {s.revealed && (
            <>
              <p className="text-center text-sm font-semibold mb-3">
                {myAnswer === theirAnswer
                  ? <span className="text-me">Matched 💙 (about {subjectName})</span>
                  : <span className="text-ink/50">Missed that one</span>}
              </p>
              <button
                onClick={() => play({ type: "next" })}
                className="w-full h-12 rounded-2xl bg-me text-night font-bold active:scale-95"
              >
                Next
              </button>
            </>
          )}
        </div>
      </div>

      <button
        onClick={() => leaveGame()}
        className="mt-4 w-full h-11 rounded-2xl bg-night-2 text-ink/50 text-sm font-semibold active:scale-95"
      >
        Back to the shelf
      </button>
    </div>
  );
}
