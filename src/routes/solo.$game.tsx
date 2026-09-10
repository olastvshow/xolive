import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { SoloPlay } from "@/games/SoloPlay";
import { gameByKey } from "@/games/registry";
import { DIFFICULTIES, type Difficulty } from "@/games/difficulty";
import type { GameKey } from "@/games/logic";
import { cn } from "@/lib/utils";
import { Glyph } from "@/components/Glyph";

export const Route = createFileRoute("/solo/$game")({
  head: ({ params }) => {
    const entry = gameByKey(params.game);
    const name = entry?.name ?? "Solo game";
    const desc = entry ? `${entry.tagline} Play ${entry.name} against the computer — no sign-in needed.` : "Play against the computer on PairPlay.";
    return {
      meta: [
        { title: `${name} vs Computer — PairPlay` },
        { name: "description", content: desc },
        { property: "og:title", content: `${name} vs Computer — PairPlay` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: `${name} vs Computer — PairPlay` },
        { name: "twitter:description", content: desc },
      ],
    };
  },
  component: SoloGame,
});

function SoloGame() {
  const { game } = useParams({ from: "/solo/$game" });
  const navigate = useNavigate();
  const entry = gameByKey(game);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [round, setRound] = useState(0);

  if (!entry) {
    return (
      <div className="min-h-screen bg-night grid place-items-center text-center px-8">
        <div>
          <p className="text-xl font-bold text-ink">That game doesn't exist.</p>
          <Link to="/solo" className="mt-5 inline-grid h-12 px-6 rounded-2xl bg-me text-night font-bold place-items-center">
            See the games
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-night text-ink">
      <div className="max-w-md mx-auto px-1 pt-8 pb-16">
        <div className="flex items-center gap-3 px-4">
          <Link to="/solo" className="w-10 h-10 rounded-full bg-night-2 hairline grid place-items-center text-ink/60 press shrink-0" aria-label="Back">
            <Glyph name="left" size={18} />
          </Link>
          <div className="min-w-0 flex items-center gap-2.5">
            <span className="text-them shrink-0"><Glyph name={entry.icon} size={20} /></span>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold truncate">{entry.name}</h1>
              <p className="text-xs text-ink/40 truncate">vs Computer{difficulty ? ` · ${difficulty}` : ""}</p>
            </div>
          </div>
        </div>

        {!difficulty ? (
          <div className="mt-9 px-4 grid gap-3">
            <p className="text-xs uppercase tracking-widest text-ink/35">how hard?</p>
            {DIFFICULTIES.map((d) => (
              <button
                key={d.key}
                onClick={() => setDifficulty(d.key)}
                className="rounded-3xl bg-night-3/80 px-5 py-5 text-left active:scale-[0.98] transition-transform"
              >
                <span className="block text-lg font-bold">{d.label}</span>
                <span className="block text-sm text-ink/45">{d.blurb}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <SoloPlay
              key={`${game}-${difficulty}-${round}`}
              gameKey={game as GameKey}
              difficulty={difficulty}
              onExit={() => navigate({ to: "/solo" })}
            />
            <div className="mt-5 px-4 flex gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.key}
                  onClick={() => { setDifficulty(d.key); setRound((r) => r + 1); }}
                  className={cn(
                    "flex-1 h-10 rounded-xl text-sm font-semibold active:scale-95 transition-transform",
                    difficulty === d.key ? "bg-me/20 text-me" : "bg-night-2 text-ink/45",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
