import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import {
  cancelQuickMatch,
  getMyProfile,
  getOnlinePlayers,
  getPlayerById,
  inviteAnotherPlayer,
  quickPlay,
} from "@/lib/xo.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/quick-match")({
  head: () => ({ meta: [{ title: "Quick Match — XO Live" }] }),
  component: QuickMatch,
});

type Phase = "starting" | "inviting" | "searching" | "found" | "error";

const INVITE_TIMEOUT_MS = 22_000;

function QuickMatch() {
  const navigate = useNavigate();
  const startQuick = useServerFn(quickPlay);
  const cancelFn = useServerFn(cancelQuickMatch);
  const inviteAnother = useServerFn(inviteAnotherPlayer);
  const getProfile = useServerFn(getMyProfile);
  const getPlayer = useServerFn(getPlayerById);
  const onlineFn = useServerFn(getOnlinePlayers);

  const { data: me } = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const { data: onlinePlayers } = useQuery({
    queryKey: ["online-players"],
    queryFn: () => onlineFn(),
    refetchInterval: 8000,
  });

  const [phase, setPhase] = useState<Phase>("starting");
  const [err, setErr] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const declinedRef = useRef<string[]>([]);
  const startedRef = useRef(false);

  const { data: target } = useQuery({
    queryKey: ["player", targetId],
    queryFn: () => getPlayer({ data: { userId: targetId! } }),
    enabled: !!targetId,
  });

  // Kick off quick play once
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const r = await startQuick();
        setRoomId(r.id);
        setRoomCode(r.code);
        if (r.targetId) {
          setTargetId(r.targetId);
          setPhase("inviting");
        } else {
          setPhase("searching");
        }
      } catch (e) {
        setErr((e as Error).message || "Could not start quick match");
        setPhase("error");
      }
    })();
  }, [startQuick]);

  // Tick timer
  useEffect(() => {
    if (phase === "found" || phase === "error") return;
    const t = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Realtime: watch my room — accepted (status=playing) or declined (pending cleared)
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
            setTimeout(() => navigate({ to: "/game", search: { code: row.code, quick: true } as never }), 800);
          } else if (row.pending_guest_id === null && (phase === "inviting")) {
            // Invitee declined — auto-find next
            if (targetId) declinedRef.current = [...declinedRef.current, targetId];
            setTargetId(null);
            tryAnother();
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, phase, targetId, navigate]);

  const tryAnother = async () => {
    if (!roomId) return;
    setPhase("searching");
    try {
      const res = await inviteAnother({ data: { roomId, exclude: declinedRef.current } });
      if (res.targetId) {
        setTargetId(res.targetId);
        setPhase("inviting");
      } else {
        setPhase("searching");
      }
    } catch { setPhase("searching"); }
  };

  // Auto-timeout invites — treat as decline and try next
  useEffect(() => {
    if (phase !== "inviting" || !targetId) return;
    const t = setTimeout(() => {
      declinedRef.current = [...declinedRef.current, targetId];
      setTargetId(null);
      tryAnother();
    }, INVITE_TIMEOUT_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, targetId]);

  // While "searching", retry every 6s
  useEffect(() => {
    if (phase !== "searching" || !roomId) return;
    const t = setInterval(() => { tryAnother(); }, 6000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roomId]);

  const handleCancel = async () => {
    try { if (roomId) await cancelFn({ data: { roomId } }); } catch { /* ignore */ }
    navigate({ to: "/" });
  };

  // Radar blips = real online players cycling
  const radarPlayers = useMemo(() => {
    const list = (onlinePlayers ?? []).slice(0, 8);
    return list.map((p, i) => ({
      ...p,
      angle: (i / Math.max(list.length, 1)) * 360,
      radius: 95 + (i % 3) * 12,
      delay: (i * 0.15) % 2,
    }));
  }, [onlinePlayers]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const statusLabel =
    phase === "found" ? "OPPONENT FOUND"
    : phase === "inviting" ? "INVITE SENT"
    : phase === "searching" ? "SCANNING ONLINE"
    : "LIVE MATCHMAKING";

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-primary-container via-surface to-tertiary-container/40 flex flex-col items-center justify-between px-6 py-10 text-center overflow-hidden relative">
      <header className="w-full flex items-center justify-between">
        <button onClick={handleCancel} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center bubbly" aria-label="Cancel">
          <Icon name="close" />
        </button>
        <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wider text-on-surface-variant">{statusLabel}</span>
        </div>
        <div className="w-10 h-10" />
      </header>

      <div className="relative flex-1 w-full flex items-center justify-center my-8">
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

          {/* online player avatars */}
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

          {/* center: me OR (when inviting) the target */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <span className="absolute inset-0 rounded-full bg-primary/30 voice-ring" />
              <div className="relative w-24 h-24 rounded-full bg-primary text-on-primary flex items-center justify-center overflow-hidden border-4 border-surface shadow-xl">
                {phase === "inviting" && target ? (
                  target.avatar_url
                    ? <img src={target.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-3xl font-black">{target.username?.[0]?.toUpperCase() ?? "?"}</span>
                ) : me?.avatar_url ? (
                  <img src={me.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black">{me?.username?.[0]?.toUpperCase() ?? "?"}</span>
                )}
              </div>
              {phase === "found" && (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg animate-scale-in">
                  <Icon name="check" className="text-base" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full space-y-3">
        {phase === "starting" && (
          <><h1 className="text-3xl font-black text-on-surface">Getting ready…</h1>
            <p className="text-on-surface-variant">Warming up the arena.</p></>
        )}
        {phase === "searching" && (
          <>
            <h1 className="text-3xl font-black text-on-surface">Scanning for players</h1>
            <p className="text-on-surface-variant">
              {onlinePlayers?.length ? `${onlinePlayers.length} online — finding someone available…` : "Waiting for online players…"}
            </p>
            <div className="inline-flex items-center gap-2 bg-surface-container px-4 py-2 rounded-full">
              <Icon name="timer" className="text-on-surface-variant" />
              <span className="font-mono font-bold tabular-nums text-on-surface">{mm}:{ss}</span>
              {roomCode && (<><span className="text-on-surface-variant">·</span>
                <span className="text-xs font-bold tracking-widest text-on-surface-variant">CODE {roomCode}</span></>)}
            </div>
            <div>
              <button onClick={handleCancel} className="mt-4 px-6 py-3 rounded-full bg-surface-container text-on-surface font-bold bubbly">Cancel</button>
            </div>
          </>
        )}
        {phase === "inviting" && (
          <>
            <h1 className="text-3xl font-black text-on-surface">Inviting @{target?.username ?? "…"}</h1>
            <p className="text-on-surface-variant">Waiting for them to accept…</p>
            <div className="inline-flex items-center gap-2 bg-surface-container px-4 py-2 rounded-full">
              <Icon name="timer" className="text-on-surface-variant" />
              <span className="font-mono font-bold tabular-nums text-on-surface">{mm}:{ss}</span>
            </div>
            <div>
              <button onClick={handleCancel} className="mt-4 px-6 py-3 rounded-full bg-surface-container text-on-surface font-bold bubbly">Cancel</button>
            </div>
          </>
        )}
        {phase === "found" && (
          <><h1 className="text-3xl font-black text-primary animate-result-pop">Opponent found!</h1>
            <p className="text-on-surface-variant">Loading the board…</p></>
        )}
        {phase === "error" && (
          <>
            <h1 className="text-2xl font-black text-error">Matchmaking failed</h1>
            <p className="text-on-surface-variant text-sm">{err}</p>
            <button onClick={() => navigate({ to: "/" })} className="mt-4 px-6 py-3 rounded-full bg-primary text-on-primary font-bold bubbly">Back home</button>
          </>
        )}
      </div>
    </div>
  );
}
