import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import {
  cancelInvite,
  cancelQuickMatch,
  getMyProfile,
  getOnlinePlayers,
  invitePlayer,
  quickPlay,
} from "@/lib/xo.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/quick-match")({
  head: () => ({ meta: [{ title: "Quick Match — XO Live" }] }),
  component: QuickMatch,
});

type Phase = "starting" | "scanning" | "list" | "inviting" | "found" | "error";

const SCAN_MS = 2200;
const INVITE_TIMEOUT_MS = 22_000;

type OnlinePlayer = {
  id: string;
  username: string;
  avatar_url: string | null;
  wins?: number;
  losses?: number;
  draws?: number;
};

function QuickMatch() {
  const navigate = useNavigate();
  const startQuick = useServerFn(quickPlay);
  const cancelMatch = useServerFn(cancelQuickMatch);
  const cancelInv = useServerFn(cancelInvite);
  const invite = useServerFn(invitePlayer);
  const getProfile = useServerFn(getMyProfile);
  const onlineFn = useServerFn(getOnlinePlayers);

  const { data: me } = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const { data: onlinePlayers = [], refetch: refetchOnline } = useQuery<OnlinePlayer[]>({
    queryKey: ["online-players"],
    queryFn: () => onlineFn() as Promise<OnlinePlayer[]>,
    refetchInterval: 6000,
  });

  const [phase, setPhase] = useState<Phase>("starting");
  const [err, setErr] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [target, setTarget] = useState<OnlinePlayer | null>(null);
  const startedRef = useRef(false);

  // Bootstrap: create the room, show scan, then list
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const r = await startQuick();
        setRoomId(r.id);
        setRoomCode(r.code);
        setPhase("scanning");
        setTimeout(() => setPhase("list"), SCAN_MS);
      } catch (e) {
        setErr((e as Error).message || "Could not start quick match");
        setPhase("error");
      }
    })();
  }, [startQuick]);

  // Realtime: watch my room
  useEffect(() => {
    if (!roomId) return;
    const ch = supabase
      .channel(`quick-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as { guest_id: string | null; pending_guest_id: string | null; code: string; status: string };
          if (row.status === "playing" && row.guest_id) {
            setPhase("found");
            setTimeout(() => navigate({ to: "/game", search: { code: row.code, quick: true } as never }), 900);
          } else if (row.pending_guest_id === null && phase === "inviting") {
            // Invitee declined or invite withdrawn — go back to the list
            setTarget(null);
            setPhase("list");
            refetchOnline();
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId, phase, navigate, refetchOnline]);

  // Auto-timeout the invite
  useEffect(() => {
    if (phase !== "inviting" || !roomId || !target) return;
    const t = setTimeout(async () => {
      try { await cancelInv({ data: { roomId } }); } catch { /* ignore */ }
      setTarget(null);
      setPhase("list");
      refetchOnline();
    }, INVITE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [phase, roomId, target, cancelInv, refetchOnline]);

  const handlePick = async (p: OnlinePlayer) => {
    if (!roomId) return;
    setTarget(p);
    setPhase("inviting");
    try {
      await invite({ data: { roomId, targetId: p.id } });
    } catch (e) {
      setErr((e as Error).message || "Couldn't invite that player");
      setTarget(null);
      setPhase("list");
      refetchOnline();
    }
  };

  const handleCancelInvite = async () => {
    if (!roomId) return;
    try { await cancelInv({ data: { roomId } }); } catch { /* ignore */ }
    setTarget(null);
    setPhase("list");
    refetchOnline();
  };

  const handleLeave = async () => {
    try { if (roomId) await cancelMatch({ data: { roomId } }); } catch { /* ignore */ }
    navigate({ to: "/" });
  };

  // Radar blips while scanning
  const radarPlayers = useMemo(() => {
    const list = onlinePlayers.slice(0, 8);
    return list.map((p, i) => ({
      ...p,
      angle: (i / Math.max(list.length, 1)) * 360,
      radius: 95 + (i % 3) * 12,
      delay: (i * 0.15) % 2,
    }));
  }, [onlinePlayers]);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-primary-container via-surface to-tertiary-container/40 flex flex-col px-5 pt-6 pb-8 text-center overflow-hidden relative">
      <header className="w-full flex items-center justify-between mb-2">
        <button onClick={handleLeave} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center bubbly" aria-label="Back">
          <Icon name="arrow_back" />
        </button>
        <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wider text-on-surface-variant">
            {phase === "scanning" ? "SCANNING" : phase === "list" ? `${onlinePlayers.length} ONLINE` : phase === "inviting" ? "WAITING" : phase === "found" ? "MATCHED" : "QUICK PLAY"}
          </span>
        </div>
        <div className="w-10 h-10" />
      </header>

      {/* SCAN / FOUND view */}
      {(phase === "starting" || phase === "scanning" || phase === "found") && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative w-[300px] h-[300px]">
            {[1, 0.75, 0.5, 0.25].map((s, i) => (
              <div key={i} className="absolute inset-0 m-auto rounded-full border-2 border-primary/30"
                style={{ width: `${s * 100}%`, height: `${s * 100}%`, top: 0, bottom: 0, left: 0, right: 0 }} />
            ))}
            <div className="absolute inset-0 rounded-full border-2 border-primary animate-burst-ring" />
            <div className="absolute inset-0 rounded-full border-2 border-secondary animate-burst-ring" style={{ animationDelay: "0.6s" }} />
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="absolute top-1/2 left-1/2 origin-left h-[2px] w-1/2 bg-gradient-to-r from-primary via-primary/40 to-transparent"
                style={{ animation: "radar-sweep 2.4s linear infinite" }} />
            </div>

            {phase !== "found" && radarPlayers.map((p) => (
              <div key={p.id}
                className="absolute w-10 h-10 rounded-full overflow-hidden ring-2 ring-secondary/60 bg-surface-container shadow-[0_0_12px_rgba(80,87,160,0.6)]"
                style={{
                  top: "50%", left: "50%",
                  transform: `rotate(${p.angle}deg) translate(${p.radius}px) rotate(-${p.angle}deg) translate(-50%, -50%)`,
                  animation: `blip-pulse 1.8s ${p.delay}s ease-in-out infinite`,
                }}>
                {p.avatar_url
                  ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center font-black text-on-surface text-sm">{p.username?.[0]?.toUpperCase() ?? "?"}</div>}
              </div>
            ))}

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <span className="absolute inset-0 rounded-full bg-primary/30 voice-ring" />
                <div className="relative w-24 h-24 rounded-full bg-primary text-on-primary flex items-center justify-center overflow-hidden border-4 border-surface shadow-xl">
                  {me?.avatar_url
                    ? <img src={me.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-3xl font-black">{me?.username?.[0]?.toUpperCase() ?? "?"}</span>}
                </div>
                {phase === "found" && (
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg animate-scale-in">
                    <Icon name="check" className="text-base" />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-1">
            <h1 className="text-2xl font-black text-on-surface">
              {phase === "found" ? "Opponent locked in!" : "Scanning for players…"}
            </h1>
            <p className="text-on-surface-variant text-sm">
              {phase === "found" ? "Loading the board…" : "Finding everyone online right now."}
            </p>
            {roomCode && phase !== "found" && (
              <p className="text-[11px] font-bold tracking-widest text-on-surface-variant pt-1">CODE {roomCode}</p>
            )}
          </div>
        </div>
      )}

      {/* LIST view — pick your opponent */}
      {phase === "list" && (
        <div className="flex-1 flex flex-col w-full overflow-hidden animate-fade-in">
          <div className="text-left mb-3">
            <h1 className="text-2xl font-black text-on-surface">Pick your opponent</h1>
            <p className="text-on-surface-variant text-sm">Tap a player to send them a match request.</p>
          </div>
          {onlinePlayers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-4">
                <Icon name="travel_explore" className="text-4xl text-on-surface-variant" />
              </div>
              <h2 className="font-black text-on-surface text-lg">No one's online right now</h2>
              <p className="text-on-surface-variant text-sm mt-1">We'll keep checking every few seconds.</p>
              <button onClick={() => refetchOnline()} className="mt-5 px-5 py-2.5 rounded-full bg-primary text-on-primary font-bold bubbly">
                Refresh
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto hide-scrollbar -mx-1 px-1">
              <ul className="space-y-2 pb-4">
                {onlinePlayers.map((p, i) => {
                  const games = (p.wins ?? 0) + (p.losses ?? 0) + (p.draws ?? 0);
                  return (
                    <li
                      key={p.id}
                      style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
                      className="animate-fade-in"
                    >
                      <button
                        onClick={() => handlePick(p)}
                        className="bubbly w-full flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container text-left shadow-sm"
                      >
                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-primary text-on-primary flex items-center justify-center shrink-0 ring-2 ring-surface">
                          {p.avatar_url
                            ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                            : <span className="font-black text-lg">{p.username?.[0]?.toUpperCase() ?? "?"}</span>}
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 ring-2 ring-surface-container-low" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-on-surface truncate">@{p.username}</p>
                          <p className="text-[11px] text-on-surface-variant font-medium">
                            {games > 0 ? `${p.wins ?? 0}W · ${p.losses ?? 0}L · ${p.draws ?? 0}D` : "Newcomer"}
                          </p>
                        </div>
                        <div className="shrink-0 w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center">
                          <Icon name="sports_esports" />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* INVITING — waiting for opponent overlay */}
      {phase === "inviting" && target && (
        <div className="fixed inset-0 z-50 bg-on-surface/70 backdrop-blur-sm flex items-center justify-center px-6 animate-fade-in">
          <div className="w-full max-w-sm bg-surface rounded-3xl p-6 text-center shadow-2xl animate-scale-in">
            <p className="text-[11px] font-bold tracking-widest text-primary mb-3">SENDING INVITE</p>
            <div className="relative mx-auto w-32 h-32 mb-4">
              <span className="absolute inset-0 rounded-full bg-primary/20 voice-ring" />
              <span className="absolute inset-0 rounded-full border-2 border-primary animate-burst-ring" />
              <div className="absolute inset-2 rounded-full overflow-hidden bg-primary text-on-primary flex items-center justify-center border-4 border-surface shadow-xl">
                {target.avatar_url
                  ? <img src={target.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-4xl font-black">{target.username?.[0]?.toUpperCase() ?? "?"}</span>}
              </div>
            </div>
            <h2 className="text-xl font-black text-on-surface">Waiting for @{target.username}</h2>
            <p className="text-on-surface-variant text-sm mt-1">They've got 22 seconds to accept.</p>
            <div className="mt-5 flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-2 h-2 rounded-full bg-primary"
                  style={{ animation: `blip-pulse 1.2s ${i * 0.18}s ease-in-out infinite` }} />
              ))}
            </div>
            <button onClick={handleCancelInvite} className="mt-6 w-full px-5 py-3 rounded-full bg-surface-container text-on-surface font-bold bubbly">
              Cancel invite
            </button>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <h1 className="text-2xl font-black text-error">Matchmaking failed</h1>
          <p className="text-on-surface-variant text-sm mt-2">{err}</p>
          <button onClick={() => navigate({ to: "/" })} className="mt-4 px-6 py-3 rounded-full bg-primary text-on-primary font-bold bubbly">Back home</button>
        </div>
      )}
    </div>
  );
}
