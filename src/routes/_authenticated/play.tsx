import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  lobbyPing, invitePlayer, myInvites, respondInvite, cancelInvite, createCodeRoom, joinByCode, inviteStatus,
} from "@/lib/online.functions";
import { GAMES } from "@/games/registry";
import { GAME_KEYS, type GameKey } from "@/games/logic";
import { cn } from "@/lib/utils";
import { Glyph } from "@/components/Glyph";
import { PageHeader } from "@/components/PageHeader";
import { TabBar } from "@/components/TabBar";

export const Route = createFileRoute("/_authenticated/play")({
  validateSearch: (search: Record<string, unknown>): { game?: GameKey } => {
    const g = search.game;
    return typeof g === "string" && (GAME_KEYS as readonly string[]).includes(g)
      ? { game: g as GameKey }
      : {};
  },
  head: () => ({
    meta: [
      { title: "Play online — Duet" },
      { name: "description", content: "Find someone online, send an invite, or open a room with a six-character code." },
      { property: "og:title", content: "Play online — Duet" },
      { property: "og:description", content: "Find someone online, send an invite, or open a room with a six-character code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Play online — Duet" },
      { name: "twitter:description", content: "Find someone online, send an invite, or open a room with a code." },
    ],
  }),
  component: PlayOnline,
});

type Player = { id: string; username: string; display_name: string | null; avatar_url: string | null };

function PlayOnline() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/play" });
  const ping = useServerFn(lobbyPing);
  const invite = useServerFn(invitePlayer);
  const invites = useServerFn(myInvites);
  const answer = useServerFn(respondInvite);
  const cancel = useServerFn(cancelInvite);
  const checkInvite = useServerFn(inviteStatus);
  const openRoom = useServerFn(createCodeRoom);
  const join = useServerFn(joinByCode);

  const [game, setGame] = useState<GameKey>(search.game ?? "xo");
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

  const active = GAMES.find((g) => g.key === game)!;

  return (
    <div className="min-h-[100dvh] bg-night text-ink">
      <TabBar />
      <div className="mx-auto w-full max-w-2xl px-5 pt-7 pb-32 lg:pt-10">
        <PageHeader title="Rooms" subtitle="Find someone online, or open a room with a code" back="/" />

        {/* selected game hero */}
        <section
          className="mt-6 relative overflow-hidden rounded-[30px] p-5"
          style={{ background: active.wash }}
        >
          <div className="relative z-10 flex items-center gap-4">
            <img src={active.character} alt="" className="h-20 w-20 shrink-0 object-contain drop-shadow-xl" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-ink/45">playing</p>
              <h2 className="mt-1 truncate font-display text-2xl">{active.name}</h2>
              <p className="mt-0.5 truncate text-xs text-ink/55">{active.tagline}</p>
            </div>
          </div>
          <span
            className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-25 blur-2xl"
            style={{ background: active.accent }}
          />
        </section>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {GAMES.map((g) => (
            <button
              key={g.key}
              onClick={() => setGame(g.key)}
              className={cn(
                "press inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-bold transition-colors",
                game === g.key ? "text-night" : "bg-night-2 text-ink/55",
              )}
              style={game === g.key ? { background: g.accent } : undefined}
            >
              <Glyph name={g.icon} size={15} /> {g.name}
            </button>
          ))}
        </div>

        {/* lobby */}
        <section className="mt-7 rounded-[28px] border border-white/5 bg-night-2/60 p-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-ink/35">who's around</p>
            <span className="flex items-center gap-2 rounded-full bg-night-3/70 px-2.5 py-1 text-[11px] text-ink/45">
              <span className="h-1.5 w-1.5 rounded-full bg-me animate-pulse" /> scanning
            </span>
          </div>

          <div className="mt-3 grid gap-2">
            {players.length === 0 && (
              <div className="rounded-3xl border border-dashed border-white/10 px-5 py-8 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-night-3 text-ink/40">
                  <Glyph name="person" size={20} />
                </span>
                <p className="mt-3 text-sm text-ink/45">
                  Nobody else is here yet. Keep this open, or share a room code below.
                </p>
              </div>
            )}
            {players.map((p) => (
              <button
                key={p.id}
                disabled={busy || Boolean(pending)}
                onClick={() => send(p)}
                className="press flex items-center gap-3 rounded-3xl bg-night-3/80 px-4 py-3.5 text-left disabled:opacity-40"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-night-2">
                  {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : <Glyph name="person" size={18} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.display_name ?? p.username}</span>
                  <span className="block text-[11px] text-ink/35">online now</span>
                </span>
                <span
                  className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-night"
                  style={{ background: active.accent }}
                >
                  invite
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* code */}
        <section className="mt-4 rounded-[28px] border border-white/5 bg-night-2/60 p-4">
          <p className="px-1 text-[11px] font-bold uppercase tracking-[0.3em] text-ink/35">or use a code</p>
          <div className="mt-3 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              className="h-12 flex-1 rounded-2xl bg-night-3 px-4 text-center font-bold tracking-[0.35em] text-ink placeholder:text-ink/20 outline-none focus:ring-2 focus:ring-me"
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
              className="press h-12 rounded-2xl bg-me px-6 font-bold text-night disabled:opacity-30"
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
            className="press mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-night-3/60 font-semibold text-ink"
          >
            <Glyph name="spark" size={16} /> Open a room and get a code
          </button>
        </section>

        {error && <p className="mt-5 text-center text-sm text-them">{error}</p>}
      </div>

      {pending && (
        <div className="fixed inset-0 grid place-items-center bg-night/92 px-8 text-center backdrop-blur-sm">
          <div>
            <div className="relative mx-auto h-28 w-28">
              <span className="absolute inset-0 rounded-full border-2 border-me/25" />
              <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-me" />
              <img src={active.character} alt="" className="absolute inset-0 m-auto h-16 w-16 object-contain" />
            </div>
            <p className="mt-6 font-display text-2xl">Ringing {pending.name}</p>
            <p className="mt-1 text-sm text-ink/45">They have 45 seconds to answer.</p>
            <button
              onClick={async () => { await cancel({ data: { inviteId: pending.inviteId } }); setPending(null); }}
              className="press mt-7 h-12 rounded-2xl bg-night-2 px-6 font-semibold text-ink/60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {firstInvite && !pending && (
        <div className="fixed inset-0 grid place-items-center bg-night/92 px-8 text-center backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-[30px] border border-white/8 bg-night-3">
            <div
              className="px-7 pt-7 pb-6"
              style={{ background: GAMES.find((g) => g.key === firstInvite.game_key)?.wash }}
            >
              <img
                src={GAMES.find((g) => g.key === firstInvite.game_key)?.character ?? active.character}
                alt=""
                className="mx-auto h-20 w-20 object-contain drop-shadow-xl"
              />
              <p className="mt-3 font-display text-xl">
                {firstInvite.from?.display_name ?? firstInvite.from?.username ?? "Someone"} wants to play
              </p>
              <p className="mt-1 text-sm text-ink/55">
                {GAMES.find((g) => g.key === firstInvite.game_key)?.name ?? "a game"}
              </p>
            </div>
            <div className="flex gap-2 p-5">
              <button
                disabled={busy}
                onClick={() => accept(firstInvite.id, true)}
                className="press h-12 flex-1 rounded-2xl bg-me font-bold text-night"
              >
                Play
              </button>
              <button
                disabled={busy}
                onClick={() => accept(firstInvite.id, false)}
                className="press h-12 rounded-2xl bg-night-2 px-5 font-semibold text-ink/60"
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
