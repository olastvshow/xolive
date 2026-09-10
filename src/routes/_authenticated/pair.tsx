import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createInvite, getPairState, redeemInvite, unpair } from "@/lib/pairplay.functions";

export const Route = createFileRoute("/_authenticated/pair")({
  head: () => ({
    meta: [
      { title: "Duet — pair with your person" },
      { name: "description", content: "Share a 6-character code to open a private Duet room with one person." },
      { property: "og:title", content: "Duet — pair with your person" },
      { property: "og:description", content: "Share a 6-character code to open a private Duet room with one person." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Duet — pair with your person" },
      { name: "twitter:description", content: "Share a 6-character code to open a private Duet room with one person." },
    ],
  }),
  component: PairPage,
});

function PairPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const stateFn = useServerFn(getPairState);
  const inviteFn = useServerFn(createInvite);
  const redeemFn = useServerFn(redeemInvite);
  const unpairFn = useServerFn(unpair);

  const { data } = useQuery({ queryKey: ["pair-state"], queryFn: () => stateFn(), retry: false });
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const invite = useMutation({
    mutationFn: () => inviteFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pair-state"] }),
    onError: (e: Error) => setErr(e.message),
  });

  const redeem = useMutation({
    mutationFn: () => redeemFn({ data: { code: code.trim().toUpperCase() } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["pair-state"] });
      navigate({ to: "/room" });
    },
    onError: async (e: Error) => {
      setErr(e.message);
      await qc.invalidateQueries({ queryKey: ["pair-state"] });
    },
  });

  const leave = useMutation({
    mutationFn: () => unpairFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pair-state"] }),
  });

  const myCode = data?.invite?.code ?? null;
  const partner = data?.partner ?? null;
  const shareText = myCode
    ? `come play with me 🫶 https://xolive.lovable.app — code ${myCode}`
    : "";

  const share = async () => {
    if (!myCode) return;
    if (navigator.share) {
      try { await navigator.share({ text: shareText }); return; } catch { /* fell back below */ }
    }
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-night px-6 py-10 flex flex-col gap-8 max-w-md mx-auto">
      <header>
        <h1 className="text-3xl font-black text-ink">Pair up</h1>
        <p className="mt-2 text-sm text-ink/50">
          Duet is just for the two of you. One person shares a code, the other enters it.
        </p>
      </header>

      {partner ? (
        <section className="rounded-3xl bg-night-3/70 p-6 text-center">
          <p className="text-ink">
            You're paired with <span className="text-them font-bold">{partner.display_name ?? partner.username}</span>.
          </p>
          <Link to="/room" className="mt-5 h-12 rounded-2xl bg-me text-night font-bold grid place-items-center active:scale-95">
            Go to your room
          </Link>
          <button
            onClick={() => leave.mutate()}
            className="mt-3 text-sm text-ink/40 underline"
          >
            unpair
          </button>
        </section>
      ) : (
        <>
          <section className="rounded-3xl bg-night-3/70 p-6">
            <h2 className="text-sm uppercase tracking-widest text-ink/40">Invite them</h2>
            {myCode ? (
              <>
                <p className="mt-4 text-center text-5xl font-black tracking-[0.3em] text-me tabular-nums">{myCode}</p>
                <p className="mt-2 text-center text-xs text-ink/35">expires in 24 hours</p>
                <button onClick={share} className="mt-5 w-full h-12 rounded-2xl bg-me text-night font-bold active:scale-95">
                  {copied ? "Copied" : "Share the code"}
                </button>
              </>
            ) : (
              <button
                onClick={() => { setErr(null); invite.mutate(); }}
                disabled={invite.isPending}
                className="mt-4 w-full h-12 rounded-2xl bg-me text-night font-bold active:scale-95 disabled:opacity-50"
              >
                {invite.isPending ? "…" : "Create my code"}
              </button>
            )}
          </section>

          <section className="rounded-3xl bg-night-2 p-6">
            <h2 className="text-sm uppercase tracking-widest text-ink/40">I have a code</h2>
            <input
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase().slice(0, 6)); setErr(null); }}
              placeholder="ABC123"
              autoCapitalize="characters"
              className="mt-4 w-full h-14 rounded-2xl bg-night-3 text-center text-2xl font-black tracking-[0.3em] text-ink placeholder:text-ink/20 outline-none focus:ring-2 focus:ring-them"
            />
            <button
              onClick={() => { setErr(null); redeem.mutate(); }}
              disabled={code.length !== 6 || redeem.isPending}
              className="mt-4 w-full h-12 rounded-2xl bg-them text-night font-bold active:scale-95 disabled:opacity-40"
            >
              {redeem.isPending ? "…" : "Pair us"}
            </button>
          </section>
        </>
      )}

      {err && <p className="text-center text-sm text-red-300">{err}</p>}

      <Link to="/profile" className="text-center text-sm text-ink/35 underline">back to settings</Link>
    </div>
  );
}
