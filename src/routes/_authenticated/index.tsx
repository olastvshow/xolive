import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getPairState } from "@/lib/pairplay.functions";
import { GAMES } from "@/games/registry";
import { Glyph } from "@/components/Glyph";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Duet — five games, three ways to play" },
      { name: "description", content: "Play XO Arena, Fill the Glass, Know Us and Air Hockey — against the computer, online with anyone, or in your private room for two." },
      { property: "og:title", content: "Duet — five games, three ways to play" },
      { property: "og:description", content: "Play XO Arena, Fill the Glass, Know Us and Air Hockey — alone, online, or in your private room for two." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Duet — five games, three ways to play" },
      { name: "twitter:description", content: "Play XO Arena, Fill the Glass, Know Us and Air Hockey — alone, online, or in your private room for two." },
    ],
  }),
  component: HomeHub,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}

function HomeHub() {
  const fn = useServerFn(getPairState);
  const { data } = useQuery({ queryKey: ["pair-state"], queryFn: () => fn(), retry: false });
  const paired = Boolean(data?.partner && data?.room);
  const partnerName = data?.partner?.display_name ?? data?.partner?.username ?? "your person";
  const myName = data?.me?.display_name ?? data?.me?.username ?? "you";

  return (
    <div className="min-h-screen bg-night text-ink">
      <div className="max-w-md mx-auto px-5 pt-12 pb-28">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.42em] text-them/80">Duet</p>
            <h1 className="mt-3 font-display text-[2rem] leading-[1.1] font-semibold">
              {greeting()}, {myName}.
              <span className="block text-ink/40">What are we playing?</span>
            </h1>
          </div>
          <Link
            to="/profile"
            aria-label="Settings"
            className="w-11 h-11 rounded-full bg-night-2 hairline grid place-items-center text-ink/60 press shrink-0"
          >
            <Glyph name="settings" size={19} />
          </Link>
        </header>

        <section className="mt-10 grid gap-3">
          <Link to={paired ? "/room" : "/pair"} className="card-noir p-6 press block">
            <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-them">
              <Glyph name="people" size={15} />
              your room
            </span>
            <p className="mt-3 font-display text-xl font-semibold">
              {paired ? `Walk in with ${partnerName}` : "Pair with your person"}
            </p>
            <p className="mt-1.5 text-sm text-ink/45">
              {paired ? "Voice already on, games on the shelf." : "One code, one person, one room that stays."}
            </p>
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Link to="/play" className="card-noir p-5 press">
              <Glyph name="globe" size={22} className="text-them" />
              <p className="mt-3 font-semibold">Play online</p>
              <p className="text-xs text-ink/40 mt-1">Find someone, or use a code</p>
            </Link>
            <Link to="/solo" className="card-noir p-5 press">
              <Glyph name="cpu" size={22} className="text-them" />
              <p className="mt-3 font-semibold">vs Computer</p>
              <p className="text-xs text-ink/40 mt-1">No sign-in, no waiting</p>
            </Link>
          </div>
        </section>

        <section className="mt-11">
          <p className="text-[11px] uppercase tracking-[0.3em] text-ink/30">The shelf</p>
          <div className="mt-4 rounded-[22px] hairline overflow-hidden">
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
                  <span className="block text-sm text-ink/40 truncate">{g.tagline}</span>
                </span>
                <Glyph name="right" size={16} className="ml-auto text-ink/20 shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
