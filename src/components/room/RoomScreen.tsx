import { Suspense, useEffect, useMemo, useState } from "react";
import { RoomProvider, useRoom } from "@/components/room/RoomProvider";
import { RoomHeader } from "@/components/room/RoomHeader";
import { ReactionBar, ReactionLayer } from "@/components/room/ReactionLayer";
import { CommentStrip } from "@/components/room/CommentStrip";
import { PlayProvider, displayName, type PlayValue, type Profile } from "@/games/play-context";
import { GAMES, gameByKey } from "@/games/registry";
import type { GameKey } from "@/games/logic";
import { Glyph } from "@/components/Glyph";

export function RoomScreen({
  roomId, me, partner, isHost, banner, onLeaveRoom, leaveLabel,
}: {
  roomId: string;
  me: Profile;
  partner: Profile;
  isHost: boolean;
  banner?: string;
  onLeaveRoom?: () => void;
  leaveLabel?: string;
}) {
  return (
    <RoomProvider roomId={roomId} me={me} partner={partner} isHost={isHost}>
      <RoomBody banner={banner} onLeaveRoom={onLeaveRoom} leaveLabel={leaveLabel} />
      <ReactionLayer />
    </RoomProvider>
  );
}

function RoomBody({
  banner, onLeaveRoom, leaveLabel,
}: { banner?: string; onLeaveRoom?: () => void; leaveLabel?: string }) {
  const room = useRoom();
  const { session, me, partner, partnerOnline, respond, propose, busy, knockReceived } = room;
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
  const partnerName = displayName(partner);

  const playValue = useMemo<PlayValue>(() => ({
    me,
    partner,
    gameKey: session?.game_key ?? "xo",
    state: session?.state ?? null,
    players: session?.players ?? [me.id, partner.id],
    isHost: room.isHost,
    live: true,
    partnerOnline,
    busy,
    play: room.play,
    restart: room.restart,
    leaveGame: room.leaveGame,
    sendStream: room.sendStream,
    onStream: room.onStream,
  }), [me, partner, session, room, partnerOnline, busy]);

  return (
    <div className="min-h-screen bg-night flex flex-col">
      <RoomHeader />

      {banner && (
        <p className="mx-5 mb-2 text-center text-xs uppercase tracking-widest text-ink/35">{banner}</p>
      )}

      {knockToast && (
        <div className="mx-5 mb-2 flex items-center gap-2 rounded-2xl bg-them/15 px-4 py-3 text-sm text-them font-semibold">
          <Glyph name="knock" size={17} />
          {partnerName} knocked
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
          <PlayProvider value={playValue}>
            <Suspense fallback={<div className="px-4 text-ink/40 text-sm">loading game…</div>}>
              <Stage />
            </Suspense>
          </PlayProvider>
        ) : (
          !proposedByThem && !proposedByMe && (
            <div className="px-4">
              <p className="text-xs uppercase tracking-widest text-ink/35 mb-3">the shelf</p>
              <div className="grid gap-3">
                {GAMES.map((g) => (
                  <button
                    key={g.key}
                    disabled={!partnerOnline || busy}
                    onClick={() => propose(g.key as GameKey)}
                    className="w-full text-left rounded-3xl bg-night-3/70 p-5 active:scale-[0.98] transition-transform disabled:opacity-40"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-10 h-10 rounded-full bg-night-2 grid place-items-center text-them shrink-0">
                        <Glyph name={g.icon} size={19} />
                      </span>
                      <span>
                        <span className="block text-lg font-bold text-ink">{g.name}</span>
                        <span className="block text-sm text-ink/45">{g.tagline}</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {onLeaveRoom && (
                <button
                  onClick={onLeaveRoom}
                  className="mt-5 w-full h-12 rounded-2xl bg-night-2 text-ink/50 font-semibold active:scale-95"
                >
                  {leaveLabel ?? "Leave room"}
                </button>
              )}
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
