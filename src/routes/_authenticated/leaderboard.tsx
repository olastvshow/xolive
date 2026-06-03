import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { getLeaderboard } from "@/lib/xo.functions";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [{ title: "XO Live — Leaderboard" }] }),
  component: LeaderboardPage,
});

const TABS = ["Daily", "Monthly", "All time"] as const;

function Avatar({ name, url, size = 56, ring }: { name: string; url?: string | null; size?: number; ring?: string }) {
  const initial = name[0]?.toUpperCase() ?? "?";
  return (
    <div
      className={`rounded-full overflow-hidden bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center font-extrabold text-on-primary-container shadow-md ${ring ?? ""}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {url ? <img src={url} alt={name} className="w-full h-full object-cover" /> : initial}
    </div>
  );
}

function PodiumCard({
  player,
  rank,
  highlight,
}: {
  player: { username: string; wins: number; losses: number; draws: number; avatar_url?: string | null };
  rank: 1 | 2 | 3;
  highlight?: boolean;
}) {
  const size = rank === 1 ? 88 : 68;
  const badgeColor =
    rank === 1 ? "bg-primary text-on-primary" : rank === 2 ? "bg-secondary text-on-secondary" : "bg-tertiary text-on-tertiary";
  return (
    <div className={`flex flex-col items-center ${highlight ? "-mt-4" : "mt-4"} animate-pop-in`}>
      <div className="relative">
        {rank === 1 && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-3xl float-y">👑</div>
        )}
        <Avatar name={player.username} url={player.avatar_url} size={size} ring="ring-4 ring-white" />
        <div
          className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${badgeColor} text-xs font-extrabold rounded-full w-7 h-7 flex items-center justify-center shadow-md`}
        >
          {rank}
        </div>
      </div>
      <p className="mt-4 font-bold text-sm text-on-surface text-center max-w-[100px] truncate">{player.username}</p>
      <p className="text-xs text-on-surface-variant mt-0.5">{player.wins}W / {player.losses}L / {player.draws}D</p>
    </div>
  );
}

function LeaderboardPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Daily");
  const fn = useServerFn(getLeaderboard);
  const { data } = useQuery({
    queryKey: ["leaderboard", query],
    queryFn: () => fn({ data: { search: query || undefined } }),
  });
  const rows = data?.rows ?? [];
  const myId = data?.myId;
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-slide-in-up">
          <h1 className="text-2xl font-extrabold tracking-tight">Leaderboard</h1>
          <button className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center active:scale-95 transition">
            <Icon name="search" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-surface-container rounded-full p-1 animate-slide-in-up">
          {TABS.map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-bold rounded-full transition-all ${
                  active ? "bg-primary text-on-primary shadow-md" : "text-on-surface-variant"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* Podium */}
        {top3.length > 0 && (
          <div className="relative bg-gradient-to-b from-primary-container/40 to-transparent rounded-3xl pt-4 pb-2">
            <div className="flex items-end justify-around px-2">
              {top3[1] && <PodiumCard player={top3[1]} rank={2} />}
              {top3[0] && <PodiumCard player={top3[0]} rank={1} highlight />}
              {top3[2] && <PodiumCard player={top3[2]} rank={3} />}
            </div>
          </div>
        )}

        {/* Column headers */}
        <div className="flex items-center px-5 py-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant border-b border-outline-variant/60">
          <span className="w-10">Rank</span>
          <span className="flex-grow pl-3">Player</span>
          <span>W / L / D</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players..."
            className="w-full pl-12 pr-4 py-3 bg-surface-container border-none rounded-full focus:ring-2 focus:ring-primary text-sm placeholder:text-outline"
          />
        </div>

        {/* List */}
        <div className="space-y-2.5">
          {rest.map((p, i) => {
            const rank = i + 4;
            const isMe = p.id === myId;
            return (
              <div
                key={p.id}
                className={`flex items-center pl-2 pr-5 py-2 rounded-full shadow-sm transition-transform hover:scale-[1.01] animate-slide-in-up ${
                  isMe
                    ? "bg-gradient-to-r from-primary to-secondary text-on-primary"
                    : "bg-primary-container/50 text-on-surface"
                }`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold ${
                    isMe ? "bg-white/20 text-on-primary" : "bg-primary text-on-primary"
                  }`}
                >
                  {rank}
                </div>
                <div className="flex items-center gap-3 flex-grow pl-3">
                  <Avatar name={p.username} url={p.avatar_url} size={36} />
                  <p className="font-bold text-sm truncate">
                    {p.username}
                    {isMe && " (You)"}
                  </p>
                </div>
                <p className={`text-sm font-bold tabular-nums ${isMe ? "text-on-primary" : "text-primary"}`}>
                  {p.wins}<span className="opacity-60"> / </span>{p.losses}<span className="opacity-60"> / </span>{p.draws}
                </p>
              </div>
            );
          })}
          {rows.length === 0 && (
            <p className="text-center text-on-surface-variant text-sm py-10">No players found.</p>
          )}
        </div>
      </div>
    </Shell>
  );
}
