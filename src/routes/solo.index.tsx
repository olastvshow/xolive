import { createFileRoute, Link } from "@tanstack/react-router";
import { GAMES } from "@/games/registry";
import { Glyph } from "@/components/Glyph";

export const Route = createFileRoute("/solo/")({
  head: () => ({
    meta: [
      { title: "Play against the computer — Duet" },
      { name: "description", content: "Four quick games against a computer opponent: XO Arena, Fill the Glass, Know Us and Air Hockey. No sign-in needed." },
      { property: "og:title", content: "Play against the computer — Duet" },
      { property: "og:description", content: "Five quick games against a computer opponent. No sign-in needed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Play against the computer — Duet" },
      { name: "twitter:description", content: "Five quick games against a computer opponent. No sign-in needed." },
    ],
  }),
  component: SoloIndex,
});

function SoloIndex() {
  return (
    <div className="min-h-screen bg-night text-ink">
      <div className="max-w-md mx-auto px-5 pt-10 pb-20">
        <div className="flex items-center gap-3">
          <Link to="/" className="w-10 h-10 rounded-full bg-night-2 hairline grid place-items-center text-ink/60 press" aria-label="Back">
            <Glyph name="left" size={18} />
          </Link>
          <h1 className="font-display text-2xl font-semibold">vs Computer</h1>
        </div>
        <p className="mt-3 text-sm text-ink/40">Pick a game. Nothing to sign up for.</p>

        <div className="mt-8 rounded-[22px] hairline overflow-hidden">
          {GAMES.map((g, i) => (
            <Link
              key={g.key}
              to="/solo/$game"
              params={{ game: g.key }}
              className={`flex items-center gap-4 px-5 py-4 bg-night-2/60 press ${i > 0 ? "border-t border-ink/[0.07]" : ""}`}
            >
              <span className="w-10 h-10 rounded-full bg-night-3 grid place-items-center text-them shrink-0">
                <Glyph name={g.icon} size={19} />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{g.name}</span>
                <span className="block text-sm text-ink/40 truncate">{g.soloBlurb}</span>
              </span>
              <Glyph name="right" size={16} className="ml-auto text-ink/20 shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
