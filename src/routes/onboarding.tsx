import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Icon } from "@/components/Icon";
import logoAsset from "@/assets/logo.png.asset.json";
import arenaAsset from "@/assets/onboard-arena.png.asset.json";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "XO Live — Welcome" },
      { name: "description", content: "Play XO Live — a fun, social tic-tac-toe arena." },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    try { localStorage.setItem("xo_onboarded", "1"); } catch {}
  }, []);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-surface flex flex-col">
      {/* Subtle ambient accents */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-24 h-80 w-80 rounded-full blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle, var(--color-primary-fixed-dim), transparent 70%)" }} />
        <div className="absolute -bottom-40 -left-24 h-80 w-80 rounded-full blur-3xl opacity-30"
          style={{ background: "radial-gradient(circle, var(--color-pastel-pink), transparent 70%)" }} />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-6 pt-8 pb-8">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 animate-slide-in-up">
          <div className="h-10 w-10 rounded-2xl bg-white overflow-hidden ring-1 ring-black/5 shadow-sm">
            <img src={logoAsset.url} alt="XO Live" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold tracking-tight text-on-surface">XO Live</span>
        </div>

        {/* Illustration */}
        <div className="flex-1 flex items-center justify-center my-6">
          <img
            src={arenaAsset.url}
            alt="XO Live game arena"
            width={1024}
            height={1024}
            className="w-[82%] max-w-[340px] aspect-square object-contain float-bob animate-pop-in drop-shadow-[0_20px_40px_rgba(57,64,134,0.25)]"
          />
        </div>

        {/* Copy */}
        <div className="text-center animate-slide-in-up">
          <h1 className="text-[32px] leading-[1.1] font-bold tracking-tight text-on-surface">
            Welcome to XO Live
          </h1>
          <p className="mt-3 text-[15px] text-on-surface-variant leading-relaxed max-w-[300px] mx-auto">
            Play tic-tac-toe with friends, climb the leaderboard and have fun.
          </p>
        </div>

        {/* CTAs */}
        <div className="mt-8 space-y-3">
          <button
            onClick={() => navigate({ to: "/auth", search: { mode: "signup" } as never })}
            className="w-full h-13 py-3.5 rounded-2xl font-semibold text-[15px] bg-on-surface text-surface flex items-center justify-center gap-2 active:scale-[0.985] transition shadow-[0_10px_24px_-12px_rgba(20,20,40,0.4)]"
          >
            Create an account
            <Icon name="arrow_forward" />
          </button>
          <button
            onClick={() => navigate({ to: "/auth", search: { mode: "signin" } as never })}
            className="w-full h-13 py-3.5 rounded-2xl font-semibold text-[15px] bg-surface-container text-on-surface ring-1 ring-outline-variant/60 active:scale-[0.985] transition"
          >
            I already have an account
          </button>
        </div>
      </div>
    </div>
  );
}
