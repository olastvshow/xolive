import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Icon } from "@/components/Icon";
import logoAsset from "@/assets/logo.png.asset.json";

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
  const [showPw, setShowPw] = useState(false);
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
    <div className="relative min-h-[100dvh] overflow-hidden bg-surface flex items-center justify-center px-5 py-10">
      {/* Ambient gradient blobs */}
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full blur-3xl opacity-50"
        style={{ background: "radial-gradient(circle, var(--color-primary-fixed-dim), transparent 70%)" }} />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full blur-3xl opacity-40"
        style={{ background: "radial-gradient(circle, var(--color-pastel-pink), transparent 70%)" }} />

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="mx-auto h-20 w-20 rounded-[1.4rem] bg-white shadow-[0_10px_30px_-12px_rgba(57,64,134,0.45)] flex items-center justify-center mb-4 ring-1 ring-black/5 overflow-hidden">
            <img src={logoAsset.url} alt="XO Live" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-on-surface">
            {tab === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-on-surface-variant text-[15px] mt-1.5">
            {tab === "signin" ? "Sign in to continue to XO Live." : "Join XO Live in seconds."}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-black/5 shadow-[0_20px_60px_-25px_rgba(20,20,40,0.25)] p-5">
          {/* Segmented control */}
          <div className="relative grid grid-cols-2 p-1 bg-surface-container rounded-full mb-5 text-sm font-semibold">
            <div
              aria-hidden
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-transform duration-300 ease-out"
              style={{ transform: tab === "signin" ? "translateX(4px)" : "translateX(calc(100% + 4px))" }}
            />
            {(["signin", "signup"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(null); }}
                className={`relative z-10 py-2 rounded-full transition-colors ${tab === t ? "text-on-surface" : "text-on-surface-variant"}`}
              >
                {t === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {tab === "signup" && (
              <Field
                icon="alternate_email"
                value={username}
                onChange={setUsername}
                placeholder="Username"
                autoComplete="username"
                required
                minLength={3}
                maxLength={24}
                pattern="[a-zA-Z0-9_]+"
              />
            )}
            <Field
              icon="mail"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="Email"
              autoComplete="email"
              required
            />
            <Field
              icon="lock"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={setPassword}
              placeholder="Password"
              autoComplete={tab === "signup" ? "new-password" : "current-password"}
              required
              minLength={6}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="text-on-surface-variant hover:text-on-surface p-1 -mr-1 rounded-full"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  <Icon name={showPw ? "visibility_off" : "visibility"} />
                </button>
              }
            />

            {tab === "signin" && (
              <div className="flex justify-end -mt-1">
                <button type="button" className="text-[13px] font-medium text-primary hover:underline">
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-error-container/60 text-on-error-container px-3 py-2.5 text-sm">
                <Icon name="error" filled />
                <span className="font-medium leading-snug">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group w-full h-12 mt-1 bg-on-surface text-surface rounded-2xl font-semibold tracking-tight flex items-center justify-center gap-2 transition active:scale-[0.985] disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-block h-4 w-4 rounded-full border-2 border-surface/40 border-t-surface animate-spin" />
              ) : (
                <>
                  {tab === "signin" ? "Sign in" : "Create account"}
                  <Icon name="arrow_forward" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-outline-variant/60" />
            <span className="text-xs uppercase tracking-wider text-on-surface-variant">or</span>
            <div className="h-px flex-1 bg-outline-variant/60" />
          </div>

          {/* Social placeholder (visual only) */}
          <button
            type="button"
            disabled
            className="w-full h-12 rounded-2xl bg-white ring-1 ring-black/10 font-medium text-on-surface flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M23 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.18c-.27 1.4-1.07 2.59-2.28 3.39v2.82h3.69C21.74 18.74 23 15.78 23 12.27z"/>
              <path fill="#34A853" d="M12 23c3.08 0 5.66-1.02 7.55-2.78l-3.69-2.82c-1.02.68-2.32 1.09-3.86 1.09-2.97 0-5.48-2-6.38-4.7H1.83v2.95C3.71 20.45 7.55 23 12 23z"/>
              <path fill="#FBBC05" d="M5.62 13.79A6.97 6.97 0 0 1 5.25 12c0-.62.11-1.23.3-1.79V7.26H1.83A11 11 0 0 0 1 12c0 1.77.42 3.45 1.17 4.93l3.45-3.14z"/>
              <path fill="#EA4335" d="M12 5.5c1.68 0 3.18.58 4.36 1.71l3.27-3.27C17.65 2.21 15.08 1 12 1 7.55 1 3.71 3.55 1.83 7.26L5.62 10.2C6.52 7.5 9.03 5.5 12 5.5z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-[13px] text-on-surface-variant mt-6">
          {tab === "signin" ? "New to XO Live? " : "Already have an account? "}
          <button
            onClick={() => { setTab(tab === "signin" ? "signup" : "signin"); setError(null); }}
            className="text-primary font-semibold"
          >
            {tab === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
        <p className="text-center text-[11px] text-on-surface-variant/80 mt-3 px-6 leading-relaxed">
          By continuing, you agree to our Terms and acknowledge our Privacy Policy.
        </p>
      </div>
    </div>
  );
}

function Field({
  icon, value, onChange, trailing, ...rest
}: {
  icon: string;
  value: string;
  onChange: (v: string) => void;
  trailing?: React.ReactNode;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="group flex items-center gap-2.5 h-12 px-3.5 rounded-2xl bg-surface-container/70 ring-1 ring-transparent focus-within:ring-primary focus-within:bg-white transition-colors">
      <Icon name={icon} className="text-on-surface-variant" />
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-on-surface-variant/80"
      />
      {trailing}
    </label>
  );
}
