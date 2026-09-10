import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";
import { getPairState } from "@/lib/pairplay.functions";
import { RoomProvider, useRoom, type Profile } from "@/components/room/RoomProvider";
import { RoomHeader } from "@/components/room/RoomHeader";
import { ReactionBar, ReactionLayer } from "@/components/room/ReactionLayer";
import { CommentStrip } from "@/components/room/CommentStrip";
import { GAMES, gameByKey } from "@/games/registry";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "PairPlay — your room for two" },
      { name: "description", content: "A private room for two: voice always on, reactions, and small games you play together." },
      { property: "og:title", content: "PairPlay — your room for two" },
      { property: "og:description", content: "A private room for two: voice always on, reactions, and small games you play together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "PairPlay — your room for two" },
      { name: "twitter:description", content: "A private room for two: voice always on, reactions, and small games you play together." },
    ],
  }),
  component: RoomPage,
});

function RoomPage() {
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
          <p className="mt-2 text-sm text-ink/50">PairPlay only works with one other person. Invite them, or enter their code.</p>
        </div>
        <Link to="/pair" className="h-12 px-8 rounded-2xl bg-me text-night font-bold grid place-items-center active:scale-95">
          Pair up
        </Link>
        <Link to="/solo" className="text-sm text-ink/40 underline">play against the computer meanwhile</Link>
      </div>
    );
  }

  return (
    <RoomProvider
      roomId={data.room.id}
      me={data.me as Profile}
      partner={data.partner as Profile}
      isHost={data.room.host_id === data.me.id}
    >
      <RoomBody />
      <ReactionLayer />
    </RoomProvider>
  );
}

function RoomBody() {
  const { session, me, partner, partnerOnline, respond, propose, busy, knockReceived } = useRoom();
  const [knockToast, setKnockToast] = useState(false);
  useEffect(() => {
    if (!knockReceived) return;
    setKnockToast(true);
    const t = setTimeout(() => setKnockToast(false), 3000);
    return () => clearTimeout(t);
  }, [knockReceived]);

  const entry = session ? gameByKey(session.game_key) : null;
  const Stage = entry?.component;
  const proposedByThem = session?.status === "proposed" && session.proposed_by !== me.id;
  const proposedByMe = session?.status === "proposed" && session.proposed_by === me.id;
  const partnerName = partner.display_name ?? partner.username;

  return (
    <div className="min-h-screen bg-night flex flex-col">
      <RoomHeader />

      {knockToast && (
        <div className="mx-5 mb-2 rounded-2xl bg-them/20 px-4 py-3 text-sm text-them font-semibold">
          {partnerName} knocked 👋
        </div>
      )}

      <main className="flex-1 pb-4">
        {!partnerOnline && (
          <div className="mx-4 mb-4 rounded-3xl bg-night-2 px-5 py-4 text-sm text-ink/50">
            {partnerName} isn't in the room yet. Knock, or leave a note below — they'll see it.
          </div>
        )}

        {proposedByThem && session && (
          <div className="mx-4 mb-4 rounded-3xl bg-night-3 p-5">
            <p className="text-ink font-semibold">
              {partnerName} wants to play {gameByKey(session.game_key)?.name}
            </p>
            <div className="mt-4 flex gap-2">
              <button disabled={busy} onClick={() => respond(true)} className="flex-1 h-12 rounded-2xl bg-me text-night font-bold active:scale-95">
                Play
              </button>
              <button disabled={busy} onClick={() => respond(false)} className="h-12 px-5 rounded-2xl bg-night-2 text-ink/60 font-semibold active:scale-95">
                Not now
              </button>
            </div>
          </div>
        )}

        {proposedByMe && session && (
          <div className="mx-4 mb-4 rounded-3xl bg-night-2 p-5 text-center">
            <p className="text-sm text-ink/60">
              waiting for {partnerName} to accept {gameByKey(session.game_key)?.name}…
            </p>
          </div>
        )}

        {session?.status === "active" && Stage ? (
          <Suspense fallback={<div className="px-4 text-ink/40 text-sm">loading game…</div>}>
            <Stage sessionId={session.id} />
          </Suspense>
        ) : (
          !proposedByThem && !proposedByMe && (
            <div className="px-4">
              <p className="text-xs uppercase tracking-widest text-ink/35 mb-3">the shelf</p>
              <div className="grid gap-3">
                {GAMES.map((g) => (
                  <button
                    key={g.key}
                    disabled={!partnerOnline || busy}
                    onClick={() => propose(g.key as "xo" | "guess-me")}
                    className="w-full text-left rounded-3xl bg-night-3/70 p-5 active:scale-[0.98] transition-transform disabled:opacity-40"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{g.emoji}</span>
                      <span>
                        <span className="block text-lg font-bold text-ink">{g.name}</span>
                        <span className="block text-sm text-ink/45">{g.tagline}</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        )}
      </main>

      <div className="sticky bottom-0 pb-5 pt-3 bg-gradient-to-t from-night via-night to-transparent space-y-3">
        <ReactionBar />
        <CommentStrip />
      </div>
    </div>
  );
}
