import { useState } from "react";
import { usePlay, displayName } from "@/games/play-context";
import type { FsReaction, FsState } from "./logic";
import { Glyph } from "@/components/Glyph";

const REACTIONS: { key: FsReaction; label: string; icon: "heart" | "smile" | "spark" }[] = [
  { key: "heart", label: "Love it", icon: "heart" },
  { key: "laugh", label: "Ha", icon: "smile" },
  { key: "more", label: "Tell me more", icon: "spark" },
];

export function FinishGame() {
  const { state, me, partner, play, restart, leaveGame, busy } = usePlay();
  const s = state as FsState;
  const [text, setText] = useState("");
  if (!s?.prompts) return null;
  const partnerName = displayName(partner);
  const nameOf = (id: string) => (id === me.id ? "You" : partnerName);

  if (s.done) {
    return (
      <div className="mx-auto max-w-xl px-4">
        <div className="card-noir p-6">
          <p className="text-center text-xs uppercase tracking-widest text-ink/40">your little keepsake</p>
          <ul className="mt-4 space-y-3">
            {s.entries.map((e, i) => (
              <li key={i} className="rounded-2xl bg-night-2 p-4">
                <p className="text-xs text-ink/45">{e.prompt}</p>
                <p className="mt-1 font-semibold">“{e.text}”</p>
                <p className="mt-1 text-[11px] text-ink/40">{nameOf(e.by)}{e.reaction ? ` · ${REACTIONS.find((r) => r.key === e.reaction)?.label}` : ""}</p>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex gap-2">
            <button onClick={() => restart()} className="btn-pop h-12 flex-1">New prompts</button>
            <button onClick={() => leaveGame()} className="h-12 rounded-2xl bg-night-2 px-5 font-semibold text-ink/70 press">Done</button>
          </div>
        </div>
      </div>
    );
  }

  const writing = s.entries.length === s.idx;
  const iWrite = s.writer === me.id;
  const entry = s.entries[s.idx];
  const submit = () => {
    const t = text.trim();
    if (!t || busy) return;
    play({ type: "write", text: t });
    setText("");
  };

  return (
    <div className="mx-auto max-w-xl px-4">
      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-widest text-ink/40">
        <span>{writing ? `${nameOf(s.writer)} ${iWrite ? "write" : "is writing"}` : `${iWrite ? partnerName : "You"} react`}</span>
        <span className="tabular-nums">{s.idx + 1} / {s.prompts.length}</span>
      </div>
      <div className="card-noir p-6">
        <p className="font-display text-2xl leading-snug">{s.prompts[s.idx]}</p>
        {writing && iWrite && (
          <>
            <textarea
              value={text}
              maxLength={140}
              onChange={(e) => setText(e.target.value)}
              placeholder="Finish it in your own words"
              className="mt-4 h-28 w-full resize-none rounded-2xl border border-white/10 bg-night-2 p-4 text-ink outline-none focus:border-pop/50"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-ink/35">{text.length}/140</span>
              <button disabled={!text.trim() || busy} onClick={submit} className="btn-pop h-11 px-6 disabled:opacity-40">Send</button>
            </div>
          </>
        )}
        {writing && !iWrite && <p className="mt-4 text-sm text-ink/45">{partnerName} is writing something for you…</p>}
        {!writing && entry && (
          <>
            <p className="mt-4 rounded-2xl bg-night-2 p-4 text-lg font-semibold">“{entry.text}”</p>
            {!iWrite ? (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {REACTIONS.map((r) => (
                  <button key={r.key} disabled={busy} onClick={() => play({ type: "react", reaction: r.key })} className="flex h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-white/6 text-xs font-semibold text-ink/80 press">
                    <Glyph name={r.icon} size={20} />
                    {r.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink/45">Waiting for {partnerName} to react…</p>
            )}
          </>
        )}
      </div>
      <button onClick={() => leaveGame()} className="mx-auto mt-5 block text-[11px] font-bold uppercase tracking-[0.2em] text-ink/30 press">
        Leave game
      </button>
    </div>
  );
}
