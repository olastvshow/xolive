import { createFileRoute, Link } from "@tanstack/react-router";
import { GAMES } from "@/games/registry";
import { Glyph } from "@/components/Glyph";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/solo/")({
  head: () => ({
    meta: [
      { title: "Play against the computer — Duet" },
      { name: "description", content: "Four quick games against a computer opponent: XO Arena, Fill the Glass, Know Us and Air Hockey. No sign-in needed." },
      { property: "og:title", content: "Play against the computer — Duet" },
      { property: "og:description", content: "Four quick games against a computer opponent. No sign-in needed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Play against the computer — Duet" },
      { name: "twitter:description", content: "Four quick games against a computer opponent. No sign-in needed." },
    ],
  }),
  component: SoloIndex,
});

function SoloIndex() {
  return (
    <div className="min-h-[100dvh] bg-night text-ink">
      <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-7 lg:px-8 lg:pt-10">
        <PageHeader title="vs Computer" subtitle="Starts instantly. Nothing to sign up for." back="/games" />

        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
          {GAMES.map((g) => (
            <Link
              key={g.key}
              to="/solo/$game"
              params={{ game: g.key }}
              className="tile relative overflow-hidden p-4 pt-5"
              style={{ background: g.wash }}
            >
              <div className="grid h-[104px] place-items-center overflow-hidden lg:h-[150px]">
                <img
                  src={g.character}
                  alt=""
                  width={768}
                  height={768}
                  loading="lazy"
                  className="max-h-full w-full object-contain drop-shadow-[0_14px_26px_rgba(0,0,0,0.45)]"
                />
              </div>
              <p className="relative z-10 mt-3 font-display text-[17px] leading-tight lg:text-xl">{g.name}</p>
              <p className="relative z-10 mt-1 line-clamp-2 text-[11px] text-white/60 lg:text-xs">{g.soloBlurb}</p>
              <span
                className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-night"
                style={{ background: g.accent }}
              >
                Play <Glyph name="right" size={13} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
