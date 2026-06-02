import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { createRoom } from "@/lib/xo.functions";

export const Route = createFileRoute("/_authenticated/create-room")({
  head: () => ({ meta: [{ title: "XO Live — Create Room" }] }),
  component: CreateRoomPage,
});

const MODES = [
  { id: "classic", label: "Classic", icon: "grid_3x3", desc: "3×3 best of one" },
  { id: "blitz", label: "Blitz", icon: "bolt", desc: "10s per move" },
  { id: "ranked", label: "Ranked", icon: "military_tech", desc: "Affects rank" },
] as const;

const BETS = [0, 50, 100, 250] as const;

function CreateRoomPage() {
  const navigate = useNavigate();
  const create = useServerFn(createRoom);
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("classic");
  const [bet, setBet] = useState<number>(50);
  const m = useMutation({
    mutationFn: () => create({ data: { mode, bet, isQuick: false } }),
    onSuccess: (room) => navigate({ to: "/game", search: { code: room.code, mode, bet } as never }),
  });
  const code = useMemo(() => "------", []); // placeholder

  return (
    <Shell>
      <div className="space-y-6">
        <header>
          <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-1 text-on-surface-variant text-sm font-semibold mb-3 active:scale-95">
            <Icon name="arrow_back" className="text-[20px]" /> Back
          </button>
          <h1 className="text-3xl font-bold text-on-surface">Create a Room</h1>
          <p className="text-base font-medium text-on-surface-variant mt-1">Set the rules, get a code, crush your friend.</p>
        </header>

        <section>
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest mb-3">Game Mode</h3>
          <div className="grid grid-cols-3 gap-3">
            {MODES.map((md) => {
              const active = mode === md.id;
              return (
                <button key={md.id} onClick={() => setMode(md.id)}
                  className={`p-4 rounded-2xl text-left border-2 transition active:scale-95 ${active ? "bg-secondary-container border-secondary text-on-secondary-container" : "bg-surface-container border-transparent text-on-surface-variant"}`}>
                  <Icon name={md.icon} filled={active} className="text-2xl mb-1 block" />
                  <p className="text-sm font-bold">{md.label}</p>
                  <p className="text-[10px] opacity-80 mt-0.5 leading-tight">{md.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest mb-3">Coin Bet</h3>
          <div className="flex gap-2">
            {BETS.map((b) => {
              const active = bet === b;
              return (
                <button key={b} onClick={() => setBet(b)}
                  className={`flex-1 py-3 rounded-2xl text-base font-bold transition active:scale-95 ${active ? "bg-primary text-on-primary shadow-[0_4px_0_#394086]" : "bg-surface-container text-on-surface-variant"}`}>
                  {b === 0 ? "Free" : `${b} 🪙`}
                </button>
              );
            })}
          </div>
        </section>

        {m.error && <p className="text-error text-sm font-semibold">{(m.error as Error).message}</p>}

        <button onClick={() => m.mutate()} disabled={m.isPending}
          className="bubbly w-full bg-secondary text-on-secondary py-5 rounded-2xl flex items-center justify-center gap-2 shadow-[0_6px_0_0_#26288c] text-xl font-bold disabled:opacity-60">
          <Icon name="rocket_launch" filled />
          {m.isPending ? "Creating…" : "Open Room"}
        </button>
        <p className="text-center text-xs text-on-surface-variant">{code === "------" ? "A 6-character code will be generated." : code}</p>
      </div>
    </Shell>
  );
}
