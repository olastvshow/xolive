import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { getMyProfile } from "@/lib/xo.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "XO Live — Profile" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const fn = useServerFn(getMyProfile);
  const { data: p } = useQuery({ queryKey: ["profile"], queryFn: () => fn() });
  const total = (p?.wins ?? 0) + (p?.losses ?? 0) + (p?.draws ?? 0);
  const winRate = total ? Math.round(((p?.wins ?? 0) / total) * 100) : 0;

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <Shell>
      <div className="space-y-6">
        <header className="flex flex-col items-center text-center py-8 bg-surface-container-low rounded-3xl border border-white shadow-sm">
          <div className="w-24 h-24 rounded-full border-4 border-secondary p-1 mb-3">
            <div className="w-full h-full rounded-full bg-primary-container flex items-center justify-center text-4xl font-bold text-on-primary-container">
              {p?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary">{p?.username ?? "—"}</h1>
          <p className="text-base font-medium text-on-surface-variant mb-4">Tactical XO Strategist ♟️</p>
          <button onClick={signOut} className="flex items-center gap-1 px-5 py-2 bg-error text-on-error rounded-full text-sm font-semibold tracking-wider hover:opacity-90 active:scale-95 shadow-md">
            <Icon name="logout" className="text-[18px]" /> Sign out
          </button>
        </header>

        <section className="grid grid-cols-2 gap-3">
          <Card label="Wins" value={p?.wins ?? 0} cls="bg-primary-container text-on-primary-container" />
          <Card label="Losses" value={p?.losses ?? 0} cls="bg-surface-container text-error" />
          <Card label="Draws" value={p?.draws ?? 0} cls="bg-surface-container text-on-surface" />
          <Card label="Coins" value={p?.coins ?? 0} cls="bg-secondary-container text-on-secondary-container" />
        </section>

        <section className="bg-surface-container-highest p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-primary">Win rate</h2>
            <span className="text-2xl font-bold text-primary">{winRate}%</span>
          </div>
          <div className="w-full h-4 bg-surface rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-gradient-to-r from-secondary to-tertiary-container transition-all duration-1000" style={{ width: `${winRate}%` }} />
          </div>
        </section>
      </div>
    </Shell>
  );
}

function Card({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className={`${cls} p-5 rounded-2xl`}>
      <span className="text-xs font-bold opacity-70 uppercase tracking-widest">{label}</span>
      <div className="text-4xl font-bold mt-3">{value}</div>
    </div>
  );
}
