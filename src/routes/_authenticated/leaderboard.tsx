import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getLeaderboard } from "@/lib/online.functions";
import { Avatar } from "@/components/AvatarPicker";
import { PageHeader } from "@/components/PageHeader";
import { TabBar } from "@/components/TabBar";
import { cn } from "@/lib/utils";

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

const MEDALS = ["#ffd426", "#d7dbe4", "#e29a5a"];

function LeaderboardPage() {
  const fn = useServerFn(getLeaderboard);
  const { data = [], isLoading } = useQuery({
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

        <ol className="mt-6 grid gap-2">
          {data.map((row, i) => {
            const rate = row.played ? Math.round((row.wins / row.played) * 100) : 0;
            return (
              <li
                key={row.user_id}
                className={cn(
                  "flex items-center gap-3.5 rounded-[22px] border border-white/8 px-4 py-3.5",
                  i < 3 ? "bg-night-3" : "bg-night-2",
                )}
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black tabular-nums"
                  style={
                    i < 3
                      ? { background: MEDALS[i], color: "#171308" }
                      : { background: "rgba(255,255,255,0.06)", color: "rgba(247,245,242,0.5)" }
                  }
                >
                  {i + 1}
                </span>
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/10">
                  <Avatar url={row.avatar_url} name={row.display_name ?? row.username} className="h-full w-full" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{row.display_name ?? row.username}</span>
                  <span className="block text-[11px] text-ink/40">{row.played} played · {rate}% won</span>
                </span>
                <span className="text-right">
                  <span className="block font-display text-xl tabular-nums text-pop">{row.wins}</span>
                  <span className="block text-[10px] uppercase tracking-[0.2em] text-ink/35">wins</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
