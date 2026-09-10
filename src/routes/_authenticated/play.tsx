import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  lobbyPing, invitePlayer, myInvites, respondInvite, cancelInvite, createCodeRoom, joinByCode, inviteStatus,
} from "@/lib/online.functions";
import { GAMES } from "@/games/registry";
import type { GameKey } from "@/games/logic";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/play")({
  head: () => ({
    meta: [
      { title: "Play online — PairPlay" },
      { name: "description", content: "Find someone online, send an invite, or open a room with a six-character code." },
      { property: "og:title", content: "Play online — PairPlay" },
      { property: "og:description", content: "Find someone online, send an invite, or open a room with a six-character code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Play online — PairPlay" },
      { name: "twitter:description", content: "Find someone online, send an invite, or open a room with a code." },
    ],
  }),
  component: PlayOnline,
});

type Player = { id: string; username: string; display_name: string | null; avatar_url: string | null };

function PlayOnline() {
  const navigate = useNavigate();
  const ping = useServerFn(lobbyPing);
  const invite = useServerFn(invitePlayer);
  const invites = useServerFn(myInvites);
  const answer = useServerFn(respondInvite);
  const cancel = useServerFn(cancelInvite);
  const checkInvite = useServerFn(inviteStatus);
  const openRoom = useServerFn(createCodeRoom);
  const join = useServerFn(joinByCode);

  const [game, setGame] = useState<GameKey>("xo");
  const [pending, setPending] = useState<{ inviteId: string; roomId: string; name: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: players = [] } = useQuery({
    queryKey: ["lobby"],
    queryFn: () => ping({ data: { available: true } }) as Promise<Player[]>,
    refetchInterval: 5000,
  });

  const { data: incoming = [] } = useQuery({
    queryKey: ["invites"],
    queryFn: () => invites(),
    refetchInterval: 3000,
  });

  // watch my outgoing invite
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(async () => {
      const row = await checkInvite({ data: { inviteId: pending.inviteId } });
      if (!row) return;
      if (row.status === "accepted") {
        clearInterval(id);
        navigate({ to: "/online/$roomId", params: { roomId: pending.roomId } });
      }
      if (row.status === "declined" || new Date(row.expires_at).getTime() < Date.now()) {
        clearInterval(id);
        setPending(null);
        setError(row.status === "declined" ? "They passed this time." : "No answer — try someone else.");
      }
    }, 2000);
    return () => clearInterval(id);
  }, [pending, checkInvite, navigate]);

  const send = async (p: Player) => {
    setError(null);
    setBusy(true);
    try {
      const res = await invite({ data: { toUserId: p.id, gameKey: game } });
      setPending({ inviteId: res.inviteId, roomId: res.roomId, name: p.display_name ?? p.username });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send that invite");
    } finally { setBusy(false); }
  };

  const accept = async (inviteId: string, accepted: boolean) => {
    setBusy(true);
    try {
      const res = await answer({ data: { inviteId, accept: accepted } });
      if (res.roomId) navigate({ to: "/online/$roomId", params: { roomId: res.roomId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That invite is gone");
    } finally { setBusy(false); }
  };

  const firstInvite = incoming[0];

  return (
    <div className="min-h-screen bg-night text-ink">
      <div className="max-w-md mx-auto px-5 pt-8 pb-24">
        <div className="flex items-center gap-3">
          <Link to="/" className="w-10 h-10 rounded-2xl bg-night-3 grid place-items-center" aria-label="Back">‹</Link>
          <h1 className="text-2xl font-black">Play online</h1>
        </div>

        <p className="mt-6 text-xs uppercase tracking-widest text-ink/35">pick the game first</p>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {GAMES.map((g) => (
            <button
              key={g.key}
              onClick={() => setGame(g.key)}
              className={cn(
                "shrink-0 rounded-2xl px-4 h-11 font-semibold text-sm active:scale-95 transition-transform",
                game === g.key ? "bg-me text-night" : "bg-night-3 text-ink/60",
              )}
            >
              {g.emoji} {g.name}
            </button>
          ))}
        </div>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-ink/35">who's around</p>
            <span className="flex items-center gap-2 text-xs text-ink/35">
              <span className="w-2 h-2 rounded-full bg-me animate-pulse" /> scanning
            </span>
          </div>

          <div className="mt-3 grid gap-2">
            {players.length === 0 && (
              <p className="rounded-3xl bg-night-2 px-5 py-6 text-sm text-ink/45 text-center">
                Nobody else is here yet. Keep this open — or share a room code below.
              </p>
            )}
            {players.map((p) => (
              <button
                key={p.id}
                disabled={busy || Boolean(pending)}
                onClick={() => send(p)}
                className="flex items-center gap-3 rounded-3xl bg-night-3/80 px-4 py-3.5 active:scale-[0.98] transition-transform disabled:opacity-40"
              >
                <span className="w-10 h-10 rounded-2xl bg-night-2 grid place-items-center overflow-hidden">
                  {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : "🙂"}
                </span>
                <span className="font-semibold">{p.display_name ?? p.username}</span>
                <span className="ml-auto text-xs uppercase tracking-widest text-me">invite</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-9">
          <p className="text-xs uppercase tracking-widest text-ink/35">or use a code</p>
          <div className="mt-3 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              className="flex-1 h-12 rounded-2xl bg-night-2 px-4 font-bold tracking-[0.25em] text-ink placeholder:text-ink/20 outline-none focus:ring-2 focus:ring-me"
            />
            <button
              disabled={code.length !== 6 || busy}
              onClick={async () => {
                setError(null); setBusy(true);
                try {
                  const res = await join({ data: { code } });
                  navigate({ to: "/online/$roomId", params: { roomId: res.roomId } });
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Couldn't join");
                } finally { setBusy(false); }
              }}
              className="h-12 px-5 rounded-2xl bg-me text-night font-bold disabled:opacity-30 active:scale-95"
            >
              Join
            </button>
          </div>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await openRoom();
                navigate({ to: "/online/$roomId", params: { roomId: res.roomId } });
              } finally { setBusy(false); }
            }}
            className="mt-2 w-full h-12 rounded-2xl bg-night-3 text-ink font-semibold active:scale-95"
          >
            Open a room and get a code
          </button>
        </section>

        {error && <p className="mt-5 text-center text-sm text-them">{error}</p>}
      </div>

      {pending && (
        <div className="fixed inset-0 bg-night/90 grid place-items-center px-8 text-center">
          <div>
            <div className="w-24 h-24 mx-auto rounded-full border-2 border-me/40 border-t-me animate-spin" />
            <p className="mt-6 text-xl font-bold">Ringing {pending.name}…</p>
            <p className="mt-1 text-sm text-ink/45">They have 45 seconds to answer.</p>
            <button
              onClick={async () => { await cancel({ data: { inviteId: pending.inviteId } }); setPending(null); }}
              className="mt-7 h-12 px-6 rounded-2xl bg-night-2 text-ink/60 font-semibold active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {firstInvite && !pending && (
        <div className="fixed inset-0 bg-night/90 grid place-items-center px-8 text-center">
          <div className="w-full max-w-sm rounded-[28px] bg-night-3 p-7">
            <p className="text-5xl">🔔</p>
            <p className="mt-4 text-xl font-bold">
              {firstInvite.from?.display_name ?? firstInvite.from?.username ?? "Someone"} wants to play
            </p>
            <p className="mt-1 text-sm text-ink/50">
              {GAMES.find((g) => g.key === firstInvite.game_key)?.name ?? "a game"}
            </p>
            <div className="mt-6 flex gap-2">
              <button
                disabled={busy}
                onClick={() => accept(firstInvite.id, true)}
                className="flex-1 h-12 rounded-2xl bg-me text-night font-bold active:scale-95"
              >
                Play
              </button>
              <button
                disabled={busy}
                onClick={() => accept(firstInvite.id, false)}
                className="h-12 px-5 rounded-2xl bg-night-2 text-ink/60 font-semibold active:scale-95"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
