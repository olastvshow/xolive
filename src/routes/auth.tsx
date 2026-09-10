import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Glyph, type GlyphName } from "@/components/Glyph";
import charXo from "@/assets/char-xo.png";
import charKnowUs from "@/assets/char-knowus.png";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Duet — Sign in" },
      { name: "description", content: "Sign in or create an account to play Duet." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [tab, setTab] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem("xo_onboarded")) {
        navigate({ to: "/onboarding", replace: true });
        return;
      }
    } catch {}

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/", replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (search.mode) setTab(search.mode);
  }, [search.mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      if (tab === "signup") {
        const uname = username.trim();
        if (!/^[a-zA-Z0-9_]{3,24}$/.test(uname)) {
          throw new Error("Username must be 3–24 characters: letters, numbers, or underscores.");
        }
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username: uname },
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
    <div className="relative min-h-[100dvh] overflow-hidden bg-night text-ink px-6 pb-8 pt-6">
      <div aria-hidden className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet/20 blur-[90px]" />
      <div className="relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col">
        <div className="flex items-center justify-between">
          <Link
            to="/onboarding"
            aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-ink press"
          >
            <Glyph name="left" size={18} />
          </Link>
          <span className="font-display text-lg">Duet<span className="text-pop">.</span></span>
          <span className="w-10" />
        </div>

        <div className="mt-10 flex justify-center">
          <img
            src={tab === "signup" ? charKnowUs : charXo}
            alt=""
            width={768}
            height={768}
            className="float-y w-32 object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
          />
        </div>

        <div key={tab} className="mt-6 mb-6 text-center animate-slide-in-up">
          <h1 className="font-display text-[34px] leading-tight">
            {tab === "signin" ? "Welcome back" : "Create account"}
          </h1>
          <p className="mt-1.5 text-[14px] text-ink/50">
            {tab === "signin" ? "Your games are waiting." : "Takes about ten seconds."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {tab === "signup" && (
            <Field
              label="Username"
              icon="person"
              value={username}
              onChange={setUsername}
              autoComplete="username"
              required
              minLength={3}
              maxLength={24}
              pattern="[a-zA-Z0-9_]+"
            />
          )}
          <Field
            label="Email"
            icon="globe"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          <Field
            label="Password"
            icon="spark"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={setPassword}
            autoComplete={tab === "signup" ? "new-password" : "current-password"}
            required
            minLength={6}
            trailing={
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="rounded-full p-1 text-ink/40 hover:text-ink"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                <Glyph name={showPw ? "smile" : "surprise"} size={17} />
              </button>
            }
          />

          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-knowus/30 bg-knowus/10 px-3 py-2.5 text-sm text-ink animate-slide-in-up">
              <span className="font-medium leading-snug">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-pop mt-2 flex h-14 w-full items-center justify-center gap-2 text-[16px] disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-night/30 border-t-night" />
            ) : (
              <>
                {tab === "signin" ? "Sign in" : "Create account"}
                <Glyph name="right" size={17} />
              </>
            )}
          </button>
        </form>

        <p className="mt-auto pt-10 text-center text-[13px] text-ink/50">
          {tab === "signin" ? "New to Duet? " : "Already have an account? "}
          <button
            onClick={() => { setTab(tab === "signin" ? "signup" : "signin"); setError(null); }}
            className="font-bold text-pop"
          >
            {tab === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
        <p className="mt-3 text-center text-[12px] text-ink/35">
          <Link to="/support" className="underline">Support</Link>
          {" · "}
          <Link to="/privacy" className="underline">Privacy</Link>
          {" · "}
          <Link to="/terms" className="underline">Terms</Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label, icon, value, onChange, trailing, ...rest
}: {
  label: string;
  icon: GlyphName;
  value: string;
  onChange: (v: string) => void;
  trailing?: React.ReactNode;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <div>
      <label className="mb-1.5 ml-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-ink/40">
        {label}
      </label>
      <div className="flex h-14 items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-4 transition-colors focus-within:border-pop/60">
        <span className="text-ink/40"><Glyph name={icon} size={17} /></span>
        <input
          {...rest}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink/30"
        />
        {trailing}
      </div>
    </div>
  );
}
