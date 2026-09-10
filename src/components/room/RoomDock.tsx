import { useEffect, useRef, useState } from "react";
import { useRoom } from "./RoomProvider";
import { REACTIONS } from "./ReactionLayer";
import { Glyph } from "@/components/Glyph";
import { cn } from "@/lib/utils";

/**
 * One slim dock at the bottom of the room: mic, reactions (slide up on tap)
 * and messages (slide-up sheet). Nothing covers the game while you play.
 */
export function RoomDock() {
  const { react, comments, say, me, setTyping, typingPartner, voice, partnerOnline, knock } = useRoom();
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [seen, setSeen] = useState(comments.length);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unread = chatOpen ? 0 : Math.max(0, comments.length - seen);

  useEffect(() => { if (chatOpen) setSeen(comments.length); }, [chatOpen, comments.length]);
  useEffect(() => {
    if (chatOpen) endRef.current?.scrollIntoView({ block: "end" });
  }, [chatOpen, comments.length, typingPartner]);

  useEffect(() => {
    if (!reactionsOpen) return;
    const t = setTimeout(() => setReactionsOpen(false), 4500);
    return () => clearTimeout(t);
  }, [reactionsOpen]);

  const submit = () => {
    const t = text.trim().slice(0, 140);
    if (!t) return;
    say(t);
    setText("");
    setTyping(false);
  };

  return (
    <>
      {/* reaction tray */}
      {reactionsOpen && (
        <div className="fixed inset-x-0 bottom-[86px] z-40 px-4 animate-slide-in-up">
          <div className="mx-auto flex max-w-md items-center justify-between gap-1.5 rounded-[24px] border border-white/10 bg-night-2/95 p-2 backdrop-blur">
            {REACTIONS.map((r) => (
              <button
                key={r.id}
                aria-label={r.label}
                onClick={() => { react(r.id); setReactionsOpen(false); }}
                className="grid h-11 flex-1 place-items-center rounded-[18px] text-ink/70 press hover:bg-white/5 hover:text-pop"
              >
                <Glyph name={r.icon} size={21} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* dock */}
      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-night via-night/92 to-transparent">
        <div className="mx-auto flex max-w-md items-center gap-2 rounded-[26px] border border-white/10 bg-night-2/95 p-2 backdrop-blur">
          <button
            onClick={voice.toggleMute}
            aria-label={voice.muted ? "Unmute" : "Mute"}
            className={cn(
              "grid h-12 w-12 shrink-0 place-items-center rounded-[20px] press",
              voice.muted ? "bg-white/5 text-ink/45" : "bg-pop/15 text-pop",
            )}
          >
            <Glyph name={voice.muted ? "mic-off" : "mic"} size={20} />
          </button>

          <button
            onClick={() => setChatOpen(true)}
            className="relative flex h-12 flex-1 items-center gap-2 rounded-[20px] bg-white/5 px-4 text-sm text-ink/45 press"
          >
            <Glyph name="chat" size={18} />
            <span className="truncate">{typingPartner ? "typing…" : "Say something"}</span>
            {unread > 0 && (
              <span className="ml-auto grid h-6 min-w-6 place-items-center rounded-full bg-pop px-1.5 text-[11px] font-black text-pop-ink">
                {unread}
              </span>
            )}
          </button>

          {!partnerOnline && (
            <button
              onClick={knock}
              aria-label="Knock"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-[20px] bg-white/5 text-ink/60 press"
            >
              <Glyph name="knock" size={20} />
            </button>
          )}

          <button
            onClick={() => setReactionsOpen((v) => !v)}
            aria-label="Reactions"
            className={cn(
              "grid h-12 w-12 shrink-0 place-items-center rounded-[20px] press",
              reactionsOpen ? "bg-pop text-pop-ink" : "bg-white/5 text-ink/60",
            )}
          >
            <Glyph name="heart" size={20} />
          </button>
        </div>
      </div>

      {/* chat sheet */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <button
            aria-label="Close messages"
            onClick={() => setChatOpen(false)}
            className="absolute inset-0 bg-night/70 backdrop-blur-sm"
          />
          <div className="relative animate-slide-up rounded-t-[28px] border-t border-white/10 bg-night-2 pb-[max(0.9rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between px-5 pt-3">
              <span className="mx-auto h-1 w-10 rounded-full bg-white/15" />
            </div>
            <div className="flex items-center justify-between px-5 pt-3">
              <p className="font-display text-lg">Messages</p>
              <button onClick={() => setChatOpen(false)} className="text-xs font-bold uppercase tracking-[0.2em] text-ink/40">
                Close
              </button>
            </div>

            <div className="mt-3 max-h-[46vh] space-y-1.5 overflow-y-auto px-5">
              {comments.length === 0 && (
                <p className="py-6 text-center text-sm text-ink/35">No messages yet.</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className={cn("flex", c.user_id === me.id ? "justify-end" : "justify-start")}>
                  <span
                    className={cn(
                      "max-w-[80%] break-words rounded-2xl px-3.5 py-2 text-sm",
                      c.user_id === me.id ? "bg-pop/20 text-ink" : "bg-white/8 text-ink",
                    )}
                  >
                    {c.text}
                  </span>
                </div>
              ))}
              {typingPartner && <p className="text-xs text-ink/35">typing…</p>}
              <div ref={endRef} />
            </div>

            <div className="mt-3 flex items-center gap-2 px-5">
              <input
                autoFocus
                value={text}
                maxLength={140}
                onChange={(e) => {
                  setText(e.target.value);
                  setTyping(true);
                  if (typingTimer.current) clearTimeout(typingTimer.current);
                  typingTimer.current = setTimeout(() => setTyping(false), 1500);
                }}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                placeholder="Say something…"
                className="h-12 flex-1 rounded-2xl bg-white/6 px-4 text-ink outline-none placeholder:text-ink/30 focus:ring-2 focus:ring-pop/50"
              />
              <button
                onClick={submit}
                disabled={!text.trim()}
                className="btn-pop h-12 px-5 text-sm disabled:opacity-30"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
