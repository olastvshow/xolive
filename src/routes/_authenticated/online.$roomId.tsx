import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getMatchRoom, leaveMatchRoom } from "@/lib/online.functions";
import { RoomScreen } from "@/components/room/RoomScreen";
import type { Profile } from "@/games/play-context";

export const Route = createFileRoute("/_authenticated/online/$roomId")({
  head: () => ({
    meta: [
      { title: "Online match — Duet" },
      { name: "description", content: "A live Duet match room with voice, reactions and five games." },
      { property: "og:title", content: "Online match — Duet" },
      { property: "og:description", content: "A live Duet match room with voice, reactions and five games." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Online match — Duet" },
      { name: "twitter:description", content: "A live Duet match room with voice, reactions and five games." },
    ],
  }),
  component: OnlineRoom,
});

function OnlineRoom() {
  const { roomId } = useParams({ from: "/_authenticated/online/$roomId" });
  const navigate = useNavigate();
  const fetchRoom = useServerFn(getMatchRoom);
  const leave = useServerFn(leaveMatchRoom);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["match-room", roomId],
    queryFn: () => fetchRoom({ data: { roomId } }),
    retry: false,
  });

  const waiting = Boolean(data && !data.partner);
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => { refetch(); }, 2500);
    return () => clearInterval(id);
  }, [waiting, refetch]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-night grid place-items-center">
        <div className="w-10 h-10 rounded-full border-2 border-me/30 border-t-me animate-spin" />
      </div>
    );
  }

  if (!data?.me) {
    return (
      <div className="min-h-screen bg-night grid place-items-center px-8 text-center">
        <div>
          <p className="text-ink font-bold text-xl">This room isn't available.</p>
          <button onClick={() => navigate({ to: "/play" })} className="mt-5 h-12 px-6 rounded-2xl bg-me text-night font-bold">
            Back to online
          </button>
        </div>
      </div>
    );
  }

  if (!data.partner) {
    return (
      <div className="min-h-screen bg-night grid place-items-center px-8 text-center">
        <div>
          <p className="text-6xl animate-pulse">🕰️</p>
          <p className="mt-4 text-xl font-bold text-ink">Waiting for someone to join</p>
          {data.room.code && (
            <p className="mt-3 text-4xl font-black tracking-[0.3em] text-me tabular-nums">{data.room.code}</p>
          )}
          <p className="mt-2 text-sm text-ink/45">Share that code — they can enter it from Play online.</p>
          <button
            onClick={async () => { await leave({ data: { roomId } }); navigate({ to: "/play" }); }}
            className="mt-7 h-12 px-6 rounded-2xl bg-night-2 text-ink/60 font-semibold active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <RoomScreen
      roomId={roomId}
      me={data.me as Profile}
      partner={data.partner as Profile}
      isHost={data.isHost}
      banner="online match"
      leaveLabel="End match"
      onLeaveRoom={async () => { await leave({ data: { roomId } }); navigate({ to: "/play" }); }}
    />
  );
}
