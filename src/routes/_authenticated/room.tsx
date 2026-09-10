import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getPairState } from "@/lib/pairplay.functions";
import { RoomScreen } from "@/components/room/RoomScreen";
import type { Profile } from "@/games/play-context";

export const Route = createFileRoute("/_authenticated/room")({
  head: () => ({
    meta: [
      { title: "Your room — PairPlay" },
      { name: "description", content: "A private room for two: voice always on, reactions, and small games you play together." },
      { property: "og:title", content: "Your room — PairPlay" },
      { property: "og:description", content: "A private room for two: voice always on, reactions, and small games you play together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Your room — PairPlay" },
      { name: "twitter:description", content: "A private room for two: voice always on, reactions, and games." },
    ],
  }),
  component: PairRoom,
});

function PairRoom() {
  const fn = useServerFn(getPairState);
  const { data, isLoading } = useQuery({ queryKey: ["pair-state"], queryFn: () => fn(), retry: false });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-night grid place-items-center">
        <div className="w-10 h-10 rounded-full border-2 border-me/30 border-t-me animate-spin" />
      </div>
    );
  }

  if (!data?.partner || !data.room || !data.me) {
    return (
      <div className="min-h-screen bg-night flex flex-col items-center justify-center gap-6 px-8 text-center">
        <div className="text-5xl">🫂</div>
        <div>
          <h1 className="text-2xl font-bold text-ink">Your room is waiting</h1>
          <p className="mt-2 text-sm text-ink/50">This room only works with one other person. Invite them, or enter their code.</p>
        </div>
        <Link to="/pair" className="h-12 px-8 rounded-2xl bg-me text-night font-bold grid place-items-center active:scale-95">
          Pair up
        </Link>
        <Link to="/" className="text-sm text-ink/40 underline">back home</Link>
      </div>
    );
  }

  return (
    <RoomScreen
      roomId={data.room.id}
      me={data.me as Profile}
      partner={data.partner as Profile}
      isHost={data.room.host_id === data.me.id}
    />
  );
}
