import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Icon } from "@/components/Icon";
import logoAsset from "@/assets/logo.png.asset.json";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
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
    <div className="relative min-h-[100dvh] bg-surface flex flex-col px-6 pt-6 pb-8">
      <div className="mx-auto w-full max-w-sm flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to="/onboarding"
            className="h-10 w-10 grid place-items-center rounded-full bg-surface-container text-on-surface active:scale-95 transition">
            <Icon name="arrow_back" />
          </Link>
          <div className="h-10 w-10 rounded-2xl bg-white overflow-hidden ring-1 ring-black/5 shadow-sm">
            <img src={logoAsset.url} alt="XO Live" className="w-full h-full object-cover" />
          </div>
          <span className="w-10" />
        </div>

        {/* Heading */}
        <div key={tab} className="mt-8 mb-6 animate-slide-in-up">
          <h1 className="text-[28px] leading-tight font-bold tracking-tight text-on-surface">
            {tab === "signin" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-on-surface-variant text-[14px] mt-1.5">
            {tab === "signin" ? "Sign in to continue." : "Sign up to start playing."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-3">
          {tab === "signup" && (
            <Field
              label="Username"
              icon="alternate_email"
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
            icon="mail"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          <Field
            label="Password"
            icon="lock"
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
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-full"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                <Icon name={showPw ? "visibility_off" : "visibility"} />
              </button>
            }
          />

          {tab === "signin" && (
            <div className="flex justify-end">
              <button type="button" className="text-[13px] font-medium text-on-surface-variant hover:text-on-surface">
                Forgot password?
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-error-container text-on-error-container px-3 py-2.5 text-sm animate-slide-in-up">
              <Icon name="error" filled />
              <span className="font-medium leading-snug">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-2 rounded-2xl bg-on-surface text-surface font-semibold flex items-center justify-center gap-2 active:scale-[0.985] transition disabled:opacity-60"
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

        {/* Switch */}
        <p className="text-center text-[13px] text-on-surface-variant mt-auto pt-8">
          {tab === "signin" ? "New to XO Live? " : "Already have an account? "}
          <button
            onClick={() => { setTab(tab === "signin" ? "signup" : "signin"); setError(null); }}
            className="text-on-surface font-semibold"
          >
            {tab === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({
  label, icon, value, onChange, trailing, ...rest
}: {
  label: string;
  icon: string;
  value: string;
  onChange: (v: string) => void;
  trailing?: React.ReactNode;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-on-surface-variant mb-1.5 ml-1">
        {label}
      </label>
      <div className="flex items-center gap-2.5 h-12 px-3.5 rounded-2xl bg-surface-container ring-1 ring-transparent focus-within:ring-on-surface focus-within:bg-surface-container-low transition-colors">
        <Icon name={icon} className="text-on-surface-variant" />
        <input
          {...rest}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent outline-none text-[15px] text-on-surface placeholder:text-on-surface-variant/70"
        />
        {trailing}
      </div>
    </div>
  );
}
