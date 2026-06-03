import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import {
  cancelQuickMatch,
  getMyProfile,
  getPlayerById,
  quickPlay,
  respondMatchRequest,
  withdrawMatchRequest,
} from "@/lib/xo.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/quick-match")({
  head: () => ({ meta: [{ title: "Quick Match — XO Live" }] }),
  component: QuickMatch,
});

type Phase =
  | "starting"
  | "searching"        // hosting, waiting for an incoming request
  | "incoming"         // hosting, someone requested to play
  | "requested"        // guest, waiting for host to accept
  | "declined"         // host declined our request
  | "found"            // accepted — going to game
  | "error";

const REQUEST_TIMEOUT_MS = 25_000;

function QuickMatch() {
  const navigate = useNavigate();
  const startQuick = useServerFn(quickPlay);
  const cancelFn = useServerFn(cancelQuickMatch);
  const respondFn = useServerFn(respondMatchRequest);
  const withdrawFn = useServerFn(withdrawMatchRequest);
  const getProfile = useServerFn(getMyProfile);
  const getPlayer = useServerFn(getPlayerById);
  const { data: me } = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });

  const [phase, setPhase] = useState<Phase>("starting");
  const [err, setErr] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [requesterId, setRequesterId] = useState<string | null>(null);
  const startedRef = useRef(false);

  const { data: requester } = useQuery({
    queryKey: ["player", requesterId],
    queryFn: () => getPlayer({ data: { userId: requesterId! } }),
    enabled: !!requesterId,
  });

  // Kick off matchmaking once
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const room = await startQuick();
        setRoomId(room.id);
        setRoomCode(room.code);
        if (room.mode === "hosting") {
          setIsHost(true);
          setPhase("searching");
        } else {
          setIsHost(false);
          setPhase("requested");
        }
      } catch (e) {
        setErr((e as Error).message || "Could not start quick match");
        setPhase("error");
      }
    })();
  }, [startQuick]);

  // Elapsed timer while searching / requested
  useEffect(() => {
    if (phase !== "searching" && phase !== "requested" && phase !== "incoming") return;
    const t = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Realtime: watch room updates
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`quick-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as {
            guest_id: string | null;
            pending_guest_id: string | null;
            code: string;
            status: string;
          };
          if (isHost) {
            // Host: incoming request OR opponent accepted (status -> playing)
            if (row.status === "playing" && row.guest_id) {
              setPhase("found");
              setTimeout(() => navigate({ to: "/game", search: { code: row.code, quick: true } as never }), 1000);
            } else if (row.pending_guest_id) {
              setRequesterId(row.pending_guest_id);
              setPhase("incoming");
            } else if (phase === "incoming") {
              // cleared without accept -> back to searching
              setRequesterId(null);
              setPhase("searching");
            }
          } else {
            // Guest: watch for accept (status playing) or decline (pending cleared)
            if (row.status === "playing" && row.guest_id) {
              setPhase("found");
              setTimeout(() => navigate({ to: "/game", search: { code: row.code, quick: true } as never }), 1000);
            } else if (row.pending_guest_id === null && phase === "requested") {
              setPhase("declined");
            }
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, isHost, navigate, phase]);

  // Safety net poll every 4s
  useEffect(() => {
    if (!roomId) return;
    if (phase === "found" || phase === "error" || phase === "declined") return;
    const t = setInterval(async () => {
      const { data } = await supabase
        .from("rooms")
        .select("guest_id, pending_guest_id, code, status")
        .eq("id", roomId)
        .maybeSingle();
      if (!data) return;
      if (data.status === "playing" && data.guest_id) {
        setPhase("found");
        setTimeout(() => navigate({ to: "/game", search: { code: data.code, quick: true } as never }), 1000);
      } else if (isHost && data.pending_guest_id && phase === "searching") {
        setRequesterId(data.pending_guest_id);
        setPhase("incoming");
      } else if (!isHost && data.pending_guest_id === null && phase === "requested") {
        setPhase("declined");
      }
    }, 4000);
    return () => clearInterval(t);
  }, [phase, roomId, isHost, navigate]);

  // Auto-timeout for a pending request
  useEffect(() => {
    if (phase !== "requested" || !roomId) return;
    const t = setTimeout(async () => {
      try { await withdrawFn({ data: { roomId } }); } catch { /* ignore */ }
      setPhase("declined");
    }, REQUEST_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [phase, roomId, withdrawFn]);

  const handleCancel = async () => {
    try {
      if (isHost && roomId) await cancelFn({ data: { roomId } });
      else if (!isHost && roomId) await withdrawFn({ data: { roomId } });
    } catch { /* ignore */ }
    navigate({ to: "/" });
  };

  const handleAccept = async () => {
    if (!roomId) return;
    try {
      await respondFn({ data: { roomId, accept: true } });
      // status will flip via realtime — but also set optimistic
      setPhase("found");
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const handleDecline = async () => {
    if (!roomId) return;
    try { await respondFn({ data: { roomId, accept: false } }); } catch { /* ignore */ }
    setRequesterId(null);
    setPhase("searching");
  };

  // decorative blips
  const blips = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({
      id: i,
      angle: Math.random() * 360,
      radius: 30 + Math.random() * 110,
      delay: Math.random() * 2,
      size: 6 + Math.random() * 10,
    })),
    [],
  );

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const statusLabel =
    phase === "found" ? "OPPONENT FOUND"
    : phase === "incoming" ? "MATCH REQUEST"
    : phase === "requested" ? "AWAITING RESPONSE"
    : phase === "declined" ? "REQUEST DECLINED"
    : "LIVE MATCHMAKING";

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-primary-container via-surface to-tertiary-container/40 flex flex-col items-center justify-between px-6 py-10 text-center overflow-hidden relative">
      {/* Header */}
      <header className="w-full flex items-center justify-between">
        <button
          onClick={handleCancel}
          className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center bubbly"
          aria-label="Cancel"
        >
          <Icon name="close" />
        </button>
        <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wider text-on-surface-variant">{statusLabel}</span>
        </div>
        <div className="w-10 h-10" />
      </header>

      {/* Radar */}
      <div className="relative flex-1 w-full flex items-center justify-center my-8">
        <div className="relative w-[280px] h-[280px]">
          {[1, 0.75, 0.5, 0.25].map((s, i) => (
            <div
              key={i}
              className="absolute inset-0 m-auto rounded-full border-2 border-primary/30"
              style={{ width: `${s * 100}%`, height: `${s * 100}%`, top: 0, bottom: 0, left: 0, right: 0 }}
            />
          ))}
          <div className="absolute inset-0 rounded-full border-2 border-primary animate-burst-ring" />
          <div className="absolute inset-0 rounded-full border-2 border-secondary animate-burst-ring" style={{ animationDelay: "0.6s" }} />
          <div className="absolute inset-0 rounded-full border-2 border-tertiary animate-burst-ring" style={{ animationDelay: "1.2s" }} />

          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div
              className="absolute top-1/2 left-1/2 origin-left h-[2px] w-1/2 bg-gradient-to-r from-primary via-primary/40 to-transparent"
              style={{ animation: "radar-sweep 2.4s linear infinite" }}
            />
          </div>

          {phase === "searching" && blips.map((b) => (
            <span
              key={b.id}
              className="absolute rounded-full bg-secondary shadow-[0_0_12px_rgba(80,87,160,0.7)]"
              style={{
                width: b.size,
                height: b.size,
                top: "50%",
                left: "50%",
                transform: `rotate(${b.angle}deg) translate(${b.radius}px) rotate(-${b.angle}deg) translate(-50%, -50%)`,
                animation: `blip-pulse 1.6s ${b.delay}s ease-in-out infinite`,
              }}
            />
          ))}

          {/* center: my avatar */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <span className="absolute inset-0 rounded-full bg-primary/30 voice-ring" />
              <div className="relative w-20 h-20 rounded-full bg-primary text-on-primary flex items-center justify-center overflow-hidden border-4 border-surface shadow-xl">
                {me?.avatar_url ? (
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

      {/* Status copy */}
      <div className="w-full space-y-3">
        {phase === "starting" && (
          <>
            <h1 className="text-3xl font-black text-on-surface">Getting ready…</h1>
            <p className="text-on-surface-variant">Warming up the arena.</p>
          </>
        )}
        {phase === "searching" && (
          <>
            <h1 className="text-3xl font-black text-on-surface">Searching for opponent</h1>
            <p className="text-on-surface-variant">
              We only match you with players who are online right now.
            </p>
            <div className="inline-flex items-center gap-2 bg-surface-container px-4 py-2 rounded-full">
              <Icon name="timer" className="text-on-surface-variant" />
              <span className="font-mono font-bold tabular-nums text-on-surface">{mm}:{ss}</span>
              {roomCode && (
                <>
                  <span className="text-on-surface-variant">·</span>
                  <span className="text-xs font-bold tracking-widest text-on-surface-variant">CODE {roomCode}</span>
                </>
              )}
            </div>
            <div>
              <button
                onClick={handleCancel}
                className="mt-4 px-6 py-3 rounded-full bg-surface-container text-on-surface font-bold bubbly"
              >
                Cancel search
              </button>
            </div>
          </>
        )}
        {phase === "requested" && (
          <>
            <h1 className="text-3xl font-black text-on-surface">Request sent</h1>
            <p className="text-on-surface-variant">
              Waiting for the opponent to accept…
            </p>
            <div className="inline-flex items-center gap-2 bg-surface-container px-4 py-2 rounded-full">
              <Icon name="timer" className="text-on-surface-variant" />
              <span className="font-mono font-bold tabular-nums text-on-surface">{mm}:{ss}</span>
            </div>
            <div>
              <button
                onClick={handleCancel}
                className="mt-4 px-6 py-3 rounded-full bg-surface-container text-on-surface font-bold bubbly"
              >
                Cancel request
              </button>
            </div>
          </>
        )}
        {phase === "declined" && (
          <>
            <h1 className="text-2xl font-black text-on-surface">Request declined</h1>
            <p className="text-on-surface-variant text-sm">
              No worries — let's find another opponent.
            </p>
            <button
              onClick={() => { startedRef.current = false; setElapsed(0); setPhase("starting"); }}
              className="mt-4 px-6 py-3 rounded-full bg-primary text-on-primary font-bold bubbly"
            >
              Search again
            </button>
          </>
        )}
        {phase === "found" && (
          <>
            <h1 className="text-3xl font-black text-primary animate-result-pop">Opponent found!</h1>
            <p className="text-on-surface-variant">Loading the board…</p>
          </>
        )}
        {phase === "error" && (
          <>
            <h1 className="text-2xl font-black text-error">Matchmaking failed</h1>
            <p className="text-on-surface-variant text-sm">{err}</p>
            <button
              onClick={() => navigate({ to: "/" })}
              className="mt-4 px-6 py-3 rounded-full bg-primary text-on-primary font-bold bubbly"
            >
              Back home
            </button>
          </>
        )}
      </div>

      {/* Incoming-request modal (host side) */}
      {phase === "incoming" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-slide-up">
          <div className="w-full max-w-sm bg-surface rounded-3xl p-6 shadow-2xl text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/15 text-primary flex items-center justify-center mb-3 animate-pop-in">
              <Icon name="sports_esports" className="text-3xl" filled />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Match request</p>
            <div className="my-4 flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-primary/30 bg-primary-container flex items-center justify-center text-on-primary-container font-black text-2xl">
                {requester?.avatar_url
                  ? <img src={requester.avatar_url} alt="" className="w-full h-full object-cover" />
                  : (requester?.username?.[0]?.toUpperCase() ?? "?")}
              </div>
              <h2 className="text-xl font-black text-on-surface">@{requester?.username ?? "Loading…"}</h2>
              {requester && (
                <p className="text-xs text-on-surface-variant">
                  {requester.wins}W · {requester.losses}L · {requester.draws}D
                </p>
              )}
              <p className="text-sm text-on-surface-variant">wants to play with you</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDecline}
                className="flex-1 py-3 rounded-2xl bg-surface-container-highest text-on-surface font-bold active:scale-[0.98]"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 py-3 rounded-2xl bg-primary text-on-primary font-bold active:scale-[0.98]"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
