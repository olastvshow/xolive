import { createFileRoute, Link } from "@tanstack/react-router";
import { GAMES } from "@/games/registry";

export const Route = createFileRoute("/solo/")({
  head: () => ({
    meta: [
      { title: "Play against the computer — PairPlay" },
      { name: "description", content: "Five quick games against a computer opponent: XO, Guess Me, Sudoku Duo, Bottle Rush and Air Hockey. No sign-in needed." },
      { property: "og:title", content: "Play against the computer — PairPlay" },
      { property: "og:description", content: "Five quick games against a computer opponent. No sign-in needed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Play against the computer — PairPlay" },
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
          <Link to="/" className="w-10 h-10 rounded-2xl bg-night-3 grid place-items-center" aria-label="Back">‹</Link>
          <h1 className="text-2xl font-black">vs Computer</h1>
        </div>
        <p className="mt-3 text-sm text-ink/45">Pick a game. Nothing to sign up for.</p>

        <div className="mt-7 grid gap-3">
          {GAMES.map((g) => (
            <Link
              key={g.key}
              to="/solo/$game"
              params={{ game: g.key }}
              className="rounded-[28px] bg-night-3/80 p-5 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{g.emoji}</span>
                <span>
                  <span className="block text-lg font-bold">{g.name}</span>
                  <span className="block text-sm text-ink/45">{g.soloBlurb}</span>
                </span>
                <span className="ml-auto text-ink/25">›</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
