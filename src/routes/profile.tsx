import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "XO Live — Profile" },
      { name: "description", content: "Your XO Live profile, stats, badges, and couple bond." },
    ],
  }),
  component: Profile,
});

const ME =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCje2Mn5IDg9gy7t2mYi3BljpH_Bfm44qEUYVt6_qe8P016H-7fYGbMDnChvug10QAEUm9PDX-bcJ7weItakpn9HHPJTbhmV5FZB6hf4VtzYbyKwx7zNRy9LcUzzgV4wE_Smo6ynU9I6wBUaU7w60IU5n39uyYqETMKB9PqP7dnMYp7AGDT5S8of9Y_SBkXsB3no8Pvj8mf-RpwgnJJAQ3VyAuMVbuxvrJOctrcIg81DmDWO0Fi4hxl0fq_ADDoqhZ870oK9X5cCRHi";
const A1 =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBV6nydS3_v676ProTb_xQSlv8Nvp7wsyKU4QoXVnP4USZ_KxAA_HL44xdF_HLsNXIyxFNCquVsSy2I0b0krWnFoHYMsfoZiQkTisL7jCRfPnDMubVx4F6XzoLAgcy9QU8Qtp1OiamCF3JfG38WI7AWirDIPr2Ch09l0_tuB1JljEOemParK0YPjmxSuPDsarVYrBWJTRiZDgDWkxLH5okxKYHlD3jXunvva7XlIRHFzZEkFDic0kiPWdlWBHUtqEDCADEx4zg336lq";
const A2 =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCYQPI6Apr_fbiIxwnniZLFa1GL7DFyyFBGUfw51bEgQCTDDzHgqi9ioAawx2aNZhfq9msvxTsq-JYs9fdlFWEGkojsXVUlVy8bXf34C2E1SUppQ-lan8A2lHa65N-bLT5Kv_fWCkjZgAcy_aSRdccaVjhVcklzazKBN46oNtd6-MGUVasbci74senuItfENCbrqoS-R0Sf8aong4KxU3ZRL4s6rmxrPI9jTsgmpqnFNpmETXcsfvVNbfXSL08oXZ5doXFoEgDhjehL";

const BADGES = [
  { e: "🏆", n: "Grandmaster", on: true },
  { e: "⚡", n: "Speedster", on: true },
  { e: "🛡️", n: "Defender", on: false },
  { e: "👑", n: "Unstoppable", on: false },
  { e: "🎯", n: "Sniper", on: true },
];

function Profile() {
  return (
    <Shell>
      <div className="space-y-6">
        <header className="flex flex-col items-center text-center py-8 bg-surface-container-low rounded-3xl border border-white shadow-sm">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full border-4 border-secondary p-1">
              <img src={ME} alt="Jordan" className="w-full h-full rounded-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold border-2 border-surface">
              LVL 42
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary">Jordan Dash</h1>
          <p className="text-base font-medium text-on-surface-variant mb-4">
            Tactical XO Strategist ♟️
          </p>
          <div className="flex gap-3">
            <button className="flex items-center gap-1 px-5 py-2 bg-primary text-white rounded-full text-sm font-semibold tracking-wider hover:opacity-90 active:scale-95 transition shadow-md">
              <Icon name="edit" className="text-[18px]" />
              Edit Profile
            </button>
            <button className="p-2 bg-surface-container-highest text-primary rounded-full hover:bg-surface-variant active:scale-95 transition">
              <Icon name="settings" />
            </button>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3">
          <div className="bg-primary-container p-6 rounded-2xl flex flex-col justify-between">
            <span className="text-xs font-bold text-on-primary-container opacity-70 uppercase tracking-widest">
              Wins
            </span>
            <div className="flex items-baseline gap-1 mt-4">
              <span className="text-5xl font-bold text-on-primary-container tracking-tight">342</span>
              <Icon
                name="workspace_premium"
                filled
                className="text-on-primary-container"
              />
            </div>
          </div>
          <div className="bg-surface-container p-6 rounded-2xl flex flex-col justify-between">
            <span className="text-xs font-bold text-on-surface-variant opacity-70 uppercase tracking-widest">
              Games Played
            </span>
            <span className="text-5xl font-bold text-primary tracking-tight mt-4">512</span>
          </div>
          <div className="bg-surface-container p-6 rounded-2xl flex flex-col items-center text-center">
            <span className="text-xs font-bold text-on-surface-variant opacity-70 uppercase tracking-widest mb-1">
              Reaction Stat
            </span>
            <div className="text-4xl mb-1">🔥</div>
            <span className="text-sm font-semibold">Spicy Reaction</span>
          </div>
          <div className="bg-secondary-container p-6 rounded-2xl flex flex-col justify-between">
            <span className="text-xs font-bold text-on-secondary-container opacity-70 uppercase tracking-widest">
              Win Rate
            </span>
            <div className="relative h-16 w-16 self-center mt-2">
              <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
                <circle
                  className="text-secondary opacity-20"
                  cx="24"
                  cy="24"
                  r="20"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <circle
                  className="text-on-secondary-container"
                  cx="24"
                  cy="24"
                  r="20"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray="125.6"
                  strokeDashoffset="41"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-on-secondary-container">
                67%
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface-container-highest p-6 rounded-3xl border-b-4 border-outline-variant">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-1">
              <Icon name="favorite" filled className="text-error" />
              <h2 className="text-2xl font-semibold text-primary">Couple Bond</h2>
            </div>
            <div className="flex -space-x-3">
              <img src={A1} alt="" className="w-8 h-8 rounded-full border-2 border-surface" />
              <img src={A2} alt="" className="w-8 h-8 rounded-full border-2 border-surface" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-semibold text-secondary tracking-wider">
              <span>Soulmates Rank</span>
              <span>LVL 12</span>
            </div>
            <div className="w-full h-4 bg-surface rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-secondary to-tertiary-container transition-all duration-1000"
                style={{ width: "78%" }}
              />
            </div>
            <p className="text-center text-xs text-outline italic">
              22 more games together to reach 'Inseparable'!
            </p>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-on-surface-variant px-1 uppercase tracking-widest">
            Badges Earned
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 px-1 hide-scrollbar">
            {BADGES.map((b) => (
              <div
                key={b.n}
                className={`flex-shrink-0 w-24 h-24 bg-surface-container rounded-2xl flex flex-col items-center justify-center border border-white shadow-sm ${
                  b.on ? "" : "opacity-50 grayscale"
                }`}
              >
                <span className="text-3xl mb-1">{b.e}</span>
                <span className="text-[10px] font-bold tracking-wider">{b.n}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}
