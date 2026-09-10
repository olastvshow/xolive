import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getPairState } from "@/lib/pairplay.functions";
import { GAMES } from "@/games/registry";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "PairPlay — five games, three ways to play" },
      { name: "description", content: "Play XO, Guess Me, Sudoku Duo, Bottle Rush and Air Hockey — alone against the computer, online with anyone, or in your private room for two." },
      { property: "og:title", content: "PairPlay — five games, three ways to play" },
      { property: "og:description", content: "Play XO, Guess Me, Sudoku Duo, Bottle Rush and Air Hockey — alone, online, or in your private room for two." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "PairPlay — five games, three ways to play" },
      { name: "twitter:description", content: "Play XO, Guess Me, Sudoku Duo, Bottle Rush and Air Hockey — alone, online, or in your private room for two." },
    ],
  }),
  component: HomeHub,
});

function HomeHub() {
  const fn = useServerFn(getPairState);
  const { data } = useQuery({ queryKey: ["pair-state"], queryFn: () => fn(), retry: false });
  const paired = Boolean(data?.partner && data?.room);
  const partnerName = data?.partner?.display_name ?? data?.partner?.username ?? "your person";
  const myName = data?.me?.display_name ?? data?.me?.username ?? "you";

  return (
    <div className="min-h-screen bg-night text-ink">
      <div className="max-w-md mx-auto px-5 pt-10 pb-24">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-ink/35">PairPlay</p>
            <h1 className="mt-2 text-3xl font-black leading-tight">
              Evening, <span className="text-me">{myName}</span>.
              <br />What are we playing?
            </h1>
          </div>
          <Link to="/profile" className="w-11 h-11 rounded-2xl bg-night-3 grid place-items-center text-lg shrink-0" aria-label="Profile">
            ⚙️
          </Link>
        </header>

        <section className="mt-8 grid gap-3">
          <Link
            to={paired ? "/room" : "/pair"}
            className="rounded-[28px] p-6 bg-gradient-to-br from-them/25 to-night-3 active:scale-[0.98] transition-transform"
          >
            <p className="text-xs uppercase tracking-widest text-them">your room</p>
            <p className="mt-2 text-2xl font-black">
              {paired ? `Walk in with ${partnerName}` : "Pair with your person"}
            </p>
            <p className="mt-1 text-sm text-ink/50">
              {paired ? "Voice already on, games on the shelf." : "One code, one person, one room that stays."}
            </p>
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Link to="/play" className="rounded-[28px] p-5 bg-night-3/80 active:scale-[0.97] transition-transform">
              <p className="text-2xl">🌍</p>
              <p className="mt-2 font-bold">Play online</p>
              <p className="text-xs text-ink/45 mt-0.5">Find someone, or use a code</p>
            </Link>
            <Link to="/solo" className="rounded-[28px] p-5 bg-night-3/80 active:scale-[0.97] transition-transform">
              <p className="text-2xl">🤖</p>
              <p className="mt-2 font-bold">vs Computer</p>
              <p className="text-xs text-ink/45 mt-0.5">No sign-in, no waiting</p>
            </Link>
          </div>
        </section>

        <section className="mt-9">
          <p className="text-xs uppercase tracking-widest text-ink/35 mb-3">the shelf</p>
          <div className="grid gap-2.5">
            {GAMES.map((g) => (
              <Link
                key={g.key}
                to="/solo/$game"
                params={{ game: g.key }}
                className="flex items-center gap-4 rounded-3xl bg-night-2 px-5 py-4 active:scale-[0.98] transition-transform"
              >
                <span className="text-3xl">{g.emoji}</span>
                <span className="min-w-0">
                  <span className="block font-bold">{g.name}</span>
                  <span className="block text-sm text-ink/45 truncate">{g.tagline}</span>
                </span>
                <span className="ml-auto text-ink/25">›</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
