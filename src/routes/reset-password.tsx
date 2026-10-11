import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Duet — Set a new password" },
      { name: "description", content: "Choose a new password for your Duet account." },
      { property: "og:title", content: "Duet — Set a new password" },
      { property: "og:description", content: "Choose a new password for your Duet account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: d }) => { if (d.session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 6) return setError("Use at least 6 characters.");
    if (pw !== pw2) return setError("The two passwords don't match.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return setError(error.message);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-[100dvh] bg-night px-6 pt-16 text-ink">
      <div className="mx-auto max-w-sm">
        <h1 className="font-display text-[32px] leading-tight">Set a new password</h1>
        {!ready ? (
          <p className="mt-3 text-sm text-ink/55">
            Opening your reset link… If nothing happens, request a new link from{" "}
            <Link to="/auth" className="font-bold text-pop">sign in</Link>.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" autoComplete="new-password"
              className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 outline-none focus:ring-2 focus:ring-pop/50" />
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Repeat new password" autoComplete="new-password"
              className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 outline-none focus:ring-2 focus:ring-pop/50" />
            {error && <p className="rounded-2xl border border-knowus/30 bg-knowus/10 px-3 py-2.5 text-sm">{error}</p>}
            <button disabled={loading} className="btn-pop h-14 w-full disabled:opacity-60">{loading ? "Saving…" : "Save password"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
