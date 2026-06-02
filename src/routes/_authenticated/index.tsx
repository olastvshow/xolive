import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { getMyProfile, getRecentMatches, quickPlay } from "@/lib/xo.functions";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "XO Live — Home" }] }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getProfile = useServerFn(getMyProfile);
  const getMatches = useServerFn(getRecentMatches);
  const startQuick = useServerFn(quickPlay);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const { data: matches } = useQuery({ queryKey: ["recent-matches"], queryFn: () => getMatches() });
  const quick = useMutation({
    mutationFn: () => startQuick(),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["recent-matches"] }); navigate({ to: "/game", search: { code: r.code, quick: true } as never }); },
  });

  return (
    <Shell>
      <div className="space-y-8">
        <section>
          <h1 className="text-3xl font-bold text-on-surface">Hello, {profile?.username ?? "player"} 👋</h1>
          <p className="text-base font-medium text-on-surface-variant mt-1">Ready to dominate the board today?</p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/create-room" className="bubbly relative overflow-hidden h-44 rounded-2xl bg-primary text-on-primary p-6 flex flex-col justify-end shadow-[0_8px_0_0_#394086]">
            <Icon name="add_box" filled className="text-4xl mb-2 block" />
            <h2 className="text-2xl font-semibold">Create Room</h2>
            <p className="text-xs font-bold tracking-widest opacity-80 uppercase mt-1">Start a new match</p>
          </Link>
          <Link to="/join-room" className="bubbly relative overflow-hidden h-44 rounded-2xl bg-secondary text-on-secondary p-6 flex flex-col justify-end shadow-[0_8px_0_0_#26288c]">
            <Icon name="login" filled className="text-4xl mb-2 block" />
            <h2 className="text-2xl font-semibold">Join Room</h2>
            <p className="text-xs font-bold tracking-widest opacity-80 uppercase mt-1">Enter a code</p>
          </Link>
        </section>

        <section>
          <button onClick={() => quick.mutate()} disabled={quick.isPending}
            className="w-full bubbly bg-tertiary-container text-on-tertiary-container py-5 rounded-2xl flex items-center justify-center gap-3 shadow-[0_6px_0_0_#56589b] text-xl font-semibold disabled:opacity-60">
            <Icon name="bolt" filled />
            {quick.isPending ? "Matching…" : "Quick Play"}
          </button>
          {quick.error && <p className="text-error text-sm mt-2">{(quick.error as Error).message}</p>}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest">Recent Matches</h3>
          {!matches || matches.length === 0 ? (
            <p className="text-on-surface-variant text-sm">No matches yet — play your first game!</p>
          ) : (
            <div className="space-y-2">
              {matches.map((m) => (
                <div key={m.id} className="bg-surface-container rounded-2xl p-3 flex items-center gap-3 border border-outline-variant">
                  <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center font-bold text-on-primary-container">
                    {m.opponent?.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm font-semibold">vs {m.opponent?.username ?? "Anon"}</p>
                    <p className={`text-xs font-bold ${m.draw ? "text-on-surface-variant" : m.won ? "text-primary" : "text-error"}`}>
                      {m.draw ? "Draw" : m.won ? "Won" : "Lost"} • {new Date(m.at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-3 gap-3">
          <Stat n={profile?.wins ?? 0} label="Wins" color="text-primary" />
          <Stat n={profile?.losses ?? 0} label="Losses" color="text-error" />
          <Stat n={profile?.coins ?? 0} label="Coins" color="text-secondary" />
        </section>
      </div>
    </Shell>
  );
}

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className="bg-surface-container-low p-5 rounded-2xl flex flex-col items-center text-center">
      <span className={`text-4xl font-bold tracking-tight ${color}`}>{n}</span>
      <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mt-1">{label}</span>
    </div>
  );
}
