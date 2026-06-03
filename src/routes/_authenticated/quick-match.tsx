import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { cancelQuickMatch, getMyProfile, quickPlay } from "@/lib/xo.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/quick-match")({
  head: () => ({ meta: [{ title: "Quick Match — XO Live" }] }),
  component: QuickMatch,
});

type Phase = "starting" | "searching" | "found" | "error";

function QuickMatch() {
  const navigate = useNavigate();
  const startQuick = useServerFn(quickPlay);
  const cancelFn = useServerFn(cancelQuickMatch);
  const getProfile = useServerFn(getMyProfile);
  const { data: me } = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });

  const [phase, setPhase] = useState<Phase>("starting");
  const [err, setErr] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Kick off matchmaking once
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const room = await startQuick();
        setRoomId(room.id);
        setRoomCode(room.code);
        if (room.guest_id) {
          // Instantly matched into someone else's waiting room
          setPhase("found");
          setTimeout(() => navigate({ to: "/game", search: { code: room.code, quick: true } as never }), 1200);
        } else {
          setPhase("searching");
        }
      } catch (e) {
        setErr((e as Error).message || "Could not start quick match");
        setPhase("error");
      }
    })();
  }, [startQuick, navigate]);

  // Elapsed timer while searching
  useEffect(() => {
    if (phase !== "searching") return;
    const t = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Realtime: detect when an opponent joins our waiting room
  useEffect(() => {
    if (phase !== "searching" || !roomId) return;
    const channel = supabase
      .channel(`quick-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as { guest_id: string | null; code: string };
          if (row.guest_id) {
            setPhase("found");
            setTimeout(
              () => navigate({ to: "/game", search: { code: row.code, quick: true } as never }),
              1200,
            );
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [phase, roomId, navigate]);

  // Safety net poll every 4s in case realtime is dropped
  useEffect(() => {
    if (phase !== "searching" || !roomId) return;
    const t = setInterval(async () => {
      const { data } = await supabase.from("rooms").select("guest_id, code").eq("id", roomId).maybeSingle();
      if (data?.guest_id && data.code) {
        setPhase("found");
        setTimeout(() => navigate({ to: "/game", search: { code: data.code, quick: true } as never }), 1200);
      }
    }, 4000);
    return () => clearInterval(t);
  }, [phase, roomId, navigate]);

  const handleCancel = async () => {
    if (roomId) { try { await cancelFn({ data: { roomId } }); } catch { /* ignore */ } }
    navigate({ to: "/" });
  };

  // 18 floating "player dots" pulsing on the radar (purely decorative)
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
          <span className="text-[11px] font-bold tracking-wider text-on-surface-variant">
            {phase === "found" ? "OPPONENT FOUND" : "LIVE MATCHMAKING"}
          </span>
        </div>
        <div className="w-10 h-10" />
      </header>

      {/* Radar */}
      <div className="relative flex-1 w-full flex items-center justify-center my-8">
        <div className="relative w-[280px] h-[280px]">
          {/* concentric rings */}
          {[1, 0.75, 0.5, 0.25].map((s, i) => (
            <div
              key={i}
              className="absolute inset-0 m-auto rounded-full border-2 border-primary/30"
              style={{ width: `${s * 100}%`, height: `${s * 100}%`, top: 0, bottom: 0, left: 0, right: 0 }}
            />
          ))}
          {/* expanding burst rings */}
          <div className="absolute inset-0 rounded-full border-2 border-primary animate-burst-ring" />
          <div className="absolute inset-0 rounded-full border-2 border-secondary animate-burst-ring" style={{ animationDelay: "0.6s" }} />
          <div className="absolute inset-0 rounded-full border-2 border-tertiary animate-burst-ring" style={{ animationDelay: "1.2s" }} />

          {/* sweeping radar arm */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div
              className="absolute top-1/2 left-1/2 origin-left h-[2px] w-1/2 bg-gradient-to-r from-primary via-primary/40 to-transparent"
              style={{ animation: "radar-sweep 2.4s linear infinite" }}
            />
          </div>

          {/* opponent blips */}
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
              Scanning live players… we'll drop you in the moment someone joins.
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
    </div>
  );
}
