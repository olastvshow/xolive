import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "XO Live — Sign in" },
      { name: "description", content: "Sign in or create an account to play XO Live." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/", replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: username ? { username } : undefined,
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[100dvh] bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-surface-container-low rounded-3xl p-6 shadow-xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2">
            <span className="text-3xl">⚡</span>
            <h1 className="text-3xl font-bold text-primary">XO Live</h1>
          </div>
          <p className="text-on-surface-variant text-sm mt-1">Tic-tac-toe with friends, live.</p>
        </div>
        <div className="grid grid-cols-2 gap-1 p-1 bg-surface-container rounded-full mb-5">
          {(["signin", "signup"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-2 rounded-full text-sm font-bold transition ${tab === t ? "bg-primary text-on-primary shadow" : "text-on-surface-variant"}`}>
              {t === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-3">
          {tab === "signup" && (
            <input value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="Username (optional)" autoComplete="username"
              className="w-full px-4 py-3 rounded-xl bg-white border border-outline-variant focus:border-primary outline-none" />
          )}
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" autoComplete="email"
            className="w-full px-4 py-3 rounded-xl bg-white border border-outline-variant focus:border-primary outline-none" />
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password" autoComplete={tab === "signup" ? "new-password" : "current-password"}
            className="w-full px-4 py-3 rounded-xl bg-white border border-outline-variant focus:border-primary outline-none" />
          {error && <p className="text-error text-sm font-semibold">{error}</p>}
          <button type="submit" disabled={loading}
            className="bubbly w-full bg-primary text-on-primary py-3 rounded-2xl flex items-center justify-center gap-2 shadow-[0_5px_0_#394086] font-bold disabled:opacity-60">
            <Icon name={tab === "signin" ? "login" : "person_add"} filled />
            {loading ? "Please wait…" : tab === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="text-center text-xs text-on-surface-variant mt-4">
          {tab === "signin" ? "New here? " : "Already have an account? "}
          <button onClick={() => setTab(tab === "signin" ? "signup" : "signin")} className="text-primary font-bold underline">
            {tab === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
