import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import logoAsset from "@/assets/logo.png.asset.json";
import arenaAsset from "@/assets/onboard-arena.png.asset.json";
import trophyAsset from "@/assets/onboard-trophy.png.asset.json";
import socialAsset from "@/assets/onboard-social.png.asset.json";

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

type Slide = {
  title: string;
  body: string;
  img: string;
  accent: string;
  emoji: string;
};

const SLIDES: Slide[] = [
  {
    title: "Play & Win Big",
    body: "Battle friends in fast, fun XO matches. Climb the ranks and grab the gold.",
    img: arenaAsset.url,
    accent: "from-[#ffb7ce] to-[#bdc2ff]",
    emoji: "🎮",
  },
  {
    title: "Earn Trophies",
    body: "Stack coins, unlock badges and rule the global leaderboard.",
    img: trophyAsset.url,
    accent: "from-[#ffd66b] to-[#ff7eb6]",
    emoji: "🏆",
  },
  {
    title: "Play with Friends",
    body: "Voice chat, reactions and live rooms. Bring your crew and start the hype.",
    img: socialAsset.url,
    accent: "from-[#98f5e1] to-[#bdc2ff]",
    emoji: "🔥",
  },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);

  useEffect(() => {
    try { localStorage.setItem("xo_onboarded", "1"); } catch {}
  }, []);

  const next = () => {
    if (i < SLIDES.length - 1) setI(i + 1);
    else navigate({ to: "/auth" });
  };
  const skip = () => navigate({ to: "/auth" });

  const slide = SLIDES[i];

  const particles = useMemo(
    () => Array.from({ length: 14 }, (_, k) => ({
      left: `${(k * 37) % 100}%`,
      size: 6 + ((k * 13) % 18),
      delay: (k * 0.7) % 6,
      dur: 8 + ((k * 3) % 10),
      hue: k % 2 ? "#ffd66b" : "#bdc2ff",
    })),
    [],
  );

  return (
    <div className="relative min-h-[100dvh] overflow-hidden text-white"
      style={{
        background:
          "radial-gradient(120% 80% at 20% 10%, #6b4cf0 0%, #4b2bb8 35%, #2a1373 70%, #160a3d 100%)",
      }}
    >
      {/* Drifting particles */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {particles.map((p, k) => (
          <span
            key={k}
            className="drift-up absolute rounded-full opacity-70"
            style={{
              left: p.left,
              bottom: -20,
              width: p.size,
              height: p.size,
              background: `radial-gradient(circle, ${p.hue}, transparent 70%)`,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
              filter: "blur(0.5px)",
            }}
          />
        ))}
        {/* Twinkle stars */}
        {Array.from({ length: 18 }).map((_, k) => (
          <span
            key={`s${k}`}
            className="twinkle absolute"
            style={{
              left: `${(k * 53) % 100}%`,
              top: `${(k * 29) % 90}%`,
              width: 4, height: 4, borderRadius: 999,
              background: "white",
              animationDelay: `${(k % 6) * 0.3}s`,
            }}
          />
        ))}
        {/* Glow blobs */}
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle, #ff7eb6, transparent 70%)" }} />
        <div className="absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle, #6bd1ff, transparent 70%)" }} />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-6 pt-6 pb-8">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-white/95 overflow-hidden ring-1 ring-white/30 shadow-lg">
              <img src={logoAsset.url} alt="XO Live" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold tracking-tight text-white/90">XO Live</span>
          </div>
          <button onClick={skip}
            className="text-sm font-semibold text-white/75 hover:text-white px-3 py-1.5 rounded-full active:scale-95 transition">
            Skip
          </button>
        </div>

        {/* Illustration */}
        <div className="flex-1 flex items-center justify-center relative">
          <div
            key={i}
            className={`absolute inset-x-0 mx-auto h-72 w-72 rounded-[2.5rem] blur-2xl opacity-50 bg-gradient-to-br ${slide.accent} animate-pop-in`}
          />
          <img
            key={`img${i}`}
            src={slide.img}
            alt={slide.title}
            width={1024}
            height={1024}
            className="relative z-10 w-[88%] max-w-[360px] aspect-square object-contain float-bob animate-pop-in drop-shadow-[0_30px_50px_rgba(0,0,0,0.45)]"
            loading={i === 0 ? "eager" : "lazy"}
          />
          {/* floating chip */}
          <span
            key={`chip${i}`}
            className="absolute top-6 right-2 z-20 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-sm font-bold ring-1 ring-white/25 float-bob-slow"
          >
            {slide.emoji} New
          </span>
        </div>

        {/* Copy */}
        <div key={`copy${i}`} className="text-center animate-slide-in-up">
          <h1 className="text-[34px] leading-[1.05] font-extrabold tracking-tight">
            {slide.title}
          </h1>
          <p className="mt-3 text-[15px] text-white/75 leading-relaxed max-w-[300px] mx-auto">
            {slide.body}
          </p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-6 mb-5">
          {SLIDES.map((_, k) => (
            <button
              key={k}
              onClick={() => setI(k)}
              aria-label={`Go to slide ${k + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                k === i ? "w-8 bg-white" : "w-2 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <button
            onClick={next}
            className="relative overflow-hidden w-full h-14 rounded-2xl font-bold text-[16px] text-[#2a1373] active:scale-[0.98] transition shadow-[0_18px_40px_-12px_rgba(255,182,206,0.55)]"
            style={{ background: "linear-gradient(135deg, #ffe082, #ffb7ce 60%, #bdc2ff)" }}
          >
            <span className="relative z-10 inline-flex items-center gap-2">
              {i === SLIDES.length - 1 ? "Get Started" : "Next"}
              <Icon name="arrow_forward" />
            </span>
            <span aria-hidden
              className="absolute inset-y-0 left-0 w-1/3 bg-white/40 shine-sweep" />
          </button>
          <button
            onClick={() => navigate({ to: "/auth" })}
            className="w-full h-12 rounded-2xl font-semibold text-white/90 ring-1 ring-white/20 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition"
          >
            I already have an account
          </button>
        </div>
      </div>
    </div>
  );
}
