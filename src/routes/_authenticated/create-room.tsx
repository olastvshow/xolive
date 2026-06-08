import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { createRoom } from "@/lib/xo.functions";

export const Route = createFileRoute("/_authenticated/create-room")({
  head: () => ({ meta: [{ title: "XO Live — Create Room" }] }),
  component: CreateRoomPage,
});

function CreateRoomPage() {
  const navigate = useNavigate();
  const create = useServerFn(createRoom);
  const m = useMutation({
    mutationFn: () => create({ data: { mode: "classic", bet: 0, isQuick: false } }),
    onSuccess: (room) => navigate({ to: "/game", search: { code: room.code } as never }),
  });

  return (
    <Shell>
      <div className="space-y-6">
        <header>
          <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-1 text-on-surface-variant text-sm font-semibold mb-3 active:scale-95">
            <Icon name="arrow_back" className="text-[20px]" /> Back
          </button>
          <h1 className="text-3xl font-bold text-on-surface">Create a Room</h1>
          <p className="text-base font-medium text-on-surface-variant mt-1">Open a room, share the code, crush your friend.</p>
        </header>

        <section className="rounded-3xl bg-primary-container/60 p-5 border-2 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center shrink-0">
              <Icon name="info" filled />
            </div>
            <div className="text-sm text-on-primary-container">
              <p className="font-bold mb-1">Classic match · Free play</p>
              <p className="opacity-90 leading-relaxed">
                Best-of-1 round, no timer, no coin bets. We'll generate a 6-character code you can share with anyone.
              </p>
            </div>
          </div>
        </section>

        {m.error && <p className="text-error text-sm font-semibold">{(m.error as Error).message}</p>}

        <button onClick={() => m.mutate()} disabled={m.isPending}
          className="bubbly w-full bg-secondary text-on-secondary py-5 rounded-2xl flex items-center justify-center gap-2 shadow-[0_6px_0_0_#26288c] text-xl font-bold disabled:opacity-60">
          <Icon name="rocket_launch" filled />
          {m.isPending ? "Creating…" : "Open Room"}
        </button>
      </div>
    </Shell>
  );
}
