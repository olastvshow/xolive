import { useRoom } from "./RoomProvider";

const EMOJIS = ["💛", "😂", "😮", "🔥", "😭", "👏"];

export function ReactionLayer() {
  const { bursts, me } = useRoom();
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {bursts.map((b) => (
        <span
          key={b.id}
          className="absolute text-4xl pp-float"
          style={{
            bottom: "8rem",
            left: b.from === me.id ? `${12 + Math.random() * 20}%` : `${68 - Math.random() * 20}%`,
          }}
        >
          {b.emoji}
        </span>
      ))}
    </div>
  );
}

export function ReactionBar() {
  const { react } = useRoom();
  return (
    <div className="flex justify-between gap-1 px-4">
      {EMOJIS.map((e) => (
        <button
          key={e}
          onClick={() => react(e)}
          className="flex-1 h-12 rounded-2xl bg-night-3/70 text-2xl grid place-items-center active:scale-90 transition-transform"
        >
          {e}
        </button>
      ))}
    </div>
  );
}
