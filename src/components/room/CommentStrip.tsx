import { useEffect, useRef, useState } from "react";
import { useRoom } from "./RoomProvider";
import { cn } from "@/lib/utils";

export function CommentStrip() {
  const { comments, say, me, setTyping, typingPartner } = useRoom();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [comments.length, typingPartner]);

  const submit = () => {
    const t = text.trim().slice(0, 140);
    if (!t) return;
    say(t);
    setText("");
    setTyping(false);
  };

  return (
    <div className="px-4">
      <div className="max-h-28 overflow-y-auto space-y-1.5 pb-2">
        {comments.map((c) => (
          <div key={c.id} className={cn("flex", c.user_id === me.id ? "justify-end" : "justify-start")}>
            <span
              className={cn(
                "rounded-2xl px-3 py-1.5 text-sm max-w-[80%] break-words",
                c.user_id === me.id ? "bg-me/20 text-ink" : "bg-them/20 text-ink",
              )}
            >
              {c.text}
            </span>
          </div>
        ))}
        {typingPartner && (
          <div className="flex justify-start">
            <span className="rounded-2xl bg-them/10 px-3 py-1.5 text-xs text-them">typing…</span>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="flex items-center gap-2">
        <input
          value={text}
          maxLength={140}
          onChange={(e) => {
            setText(e.target.value);
            setTyping(true);
            if (typingTimer.current) clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => setTyping(false), 1500);
          }}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="say something…"
          className="flex-1 h-12 rounded-2xl bg-night-3/70 px-4 text-ink placeholder:text-ink/35 outline-none focus:ring-2 focus:ring-me/50"
        />
        <button
          onClick={submit}
          className="h-12 px-5 rounded-2xl bg-me text-night font-bold active:scale-95 disabled:opacity-40"
          disabled={!text.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
