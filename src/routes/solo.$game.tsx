import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { SoloPlay } from "@/games/SoloPlay";
import { gameByKey } from "@/games/registry";
import type { GameKey } from "@/games/logic";
import { Glyph } from "@/components/Glyph";

export const Route = createFileRoute("/solo/$game")({
  head: ({ params }) => {
    const entry = gameByKey(params.game);
    const name = entry?.name ?? "Solo game";
    const desc = entry ? `${entry.tagline} Play ${entry.name} against the computer — no sign-in needed.` : "Play against the computer on Duet.";
    return {
      meta: [
        { title: `${name} vs Computer — Duet` },
        { name: "description", content: desc },
        { property: "og:title", content: `${name} vs Computer — Duet` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: `${name} vs Computer — Duet` },
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
  const [round, setRound] = useState(0);

  if (!entry) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-night px-8 text-center">
        <div>
          <p className="font-display text-xl text-ink">That game doesn't exist.</p>
          <Link to="/games" className="btn-pop mt-5 inline-flex h-12 items-center px-6">See the games</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-night text-ink">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-40"
        style={{ background: entry.wash }}
      />
      <div className="relative mx-auto w-full max-w-3xl px-1 pb-16 pt-7">
        <div className="flex items-center gap-3 px-4">
          <Link
            to="/games/$game"
            params={{ game: entry.key }}
            aria-label="Go back"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-night-2 text-ink/70 press"
          >
            <Glyph name="left" size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl">{entry.name}</h1>
            <p className="truncate text-xs text-ink/40">vs Computer</p>
          </div>
          <button
            onClick={() => setRound((r) => r + 1)}
            className="h-10 shrink-0 rounded-full border border-white/10 bg-night-2 px-4 text-xs font-bold uppercase tracking-[0.15em] text-ink/60 press"
          >
            New round
          </button>
        </div>

        <div className="mt-6">
          <SoloPlay
            key={`${game}-${round}`}
            gameKey={game as GameKey}
            difficulty="medium"
            onExit={() => navigate({ to: "/games" })}
          />
        </div>
      </div>
    </div>
  );
}
