import { createFileRoute, Link, useNavigate, type LinkProps } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AvatarPicker, Avatar } from "@/components/AvatarPicker";
import { PageHeader } from "@/components/PageHeader";
import { TabBar } from "@/components/TabBar";
import { Glyph } from "@/components/Glyph";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  getPairState, updateProfile, cancelAccountDeletion, checkAccountStatus, unpair,
} from "@/lib/pairplay.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Duet — you" },
      { name: "description", content: "Your Duet name, photo, pairing and account settings." },
      { property: "og:title", content: "Duet — you" },
      { property: "og:description", content: "Your Duet name, photo, pairing and account settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Duet — you" },
      { name: "twitter:description", content: "Your Duet name, photo, pairing and account settings." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const stateFn = useServerFn(getPairState);
  const updateFn = useServerFn(updateProfile);
  const statusFn = useServerFn(checkAccountStatus);
  const cancelDelFn = useServerFn(cancelAccountDeletion);
  const unpairFn = useServerFn(unpair);

  const { data } = useQuery({ queryKey: ["pair-state"], queryFn: () => stateFn(), retry: false });
  const { data: status } = useQuery({ queryKey: ["account-status"], queryFn: () => statusFn(), retry: false });

  const me = data?.me;
  const partner = data?.partner;
  const stats = data?.stats;

  const [picker, setPicker] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => { setName(me?.display_name ?? me?.username ?? ""); }, [me?.display_name, me?.username]);

  useEffect(() => {
    if (status?.purged) supabase.auth.signOut().then(() => navigate({ to: "/auth", replace: true }));
  }, [status?.purged, navigate]);

  const save = useMutation({
    mutationFn: () => updateFn({ data: { display_name: name.trim().slice(0, 32) } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["pair-state"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    },
  });

  const leave = useMutation({
    mutationFn: () => unpairFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pair-state"] }),
  });

  const cancelDeletion = useMutation({
    mutationFn: () => cancelDelFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["account-status"] }),
  });

  return (
    <div className="min-h-[100dvh] bg-night text-ink">
      <TabBar />
      <div className="mx-auto w-full max-w-2xl px-5 pt-7 pb-32 lg:pt-10">
        <PageHeader title="You" subtitle="Your name, photo and account" back="/" />

        <section className="tile mt-6 flex items-center gap-4 bg-night-2 p-5">
          <button
            onClick={() => setPicker(true)}
            aria-label="Change photo"
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-pop/60 press"
          >
            <Avatar url={me?.avatar_url ?? null} name={me?.display_name ?? me?.username} className="h-full w-full" />
          </button>
          <div className="min-w-0 flex-1">
            <input
              value={name}
              maxLength={32}
              onChange={(e) => setName(e.target.value)}
              aria-label="Display name"
              className="w-full border-b border-white/10 bg-transparent pb-1 font-display text-2xl text-ink outline-none focus:border-pop"
            />
            <button onClick={() => save.mutate()} className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-pop press">
              {saved ? "Saved" : "Save name"}
            </button>
          </div>
        </section>

        {status?.deletion_scheduled_at && (
          <section className="tile mt-3 bg-knowus/10 p-5">
            <p className="text-sm text-knowus">Your account is scheduled for deletion.</p>
            <button onClick={() => cancelDeletion.mutate()} className="mt-3 h-11 rounded-full bg-knowus px-5 font-bold text-night press">
              Keep my account
            </button>
          </section>
        )}

        <section className="tile mt-3 bg-night-2 p-5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.3em] text-ink/30">Your pair</h2>
          {partner ? (
            <>
              <p className="mt-3 text-ink">
                Paired with <span className="font-bold text-pop">{partner.display_name ?? partner.username}</span>
              </p>
              {stats && (
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Stat label="streak" value={stats.streak} />
                  <Stat label="nights" value={stats.nights_played} />
                  <Stat
                    label="games"
                    value={Object.values((stats.games_played ?? {}) as Record<string, number>).reduce((a, b) => a + b, 0)}
                  />
                </div>
              )}
              <button onClick={() => leave.mutate()} className="mt-5 text-sm text-ink/40 underline">unpair</button>
            </>
          ) : (
            <Link to="/pair" className="mt-3 inline-block font-semibold text-pop underline">Pair with someone</Link>
          )}
        </section>

        <nav className="tile mt-3 divide-y divide-white/6 bg-night-2 px-5 text-sm">
          <Row to="/games" label="All games" />
          <Row to="/leaderboard" label="Leaderboard" />
          <Row to="/support" label="Support" />
          <Row to="/privacy" label="Privacy policy" />
          <Row to="/terms" label="Terms" />
          <Row to="/delete-account" label="Delete my account" danger />
          <button
            onClick={() => supabase.auth.signOut().then(() => navigate({ to: "/auth", replace: true }))}
            className="flex w-full items-center justify-between py-4 text-left text-ink/50"
          >
            Sign out
            <Glyph name="exit" size={16} />
          </button>
        </nav>
      </div>

      {me && (
        <AvatarPicker open={picker} onClose={() => setPicker(false)} currentUrl={me.avatar_url ?? null} userId={me.id} />
      )}
    </div>
  );
}

function Row({ to, label, danger }: { to: LinkProps["to"]; label: string; danger?: boolean }) {
  return (
    <Link to={to} className={cn("flex items-center justify-between py-4", danger ? "text-knowus/80" : "text-ink/75")}>
      {label}
      <Glyph name="right" size={16} />
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/5 py-3">
      <p className="font-display text-2xl tabular-nums text-ink">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-ink/35">{label}</p>
    </div>
  );
}
