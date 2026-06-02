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

function LeaderboardPage() {
  const [query, setQuery] = useState("");
  const fn = useServerFn(getLeaderboard);
  const { data } = useQuery({
    queryKey: ["leaderboard", query],
    queryFn: () => fn({ data: { search: query || undefined } }),
  });
  const rows = data?.rows ?? [];
  const myId = data?.myId;

  return (
    <Shell>
      <div className="space-y-5">
        <div className="relative">
          <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search players..."
            className="w-full pl-14 pr-6 py-4 bg-surface-container border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white text-base placeholder:text-outline shadow-sm" />
        </div>

        <div className="space-y-2">
          {rows.map((p, i) => {
            const isMe = p.id === myId;
            return (
              <div key={p.id} className={`flex items-center px-4 py-3 rounded-2xl ${isMe ? "bg-primary-container border-2 border-primary" : "bg-white"} shadow-sm`}>
                <div className="w-10 text-center">
                  <span className={`text-xl font-bold ${isMe ? "text-on-primary-container" : "text-primary-fixed-dim"}`}>{i + 1}</span>
                </div>
                <div className="flex-grow flex items-center pl-4 gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-bold">
                    {p.username[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className={`font-semibold ${isMe ? "text-on-primary-container" : "text-on-surface"}`}>{p.username}{isMe && " (You)"}</p>
                    <p className="text-xs text-outline">{p.wins}W / {p.losses}L / {p.draws}D</p>
                  </div>
                </div>
                <div className="w-16 text-right">
                  <span className={`text-xl font-bold ${isMe ? "text-on-primary-container" : "text-secondary"}`}>{p.wins}</span>
                </div>
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
