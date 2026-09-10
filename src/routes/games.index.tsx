import { createFileRoute, Link } from "@tanstack/react-router";
import { GAMES } from "@/games/registry";
import { Glyph } from "@/components/Glyph";
import { PageHeader } from "@/components/PageHeader";
import { TabBar } from "@/components/TabBar";

export const Route = createFileRoute("/games/")({
  head: () => ({
    meta: [
      { title: "All games — Duet" },
      { name: "description", content: "XO Arena, Fill the Glass, Know Us and Air Hockey. Play the computer, play online, or play in your private room." },
      { property: "og:title", content: "All games — Duet" },
      { property: "og:description", content: "Four games, three ways to play: computer, online, or your private room." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "All games — Duet" },
      { name: "twitter:description", content: "Four games, three ways to play." },
    ],
  }),
  component: GamesIndex,
});

function GamesIndex() {
  return (
    <div className="min-h-[100dvh] bg-night text-ink">
      <TabBar />
      <div className="mx-auto w-full max-w-6xl px-5 pb-32 pt-7 lg:px-8 lg:pt-10 lg:pb-16">
        <PageHeader title="Games" subtitle="Pick a game, then pick how you play it" back="/" />

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-2 lg:gap-5">
          {GAMES.map((g) => (
            <Link
              key={g.key}
              to="/games/$game"
              params={{ game: g.key }}
              className="tile relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden p-5"
              style={{ background: g.wash }}
            >
              <div className="min-w-0">
                <p className="font-display text-[22px] leading-tight lg:text-2xl">{g.name}</p>
                <p className="mt-1.5 text-xs text-white/60 lg:text-sm">{g.tagline}</p>
                <span
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold text-night"
                  style={{ background: g.accent }}
                >
                  Play <Glyph name="right" size={13} />
                </span>
              </div>
              <img
                src={g.character}
                alt=""
                width={768}
                height={768}
                loading="lazy"
                className="h-[112px] w-[112px] object-contain drop-shadow-[0_14px_26px_rgba(0,0,0,0.45)] lg:h-[140px] lg:w-[140px]"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
