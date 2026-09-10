import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Glyph } from "@/components/Glyph";
import charXo from "@/assets/char-xo.png";
import charGlass from "@/assets/char-glass.png";
import charKnowUs from "@/assets/char-knowus.png";
import charHockey from "@/assets/char-hockey.png";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Duet — party games for two" },
      { name: "description", content: "Four bright little games for two people: XO Arena, Fill the Glass, Know Us and Air Hockey." },
      { property: "og:title", content: "Duet — party games for two" },
      { property: "og:description", content: "Play the computer, play online, or play in a private room for two." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Duet — party games for two" },
      { name: "twitter:description", content: "Four bright little games for two people." },
    ],
  }),
  component: OnboardingPage,
});

export function Star({ className, color = "#a855f7" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className} fill={color}>
      <path d="M50 0c4 26 20 42 50 50-30 8-46 24-50 50-4-26-20-42-50-50 30-8 46-24 50-50z" />
    </svg>
  );
}

function OnboardingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    try { localStorage.setItem("xo_onboarded", "1"); } catch {}
  }, []);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-night text-ink">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <Star className="absolute left-6 top-24 h-7 w-7 opacity-70" color="#a855f7" />
        <Star className="absolute right-8 top-52 h-10 w-10 opacity-60" color="#ffd426" />
        <Star className="absolute bottom-44 left-10 h-6 w-6 opacity-50" color="#ff4d8d" />
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet/20 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-6 pb-8 pt-10 lg:max-w-lg">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.4em] text-pop">Duet</p>

        <h1 className="mt-5 text-center font-display text-[44px] leading-[0.9] sm:text-[56px]">
          Play
          <span className="block text-[58px] sm:text-[74px]">Together</span>
        </h1>
        <p className="mx-auto mt-4 max-w-[300px] text-center text-[15px] leading-relaxed text-ink/55">
          Four bright little games. Beat the computer, meet someone online, or keep a private room for two.
        </p>

        <div className="relative my-7 flex flex-1 items-center justify-center">
          <img src={charGlass} alt="" width={768} height={768} className="float-y absolute left-0 bottom-6 w-[38%] max-w-[150px] -rotate-6 object-contain" />
          <img src={charHockey} alt="" width={768} height={768} className="float-y absolute right-0 bottom-10 w-[40%] max-w-[160px] rotate-6 object-contain" style={{ animationDelay: "0.6s" }} />
          <img src={charKnowUs} alt="" width={768} height={768} className="absolute bottom-0 left-1/2 w-[30%] max-w-[120px] -translate-x-1/2 object-contain opacity-90" />
          <img
            src={charXo}
            alt="Duet game characters"
            width={768}
            height={768}
            className="relative z-10 w-[54%] max-w-[220px] object-contain drop-shadow-[0_24px_50px_rgba(47,184,255,0.35)]"
          />
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate({ to: "/auth", search: { mode: "signup" } as never })}
            className="btn-pop flex h-14 w-full items-center justify-center gap-2 text-[16px]"
          >
            Get started
            <Glyph name="right" size={18} />
          </button>
          <button
            onClick={() => navigate({ to: "/auth", search: { mode: "signin" } as never })}
            className="h-13 w-full rounded-full border border-white/12 bg-white/5 py-3.5 text-[15px] font-semibold text-ink press"
          >
            I already have an account
          </button>
          <p className="pt-1 text-center text-[11px] text-ink/35">
            <Link to="/solo" className="underline">Or just play the computer</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
