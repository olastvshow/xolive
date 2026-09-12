import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getLeaderboard } from "@/lib/online.functions";
import { Avatar } from "@/components/AvatarPicker";
import { PageHeader } from "@/components/PageHeader";
import { TabBar } from "@/components/TabBar";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Duet" },
      { name: "description", content: "Who is winning the most Duet games right now: wins, games played and win rate." },
      { property: "og:title", content: "Leaderboard — Duet" },
      { property: "og:description", content: "Who is winning the most Duet games right now." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Leaderboard — Duet" },
      { name: "twitter:description", content: "Who is winning the most Duet games right now." },
    ],
  }),
  component: LeaderboardPage,
});



function LeaderboardPage() {
  const fn = useServerFn(getLeaderboard);
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => fn(),
    retry: false,
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-[100dvh] bg-night text-ink">
      <TabBar />
      <div className="mx-auto w-full max-w-3xl px-5 pb-32 pt-7 lg:pt-10 lg:pb-16">
        <PageHeader title="Leaderboard" subtitle="Most wins across every game" back="/" />

        {isLoading && <p className="mt-8 text-sm text-ink/40">Counting the wins…</p>}

        {!isLoading && data.length === 0 && (
          <p className="mt-8 rounded-3xl bg-night-2 px-5 py-8 text-center text-sm text-ink/45">
            No finished games yet. Win one and you'll be first on this list.
          </p>
        )}

        {isError && <div className="py-10 text-center"><p className="text-ink/60">Rankings couldn't load.</p><Button variant="ghost" className="mt-3 text-pop" onClick={() => void refetch()}>Try again</Button></div>}
        {data.length > 0 && <>
          <div className="mt-7 flex items-center justify-between border-b border-ink/10 pb-4"><span className="text-sm font-semibold">All-time standings</span><span className="text-xs text-ink/40">{data.length} players</span></div>
          <section className="rank-podium" aria-label="Top three players">
            {[1, 0, 2].map(index => {
              const row = data[index];
              if (!row) return <div key={index} />;
              const name = row.display_name ?? row.username;
              return <div key={row.user_id} className={`podium-player podium-place-${index + 1}`}>
                {index === 0 && <Trophy className="mx-auto mb-3 h-7 w-7 text-pop" aria-label="First place" />}
                <div className="podium-avatar"><Avatar url={row.avatar_url} name={name} className="h-full w-full" /></div>
                <p className="mt-3 w-full truncate px-1 text-sm font-semibold" title={name}>{name}</p>
                <p className="mb-6 mt-1 text-xs text-ink/50">{row.wins} wins</p>
                <div className="podium-block"><span>{index + 1}</span></div>
              </div>;
            })}
          </section>
          <div className="mb-2 mt-8 flex justify-between px-4 text-xs text-ink/40"><span>Player</span><span>Wins / Win rate</span></div>
          <ol className="divide-y divide-ink/10">
            {data.map((row, i) => {
              const rate = row.played ? Math.round(row.wins / row.played * 100) : 0;
              return <li key={row.user_id} className="flex items-center gap-3 py-4 px-2 sm:px-4">
                <span className="w-6 shrink-0 text-sm tabular-nums text-ink/40">{String(i + 1).padStart(2, '0')}</span>
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full"><Avatar url={row.avatar_url} name={row.display_name ?? row.username} className="h-full w-full" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{row.display_name ?? row.username}</span><span className="text-xs text-ink/40">{row.played} games played</span></span>
                <span className="text-right tabular-nums"><strong className="block text-lg text-pop">{row.wins}</strong><span className="text-xs text-ink/50">{rate}%</span></span>
              </li>;
            })}
          </ol>
        </>}
      </div>
    </div>
  );
}
