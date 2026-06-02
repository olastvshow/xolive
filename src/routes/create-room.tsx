import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/create-room")({
  head: () => ({
    meta: [
      { title: "XO Live — Create Room" },
      { name: "description", content: "Spin up a private XO Live room and invite a friend." },
    ],
  }),
  component: CreateRoom,
});

const MODES = [
  { id: "classic", label: "Classic", icon: "grid_3x3", desc: "3×3 best of one" },
  { id: "blitz", label: "Blitz", icon: "bolt", desc: "10s per move" },
  { id: "ranked", label: "Ranked", icon: "military_tech", desc: "Affects your global rank" },
] as const;

const BETS = [0, 50, 100, 250] as const;

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function CreateRoom() {
  const navigate = useNavigate();
  const code = useMemo(makeCode, []);
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("classic");
  const [bet, setBet] = useState<number>(50);
  const [privateRoom, setPrivateRoom] = useState(true);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <Shell>
      <div className="space-y-8">
        <header>
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex items-center gap-1 text-on-surface-variant text-sm font-semibold mb-3 active:scale-95 transition"
          >
            <Icon name="arrow_back" className="text-[20px]" /> Back
          </button>
          <h1 className="text-3xl font-bold text-on-surface">Create a Room</h1>
          <p className="text-base font-medium text-on-surface-variant mt-1">
            Set the rules. Share the code. Crush your friend.
          </p>
        </header>

        {/* Room code */}
        <section className="bubbly bg-primary text-on-primary p-6 rounded-3xl shadow-[0_8px_0_0_#394086]">
          <p className="text-xs font-bold tracking-widest uppercase opacity-80">Invite Code</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-5xl font-bold tracking-[0.3em]">{code}</span>
            <button
              onClick={copy}
              className="bg-white/15 hover:bg-white/25 active:scale-95 transition rounded-full p-3"
              aria-label="Copy code"
            >
              <Icon name={copied ? "check" : "content_copy"} />
            </button>
          </div>
          <p className="text-xs opacity-80 mt-3">
            {copied ? "Copied to clipboard!" : "Tap copy and send it to your opponent."}
          </p>
        </section>

        {/* Mode */}
        <section>
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest mb-3">
            Game Mode
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {MODES.map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`p-4 rounded-2xl text-left border-2 transition active:scale-95 ${
                    active
                      ? "bg-secondary-container border-secondary text-on-secondary-container"
                      : "bg-surface-container border-transparent text-on-surface-variant"
                  }`}
                >
                  <Icon name={m.icon} filled={active} className="text-2xl mb-1 block" />
                  <p className="text-sm font-bold">{m.label}</p>
                  <p className="text-[10px] opacity-80 mt-0.5 leading-tight">{m.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Bet */}
        <section>
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest mb-3">
            Coin Bet
          </h3>
          <div className="flex gap-2">
            {BETS.map((b) => {
              const active = bet === b;
              return (
                <button
                  key={b}
                  onClick={() => setBet(b)}
                  className={`flex-1 py-3 rounded-2xl text-base font-bold transition active:scale-95 ${
                    active
                      ? "bg-primary text-on-primary shadow-[0_4px_0_#394086]"
                      : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {b === 0 ? "Free" : `${b} 🪙`}
                </button>
              );
            })}
          </div>
        </section>

        {/* Privacy toggle */}
        <section className="bg-surface-container rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-on-surface">Private Room</p>
            <p className="text-xs text-on-surface-variant">
              Only people with the code can join.
            </p>
          </div>
          <button
            onClick={() => setPrivateRoom((p) => !p)}
            className={`relative w-12 h-7 rounded-full transition ${
              privateRoom ? "bg-primary" : "bg-outline-variant"
            }`}
            aria-pressed={privateRoom}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                privateRoom ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </section>

        <button
          onClick={() => navigate({ to: "/game", search: { code, mode, bet } as never })}
          className="bubbly w-full bg-secondary text-on-secondary py-5 rounded-2xl flex items-center justify-center gap-2 shadow-[0_6px_0_0_#26288c] text-xl font-bold"
        >
          <Icon name="rocket_launch" filled />
          Open Room
        </button>
      </div>
    </Shell>
  );
}
