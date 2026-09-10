import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getPairState } from "@/lib/pairplay.functions";
import { GAMES } from "@/games/registry";
import { Glyph } from "@/components/Glyph";
import { TabBar } from "@/components/TabBar";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Duet — party games for two" },
      { name: "description", content: "Play XO Arena, Fill the Glass, Know Us and Air Hockey — against the computer, online with anyone, or in your private room for two." },
      { property: "og:title", content: "Duet — party games for two" },
      { property: "og:description", content: "Four bright little games. Play the computer, play online, or play in your private room." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Duet — party games for two" },
      { name: "twitter:description", content: "Four bright little games. Play the computer, play online, or play in your private room." },
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
  const hero = GAMES[0];

  return (
    <div className="min-h-[100dvh] bg-night text-ink">
      <TabBar />

      <div className="mx-auto w-full max-w-6xl px-5 pb-32 pt-7 lg:px-8 lg:pt-10 lg:pb-16">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-pop">{greeting()}</p>
            <h1 className="mt-1.5 truncate font-display text-[30px] leading-tight lg:text-[40px]">
              Hey {myName}
            </h1>
          </div>
          <Link
            to="/profile"
            aria-label="Your profile"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-night-2 text-ink/70"
          >
            <Glyph name="person" size={19} />
          </Link>
        </header>

        {/* Hero */}
        <section className="mt-6">
          <Link
            to="/solo/$game"
            params={{ game: hero.key }}
            className="tile relative block overflow-hidden px-6 pb-6 pt-7 lg:px-10 lg:pb-10 lg:pt-9"
            style={{ background: hero.wash }}
          >
            <div className="relative z-10 max-w-[62%] lg:max-w-[52%]">
              <span className="inline-block rounded-full bg-black/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                Featured
              </span>
              <h2 className="mt-3 font-display text-[34px] leading-[0.98] lg:text-[54px]">{hero.name}</h2>
              <p className="mt-2 text-sm text-white/70 lg:text-base">{hero.tagline}</p>
              <span className="btn-pop mt-5 inline-flex items-center gap-2 px-6 py-3 text-sm">
                Play now <Glyph name="right" size={16} />
              </span>
            </div>
            <img
              src={hero.character}
              alt=""
              width={768}
              height={768}
              className="pointer-events-none absolute -bottom-4 -right-6 w-[52%] max-w-[280px] object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)] lg:right-10 lg:w-[34%]"
            />
          </Link>
        </section>

        {/* Ways to play */}
        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link to={paired ? "/room" : "/pair"} className="tile bg-night-2 p-5">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-knowus/15 text-knowus">
              <Glyph name="people" size={19} />
            </span>
            <p className="mt-3 font-display text-lg">{paired ? "Your room" : "Pair up"}</p>
            <p className="mt-1 text-xs text-ink/45">
              {paired ? `Walk in with ${partnerName}` : "One code, one person, one room"}
            </p>
          </Link>
          <Link to="/play" className="tile bg-night-2 p-5">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-xo/15 text-xo">
              <Glyph name="globe" size={19} />
            </span>
            <p className="mt-3 font-display text-lg">Play online</p>
            <p className="mt-1 text-xs text-ink/45">Find someone, or use a code</p>
          </Link>
          <Link to="/solo" className="tile bg-night-2 p-5">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-hockey/15 text-hockey">
              <Glyph name="cpu" size={19} />
            </span>
            <p className="mt-3 font-display text-lg">vs Computer</p>
            <p className="mt-1 text-xs text-ink/45">No waiting, plays instantly</p>
          </Link>
        </section>

        {/* Game shelf */}
        <section className="mt-9">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl lg:text-3xl">All games</h2>
            <Link to="/solo" className="text-xs font-bold uppercase tracking-[0.2em] text-pop">
              See all
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
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
        </section>
      </div>
    </div>
  );
}
