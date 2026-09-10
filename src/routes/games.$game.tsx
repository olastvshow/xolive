import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { gameByKey } from "@/games/registry";
import { Glyph, type GlyphName } from "@/components/Glyph";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/games/$game")({
  head: ({ params }) => {
    const entry = gameByKey(params.game);
    const name = entry?.name ?? "Game";
    const desc = entry
      ? `${entry.tagline} Play ${entry.name} against the computer, online, or in your private room.`
      : "Play a Duet game against the computer, online, or in your private room.";
    return {
      meta: [
        { title: `${name} — Duet` },
        { name: "description", content: desc },
        { property: "og:title", content: `${name} — Duet` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: `${name} — Duet` },
        { name: "twitter:description", content: desc },
      ],
    };
  },
  component: GameDetail,
});

function ModeRow({
  icon, title, blurb, accent,
}: { icon: GlyphName; title: string; blurb: string; accent: string }) {
  return (
    <span className="tile flex items-center gap-4 bg-night-2 p-5">
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
        style={{ background: `${accent}22`, color: accent }}
      >
        <Glyph name={icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg leading-tight">{title}</span>
        <span className="mt-0.5 block text-xs text-ink/45">{blurb}</span>
      </span>
      <span className="text-ink/30"><Glyph name="right" size={18} /></span>
    </span>
  );
}

function GameDetail() {
  const { game } = useParams({ from: "/games/$game" });
  const entry = gameByKey(game);

  if (!entry) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-night px-8 text-center text-ink">
        <div>
          <p className="font-display text-xl">That game doesn't exist.</p>
          <Link to="/games" className="btn-pop mt-5 inline-flex h-12 items-center px-6">See the games</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-night text-ink">
      <div className="mx-auto w-full max-w-3xl px-5 pb-16 pt-7 lg:pt-10">
        <PageHeader title={entry.name} subtitle="Choose how you want to play" back="/games" />

        <section
          className="tile relative mt-6 overflow-hidden px-6 pb-6 pt-7"
          style={{ background: entry.wash }}
        >
          <div className="relative z-10 max-w-[60%]">
            <p className="font-display text-[26px] leading-tight lg:text-4xl">{entry.name}</p>
            <p className="mt-2 text-sm text-white/70">{entry.tagline}</p>
          </div>
          <img
            src={entry.character}
            alt=""
            width={768}
            height={768}
            className="pointer-events-none absolute -bottom-3 -right-4 w-[46%] max-w-[210px] object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
          />
        </section>

        <div className="mt-4 grid gap-3">
          <Link to="/solo/$game" params={{ game: entry.key }}>
            <ModeRow icon="cpu" title="Play the computer" blurb="Starts right now, no waiting" accent={entry.accent} />
          </Link>
          <Link to="/play" search={{ game: entry.key }}>
            <ModeRow icon="globe" title="Play online" blurb="Find someone, or share a room code" accent="#2fb8ff" />
          </Link>
          <Link to="/room">
            <ModeRow icon="people" title="Your private room" blurb="Just the two of you, voice on" accent="#ff4d8d" />
          </Link>
        </div>
      </div>
    </div>
  );
}
