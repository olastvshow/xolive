import { useRoom } from "./RoomProvider";
import { Glyph, type GlyphName } from "@/components/Glyph";

const REACTIONS: { id: string; icon: GlyphName; label: string }[] = [
  { id: "heart", icon: "heart", label: "Love" },
  { id: "smile", icon: "smile", label: "Funny" },
  { id: "surprise", icon: "surprise", label: "Wow" },
  { id: "flame", icon: "flame", label: "Fire" },
  { id: "spark", icon: "spark", label: "Nice" },
  { id: "clap", icon: "clap", label: "Applause" },
];

const iconFor = (id: string): GlyphName =>
  (REACTIONS.find((r) => r.id === id)?.icon ?? "spark");

export function ReactionLayer() {
  const { bursts, me } = useRoom();
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {bursts.map((b) => (
        <span
          key={b.id}
          className={`absolute pp-float ${b.from === me.id ? "text-me" : "text-them"}`}
          style={{
            bottom: "8rem",
            left: b.from === me.id ? `${12 + Math.random() * 20}%` : `${68 - Math.random() * 20}%`,
          }}
        >
          <Glyph name={iconFor(b.emoji)} size={30} strokeWidth={1.5} />
        </span>
      ))}
    </div>
  );
}

export function ReactionBar() {
  const { react } = useRoom();
  return (
    <div className="flex justify-between gap-1.5 px-4">
      {REACTIONS.map((r) => (
        <button
          key={r.id}
          aria-label={r.label}
          onClick={() => react(r.id)}
          className="flex-1 h-11 rounded-2xl bg-night-2 hairline text-ink/60 grid place-items-center press hover:text-them"
        >
          <Glyph name={r.icon} size={20} />
        </button>
      ))}
    </div>
  );
}
