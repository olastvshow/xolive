import { Suspense, useEffect, useMemo, useState } from "react";
import { RoomProvider, useRoom } from "@/components/room/RoomProvider";
import { RoomHeader } from "@/components/room/RoomHeader";
import { ReactionLayer } from "@/components/room/ReactionLayer";
import { RoomDock } from "@/components/room/RoomDock";
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
  const [confirmLeave, setConfirmLeave] = useState(false);

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
  const playing = (session?.status === "active" || session?.status === "ended") && Boolean(Stage);

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
    <div className="flex min-h-[100dvh] flex-col bg-night text-ink">
      <RoomHeader
        onLeave={onLeaveRoom ? () => setConfirmLeave(true) : undefined}
        leaveLabel={leaveLabel ?? "Leave room"}
      />

      {banner && (
        <p className="px-5 pt-3 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-ink/30">{banner}</p>
      )}

      {knockToast && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-2xl bg-pop/12 px-4 py-3 text-sm font-semibold text-pop">
          <Glyph name="knock" size={17} />
          {partnerName} knocked
        </div>
      )}

      <main className="flex-1 pb-32 pt-4">
        {!partnerOnline && !playing && (
          <div className="mx-4 mb-4 rounded-3xl border border-white/8 bg-night-2 px-5 py-4 text-sm text-ink/50">
            {partnerName} isn't here yet. Knock, or leave a message — they'll see it.
          </div>
        )}

        {proposedByThem && session && (
          <div className="mx-4 mb-4 rounded-[26px] border border-white/8 bg-night-3 p-5">
            <p className="font-display text-lg">
              {partnerName} wants to play {gameByKey(session.game_key)?.name}
            </p>
            <div className="mt-4 flex gap-2">
              <button disabled={busy} onClick={() => respond(true)} className="btn-pop h-12 flex-1">Play</button>
              <button disabled={busy} onClick={() => respond(false)} className="h-12 rounded-full bg-white/6 px-5 font-semibold text-ink/60 press">
                Not now
              </button>
            </div>
          </div>
        )}

        {proposedByMe && session && (
          <div className="mx-4 mb-4 rounded-[26px] border border-white/8 bg-night-2 p-5 text-center text-sm text-ink/50">
            Waiting for {partnerName} to accept {gameByKey(session.game_key)?.name}…
          </div>
        )}

        {playing && Stage ? (
          <PlayProvider value={playValue}>
            <Suspense fallback={<div className="px-4 text-sm text-ink/40">loading game…</div>}>
              <Stage />
            </Suspense>
          </PlayProvider>
        ) : (
          !proposedByThem && !proposedByMe && (
            <div className="px-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-ink/30">The shelf</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {GAMES.map((g) => (
                  <button
                    key={g.key}
                    disabled={!partnerOnline || busy}
                    onClick={() => propose(g.key as GameKey)}
                    className="tile relative flex items-center gap-3 overflow-hidden p-4 text-left disabled:opacity-40"
                    style={{ background: g.wash }}
                  >
                    <img
                      src={g.character}
                      alt=""
                      width={768}
                      height={768}
                      loading="lazy"
                      className="h-16 w-16 shrink-0 object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.5)]"
                    />
                    <span className="min-w-0">
                      <span className="block font-display text-lg leading-tight">{g.name}</span>
                      <span className="mt-0.5 block text-xs text-white/55">{g.tagline}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        )}
      </main>

      <RoomDock />

      {confirmLeave && onLeaveRoom && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-night/85 px-8 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-night-2 p-6 text-center">
            <p className="font-display text-xl">{leaveLabel ?? "Leave room"}?</p>
            <p className="mt-1.5 text-sm text-ink/45">The game in progress will end.</p>
            <div className="mt-6 flex gap-2">
              <button onClick={() => setConfirmLeave(false)} className="h-12 flex-1 rounded-full bg-white/6 font-semibold text-ink/70 press">
                Stay
              </button>
              <button onClick={onLeaveRoom} className="h-12 flex-1 rounded-full bg-knowus font-bold text-night press">
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
