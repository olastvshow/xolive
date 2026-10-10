import { useRoom } from "./RoomProvider";
import { Glyph, type GlyphName } from "@/components/Glyph";

export const REACTIONS: { id: string; icon: GlyphName; label: string }[] = [
  { id: "heart", icon: "heart", label: "Love" },
  { id: "smile", icon: "smile", label: "Funny" },
  { id: "surprise", icon: "surprise", label: "Wow" },
  { id: "flame", icon: "flame", label: "Fire" },
  { id: "spark", icon: "spark", label: "Nice" },
  { id: "clap", icon: "clap", label: "Applause" },
];

/** Love bubbles: short lines that float over the partner's screen. */
export const BUBBLES: { id: string; icon: GlyphName; text: string }[] = [
  { id: "b:love", icon: "heart", text: "I love you" },
  { id: "b:angry", icon: "flame", text: "I'm angry" },
  { id: "b:miss", icon: "spark", text: "Miss you" },
  { id: "b:haha", icon: "smile", text: "Haha" },
  { id: "b:turn", icon: "clock", text: "Your turn, babe" },
  { id: "b:unfair", icon: "surprise", text: "Not fair" },
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
          {b.emoji.startsWith("b:") ? (() => {
            const bub = BUBBLES.find((x) => x.id === b.emoji);
            if (!bub) return null;
            return (
              <span className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-black shadow-lg animate-in zoom-in-50 duration-300 ${b.from === me.id ? "bg-ink text-night" : "bg-pop text-pop-ink"}`}>
                <Glyph name={bub.icon} size={16} /> {bub.text}
              </span>
            );
          })() : <Glyph name={iconFor(b.emoji)} size={30} strokeWidth={1.5} />}
        </span>
      ))}
    </div>
  );
}
