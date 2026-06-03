import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Icon } from "@/components/Icon";
import logoAsset from "@/assets/logo.png.asset.json";
import heroAsset from "@/assets/auth-hero.png.asset.json";

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
    // First-time visitor → onboarding
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

  const stars = useMemo(
    () => Array.from({ length: 16 }, (_, k) => ({
      left: `${(k * 53) % 100}%`,
      top: `${(k * 29) % 60}%`,
      delay: (k % 6) * 0.3,
    })),
    [],
  );

  return (
    <div className="relative min-h-[100dvh] overflow-hidden text-white"
      style={{
        background:
          "radial-gradient(120% 80% at 80% 0%, #6b4cf0 0%, #4b2bb8 40%, #2a1373 75%, #160a3d 100%)",
      }}
    >
      {/* Background atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full blur-3xl opacity-50"
          style={{ background: "radial-gradient(circle, #ff7eb6, transparent 70%)" }} />
        <div className="absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle, #6bd1ff, transparent 70%)" }} />
        {stars.map((s, k) => (
          <span
            key={k}
            className="twinkle absolute rounded-full bg-white"
            style={{ left: s.left, top: s.top, width: 4, height: 4, animationDelay: `${s.delay}s` }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-md min-h-[100dvh] flex flex-col px-6 pt-5 pb-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link to="/onboarding"
            className="h-10 w-10 grid place-items-center rounded-full bg-white/10 ring-1 ring-white/20 active:scale-95 transition">
            <Icon name="arrow_back" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-white/95 overflow-hidden ring-1 ring-white/30">
              <img src={logoAsset.url} alt="XO Live" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold tracking-tight">XO Live</span>
          </div>
          <span className="w-10" />
        </div>

        {/* Hero illustration */}
        <div className="relative flex justify-center mt-2 mb-1 h-44">
          <div className="absolute inset-x-0 mx-auto top-6 h-32 w-56 rounded-full blur-2xl opacity-50"
            style={{ background: "radial-gradient(circle, #ffb7ce, transparent 70%)" }} />
          <img
            src={heroAsset.url}
            alt="XO Live mascots"
            width={1024}
            height={1024}
            className="relative w-44 h-44 object-contain float-bob drop-shadow-[0_18px_30px_rgba(0,0,0,0.45)]"
          />
        </div>

        {/* Heading */}
        <div className="text-center mb-5 animate-slide-in-up">
          <h1 className="text-[30px] leading-tight font-extrabold tracking-tight">
            {tab === "signin" ? "Welcome back!" : "Join the fun"}
          </h1>
          <p className="text-white/70 text-[14px] mt-1">
            {tab === "signin" ? "Sign in and jump back in." : "Create an account to start playing."}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-white/10 backdrop-blur-xl ring-1 ring-white/15 shadow-[0_30px_60px_-25px_rgba(0,0,0,0.5)] p-4 animate-pop-in">
          {/* Segmented */}
          <div className="relative grid grid-cols-2 p-1 bg-white/10 rounded-full mb-4 text-sm font-bold">
            <div
              aria-hidden
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full shadow-md transition-transform duration-300 ease-out"
              style={{
                background: "linear-gradient(135deg, #ffe082, #ffb7ce 60%, #bdc2ff)",
                transform: tab === "signin" ? "translateX(4px)" : "translateX(calc(100% + 4px))",
              }}
            />
            {(["signin", "signup"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(null); }}
                className={`relative z-10 py-2 rounded-full transition-colors ${tab === t ? "text-[#2a1373]" : "text-white/80"}`}
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
                  className="text-white/60 hover:text-white p-1 -mr-1 rounded-full"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  <Icon name={showPw ? "visibility_off" : "visibility"} />
                </button>
              }
            />

            {tab === "signin" && (
              <div className="flex justify-end -mt-1">
                <button type="button" className="text-[13px] font-semibold text-white/80 hover:text-white">
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-[#ff6b6b]/25 text-white ring-1 ring-[#ff6b6b]/40 px-3 py-2.5 text-sm">
                <Icon name="error" filled />
                <span className="font-medium leading-snug">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="relative overflow-hidden w-full h-12 mt-1 rounded-2xl font-bold tracking-tight text-[#2a1373] flex items-center justify-center gap-2 active:scale-[0.985] transition disabled:opacity-60 shadow-[0_18px_40px_-12px_rgba(255,182,206,0.55)]"
              style={{ background: "linear-gradient(135deg, #ffe082, #ffb7ce 60%, #bdc2ff)" }}
            >
              {loading ? (
                <span className="inline-block h-4 w-4 rounded-full border-2 border-[#2a1373]/30 border-t-[#2a1373] animate-spin" />
              ) : (
                <>
                  {tab === "signin" ? "Sign in" : "Create account"}
                  <Icon name="arrow_forward" />
                </>
              )}
              <span aria-hidden className="absolute inset-y-0 left-0 w-1/3 bg-white/40 shine-sweep" />
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-white/15" />
            <span className="text-[11px] uppercase tracking-widest text-white/60">or</span>
            <div className="h-px flex-1 bg-white/15" />
          </div>

          {/* Social placeholder */}
          <button
            type="button"
            disabled
            className="w-full h-12 rounded-2xl bg-white text-[#2a1373] font-semibold flex items-center justify-center gap-2 opacity-80 cursor-not-allowed"
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
        <p className="text-center text-[13px] text-white/75 mt-5">
          {tab === "signin" ? "New to XO Live? " : "Already have an account? "}
          <button
            onClick={() => { setTab(tab === "signin" ? "signup" : "signin"); setError(null); }}
            className="text-[#ffd66b] font-bold"
          >
            {tab === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
        <p className="text-center text-[11px] text-white/55 mt-2 px-4 leading-relaxed">
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
    <label className="group flex items-center gap-2.5 h-12 px-3.5 rounded-2xl bg-white/10 ring-1 ring-white/15 focus-within:ring-[#ffd66b] focus-within:bg-white/15 transition-colors">
      <Icon name={icon} className="text-white/70" />
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent outline-none text-[15px] text-white placeholder:text-white/55"
      />
      {trailing}
    </label>
  );
}
