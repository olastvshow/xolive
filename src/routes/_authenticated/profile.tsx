import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { AvatarPicker, Avatar } from "@/components/AvatarPicker";
import { supabase } from "@/integrations/supabase/client";
import {
  getPairState, updateProfile, cancelAccountDeletion, checkAccountStatus, unpair,
} from "@/lib/pairplay.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "PairPlay — you" },
      { name: "description", content: "Your PairPlay name, photo, pairing and account settings." },
      { property: "og:title", content: "PairPlay — you" },
      { property: "og:description", content: "Your PairPlay name, photo, pairing and account settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "PairPlay — you" },
      { name: "twitter:description", content: "Your PairPlay name, photo, pairing and account settings." },
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
    <Shell>
      <div className="space-y-8">
        <header className="flex items-center gap-4">
          <button onClick={() => setPicker(true)} className="w-20 h-20 rounded-full overflow-hidden border-2 border-me active:scale-95">
            <Avatar url={me?.avatar_url ?? null} name={me?.display_name ?? me?.username} className="w-full h-full" />
          </button>
          <div className="flex-1">
            <input
              value={name}
              maxLength={32}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent text-2xl font-black text-ink outline-none border-b border-ink/10 focus:border-me pb-1"
            />
            <button
              onClick={() => save.mutate()}
              className="mt-2 text-xs font-semibold text-me active:scale-95"
            >
              {saved ? "saved" : "save name"}
            </button>
          </div>
        </header>

        {status?.deletion_scheduled_at && (
          <section className="rounded-3xl bg-red-500/10 p-5">
            <p className="text-sm text-red-200">Your account is scheduled for deletion.</p>
            <button onClick={() => cancelDeletion.mutate()} className="mt-3 h-11 px-5 rounded-2xl bg-red-400 text-night font-bold active:scale-95">
              Keep my account
            </button>
          </section>
        )}

        <section className="rounded-3xl bg-night-3/70 p-5">
          <h2 className="text-xs uppercase tracking-widest text-ink/40">Your pair</h2>
          {partner ? (
            <>
              <p className="mt-3 text-ink">
                Paired with <span className="text-them font-bold">{partner.display_name ?? partner.username}</span>
              </p>
              {stats && (
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <Stat label="streak" value={stats.streak} />
                  <Stat label="nights" value={stats.nights_played} />
                  <Stat label="games" value={Object.values((stats.games_played ?? {}) as Record<string, number>).reduce((a, b) => a + b, 0)} />
                </div>
              )}
              <button onClick={() => leave.mutate()} className="mt-5 text-sm text-ink/40 underline">unpair</button>
            </>
          ) : (
            <Link to="/pair" className="mt-3 inline-block text-me font-semibold underline">Pair with someone</Link>
          )}
        </section>

        <section className="rounded-3xl bg-night-2 p-5 space-y-3 text-sm">
          <Link to="/solo" className="block text-ink/70">Play against the computer</Link>
          <Link to="/support" className="block text-ink/70">Support</Link>
          <Link to="/privacy" className="block text-ink/70">Privacy policy</Link>
          <Link to="/terms" className="block text-ink/70">Terms</Link>
          <Link to="/delete-account" className="block text-red-300/80">Delete my account</Link>
          <button
            onClick={() => supabase.auth.signOut().then(() => navigate({ to: "/auth", replace: true }))}
            className="block text-ink/50"
          >
            Sign out
          </button>
        </section>
      </div>

      {me && (
        <AvatarPicker open={picker} onClose={() => setPicker(false)} currentUrl={me.avatar_url ?? null} userId={me.id} />
      )}
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-night-2 py-3">
      <p className="text-2xl font-black text-ink tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-ink/35">{label}</p>
    </div>
  );
}
