import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getRoomByCode, makeMove, sendMessage, rematch, forfeitMatch } from "@/lib/xo.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type Search = { code?: string; quick?: boolean; mode?: string; bet?: number };

export const Route = createFileRoute("/_authenticated/game")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    code: typeof s.code === "string" ? s.code : undefined,
    quick: s.quick === true || s.quick === "true",
    mode: typeof s.mode === "string" ? s.mode : undefined,
    bet: typeof s.bet === "number" ? s.bet : undefined,
  }),
  head: () => ({ meta: [{ title: "XO Live — Game Room" }] }),
  component: GamePage,
});

const REACTIONS = ["❤️", "😂", "😭", "🥰", "😘", "🔥", "😡", "😎"];
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
type Cell = "X" | "O" | null;

function GamePage() {
  const navigate = useNavigate();
  const { code } = Route.useSearch();
  const qc = useQueryClient();
  const getRoom = useServerFn(getRoomByCode);
  const moveFn = useServerFn(makeMove);
  const sendFn = useServerFn(sendMessage);
  const rematchFn = useServerFn(rematch);
  const forfeitFn = useServerFn(forfeitMatch);

  const { data: room, refetch } = useQuery({
    queryKey: ["room", code],
    queryFn: () => getRoom({ data: { code: code! } }),
    enabled: !!code,
    refetchOnWindowFocus: false,
  });

  // realtime subscribe
  useEffect(() => {
    if (!room?.id) return;
    const ch = supabase
      .channel(`room-${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${room.id}` }, () => refetch())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${room.id}` }, (p) => {
        qc.setQueryData<MsgRow[]>(["messages", room.id], (prev) => [...(prev ?? []), p.new as MsgRow]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [room?.id, refetch, qc]);

  // messages
  const { data: messages } = useQuery({
    queryKey: ["messages", room?.id],
    queryFn: async () => {
      const { data } = await supabase.from("messages").select("*").eq("room_id", room!.id).order("created_at");
      return (data ?? []) as MsgRow[];
    },
    enabled: !!room?.id,
  });

  if (!code) {
    return <Empty title="No room code" message="Go back home and create or join a room." />;
  }
  if (!room) {
    return <Empty title="Loading room…" message="" />;
  }

  const youMark: "X" | "O" | null = room.youAreHost ? "X" : room.youAreGuest ? "O" : null;
  const board = room.board as Cell[];
  const winLine: number[] | null = (room.winning_line as number[] | null) ?? null;
  const finished = room.status === "finished";
  const waiting = room.status === "waiting";

  return (
    <GameView
      code={code}
      roomId={room.id}
      board={board}
      turn={room.turn as "X" | "O"}
      youMark={youMark}
      hostName={room.host?.username ?? "Host"}
      guestName={room.guest?.username ?? "Waiting…"}
      hostScore={room.host_score}
      guestScore={room.guest_score}
      round={room.round}
      finished={finished}
      waiting={waiting}
      winningLine={winLine}
      winnerId={room.winner_id}
      isDraw={room.is_draw}
      hostId={room.host_id}
      guestId={room.guest_id}
      messages={messages ?? []}
      onCell={(i) => {
        // Optimistic — paint the move instantly, server reconciles via realtime
        if (board[i] || finished) return;
        const myMark = youMark;
        if (!myMark || room.turn !== myMark) return;
        const nextBoard = [...board];
        nextBoard[i] = myMark;
        qc.setQueryData(["room", code], (prev: typeof room | undefined) => prev ? { ...prev, board: nextBoard, turn: myMark === "X" ? "O" : "X" } : prev);
        moveFn({ data: { roomId: room.id, index: i } }).catch(() => refetch());
      }}
      onSend={(text, kind) => sendFn({ data: { roomId: room.id, text, kind } }).catch(() => {})}
      onRematch={() => rematchFn({ data: { roomId: room.id } }).catch(() => {})}
      onForfeit={() => forfeitFn({ data: { roomId: room.id } }).then(() => { toast.info("You forfeited the match"); navigate({ to: "/" }); }).catch((e) => toast.error(e?.message ?? "Forfeit failed"))}
      onHome={() => navigate({ to: "/" })}
      autoRematch={!!room.guest_id && room.youAreHost}
    />
  );
}

type MsgRow = { id: string; user_id: string; text: string; kind: "chat" | "reaction" | "system"; created_at: string; room_id: string };

function Empty({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-[100dvh] bg-surface flex flex-col items-center justify-center text-center px-6 gap-4">
      <h1 className="text-2xl font-bold text-on-surface">{title}</h1>
      {message && <p className="text-on-surface-variant">{message}</p>}
      <Link to="/" className="bg-primary text-on-primary px-6 py-3 rounded-2xl font-bold shadow-[0_5px_0_#394086]">Home</Link>
    </div>
  );
}

function GameView(props: {
  code: string; roomId: string; board: Cell[]; turn: "X" | "O"; youMark: "X" | "O" | null;
  hostName: string; guestName: string; hostScore: number; guestScore: number; round: number;
  finished: boolean; waiting: boolean; winningLine: number[] | null;
  winnerId: string | null; isDraw: boolean; hostId: string; guestId: string | null;
  messages: MsgRow[];
  onCell: (i: number) => void; onSend: (text: string, kind: "chat" | "reaction") => void;
  onRematch: () => void; onHome: () => void; autoRematch: boolean;
  onForfeit: () => void;
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [message, setMessage] = useState("");
  const [floats, setFloats] = useState<{ id: number; emoji: string; left: number }[]>([]);
  const [chatPops, setChatPops] = useState<{ id: string; user_id: string; text: string }[]>([]);
  const floatId = useRef(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [voiceState, setVoiceState] = useState<"off" | "connecting" | "live">("off");
  const [voiceAttempt, setVoiceAttempt] = useState(0);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // VS intro: show whenever both players are present at the start of round 1
  const [introPhase, setIntroPhase] = useState<"hidden" | "show" | "out">("hidden");
  const introShownFor = useRef<string | null>(null);
  useEffect(() => {
    if (!props.guestId || props.finished) return;
    const key = `${props.roomId}-${props.round}`;
    if (introShownFor.current === key) return;
    introShownFor.current = key;
    setIntroPhase("show");
    const t1 = setTimeout(() => setIntroPhase("out"), 4200);
    const t2 = setTimeout(() => setIntroPhase("hidden"), 4700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [props.guestId, props.roomId, props.round, props.finished]);


  // Spawn reaction emoji floats + chat pop-ups from message stream
  useEffect(() => {
    const last = props.messages[props.messages.length - 1];
    if (!last) return;
    if (last.kind === "reaction") {
      const id = ++floatId.current;
      const left = 20 + Math.random() * 60;
      setFloats((f) => [...f, { id, emoji: last.text, left }]);
      setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 2200);
    } else if (last.kind === "chat" && !chatOpen) {
      setChatPops((p) => [...p.slice(-2), { id: last.id, user_id: last.user_id, text: last.text }]);
      setTimeout(() => setChatPops((p) => p.filter((x) => x.id !== last.id)), 4000);
    } else if (last.kind === "system" && last.text === "forfeit") {
      const myId = props.youMark === "X" ? props.hostId : props.youMark === "O" ? props.guestId : null;
      if (myId && last.user_id !== myId) {
        toast.success("🏆 Opponent forfeited — you win!");
        setTimeout(() => props.onHome(), 1500);
      }
    }
    if (chatOpen && chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [props.messages, chatOpen]);

  // WebRTC voice — resilient: perfect negotiation, ICE restart, mic kept alive
  useEffect(() => {
    if (!props.guestId || !props.youMark) return;
    let pc: RTCPeerConnection | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let subscribed = false;
    const outbox: { event: string; payload: Record<string, unknown> }[] = [];
    let cancelled = false;
    let healthTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const isHost = props.youMark === "X";
    // Perfect-negotiation: host is polite=false (impolite), guest is polite=true
    const polite = !isHost;
    let makingOffer = false;
    let ignoreOffer = false;
    const pendingCandidates: RTCIceCandidateInit[] = [];

    const signal = (event: string, payload: Record<string, unknown>) => {
      if (!channel || !subscribed) { outbox.push({ event, payload }); return; }
      channel.send({ type: "broadcast", event, payload });
    };
    const flushOutbox = () => {
      while (outbox.length && channel && subscribed) {
        const m = outbox.shift()!;
        channel.send({ type: "broadcast", event: m.event, payload: m.payload });
      }
    };

    const scheduleReconnect = (delay = 2000) => {
      if (cancelled || reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        if (cancelled) return;
        setVoiceState("connecting");
        setVoiceAttempt((n) => n + 1);
      }, delay);
    };

    const ensureAudioPlaying = () => {
      const el = audioRef.current;
      if (el && el.srcObject && el.paused) el.play().catch(() => {});
    };

    const makeOffer = async () => {
      if (!pc || makingOffer) return;
      try {
        makingOffer = true;
        await pc.setLocalDescription();
        signal("offer", { sdp: pc.localDescription });
      } catch (err) {
        console.warn("negotiation error", err);
      } finally {
        makingOffer = false;
      }
    };

    (async () => {
      try {
        setVoiceState("connecting");

        // 1) Signalling channel FIRST so no offer/candidate is ever dropped.
        channel = supabase.channel(`voice-${props.roomId}`, { config: { broadcast: { self: false } } });

        channel.on("broadcast", { event: "offer" }, async (msg) => {
          if (!pc) return;
          const desc = msg.payload.sdp as RTCSessionDescriptionInit;
          const offerCollision = makingOffer || pc.signalingState !== "stable";
          ignoreOffer = !polite && offerCollision;
          if (ignoreOffer) return;
          try {
            if (offerCollision) await pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit);
            await pc.setRemoteDescription(desc);
            await flushPending();
            await pc.setLocalDescription();
            signal("answer", { sdp: pc.localDescription });
          } catch (err) { console.warn("offer apply error", err); }
        });

        channel.on("broadcast", { event: "answer" }, async (msg) => {
          if (!pc) return;
          try {
            if (pc.signalingState !== "have-local-offer") return;
            await pc.setRemoteDescription(msg.payload.sdp);
            await flushPending();
          } catch (err) { console.warn("answer apply error", err); }
        });

        channel.on("broadcast", { event: "ice" }, async (msg) => {
          if (!pc) return;
          const cand = msg.payload.candidate as RTCIceCandidateInit;
          if (!pc.remoteDescription) { pendingCandidates.push(cand); return; }
          try { await pc.addIceCandidate(cand); } catch (err) {
            if (!ignoreOffer) console.warn("ice add error", err);
          }
        });

        // A peer just (re)joined: the impolite side re-offers so late joiners connect.
        channel.on("broadcast", { event: "hello" }, () => {
          signal("ack", {});
          if (!polite) makeOffer();
        });
        channel.on("broadcast", { event: "ack" }, () => {
          if (!polite) makeOffer();
        });

        const flushPending = async () => {
          while (pendingCandidates.length && pc?.remoteDescription) {
            const c = pendingCandidates.shift();
            try { await pc.addIceCandidate(c); } catch { /* ignore */ }
          }
        };

        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            subscribed = true;
            flushOutbox();
            channel!.send({ type: "broadcast", event: "hello", payload: {} });
          }
        });

        // 2) Mic — reuse across reconnects to avoid permission re-prompts/glitches.
        let stream = localStreamRef.current;
        if (!stream || stream.getAudioTracks().every((t) => t.readyState === "ended")) {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
          localStreamRef.current = stream;
        }
        if (cancelled) return;
        stream.getAudioTracks().forEach((t) => (t.enabled = !mutedRef.current));

        // 3) Peer connection
        pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun.cloudflare.com:3478" },
          ],
        });
        pcRef.current = pc;

        pc.ontrack = (e) => {
          if (audioRef.current) {
            audioRef.current.srcObject = e.streams[0];
            audioRef.current.muted = !speakerRef.current;
            audioRef.current.play().catch(() => {});
            setVoiceState("live");
          }
        };

        pc.onnegotiationneeded = () => { makeOffer(); };

        pc.onicecandidate = (e) => {
          if (e.candidate) signal("ice", { candidate: e.candidate.toJSON() });
        };

        pc.oniceconnectionstatechange = () => {
          const st = pc?.iceConnectionState;
          if (st === "connected" || st === "completed") {
            setVoiceState("live");
            ensureAudioPlaying();
          } else if (st === "disconnected") {
            setTimeout(() => {
              if (!cancelled && pcRef.current?.iceConnectionState === "disconnected") {
                try { pcRef.current.restartIce(); } catch { /* not supported */ }
              }
            }, 1500);
          } else if (st === "failed") {
            try { pc?.restartIce(); } catch { /* ignore */ }
            scheduleReconnect(2500);
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc?.connectionState === "failed" || pc?.connectionState === "closed") {
            scheduleReconnect(2500);
          }
        };

        // Always receive audio, then publish mic (fires onnegotiationneeded).
        pc.addTransceiver("audio", { direction: "sendrecv" });
        stream.getAudioTracks().forEach((t) => {
          const sender = pc!.getSenders().find((s) => s.track === null);
          if (sender) sender.replaceTrack(t);
          else pc!.addTrack(t, stream!);
        });

        // Say hello again once media is ready so the other side re-offers if needed.
        signal("hello", {});

        // Health check — recover from silent stalls (e.g. mobile sleep/wake)
        healthTimer = setInterval(() => {
          ensureAudioPlaying();
          if (!pc) return;
          const st = pc.iceConnectionState;
          if (st === "failed" || pc.connectionState === "failed") scheduleReconnect(1000);
          else if (!polite && st === "new" && pc.signalingState === "stable") makeOffer();
        }, 5000);
      } catch (err) {
        console.warn("voice setup error", err);
        setVoiceState("off");
      }
    })();

    return () => {
      cancelled = true;
      if (healthTimer) clearInterval(healthTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (channel) supabase.removeChannel(channel);
      pc?.close();
      pcRef.current = null;
      // NOTE: do NOT stop the mic stream here — we want to reuse it on reconnect.
    };
  }, [props.roomId, props.guestId, props.youMark, voiceAttempt]);

  // Mute / speaker applied live — never tear down the call for these
  useEffect(() => {
    mutedRef.current = muted;
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }, [muted]);
  useEffect(() => {
    speakerRef.current = speakerOn;
    if (audioRef.current) {
      audioRef.current.muted = !speakerOn;
      if (speakerOn) audioRef.current.play().catch(() => {});
    }
  }, [speakerOn]);

  // Fully release mic only when leaving the game screen
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
  }, []);


  // Keep remote audio playing if the browser pauses it (tab focus, autoplay policy, etc.)
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const resume = () => { if (el.srcObject) el.play().catch(() => {}); };
    el.addEventListener("pause", resume);
    el.addEventListener("ended", resume);
    const onVis = () => { if (document.visibilityState === "visible") resume(); };
    const onFocus = () => resume();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    return () => {
      el.removeEventListener("pause", resume);
      el.removeEventListener("ended", resume);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  };
  const toggleSpeaker = () => {
    setSpeakerOn((s) => {
      const next = !s;
      if (audioRef.current) audioRef.current.muted = !next;
      return next;
    });
  };

  const [hasUnread, setHasUnread] = useState(false);
  const [forfeitOpen, setForfeitOpen] = useState(false);
  useEffect(() => {
    const last = props.messages[props.messages.length - 1];
    if (last && last.kind === "chat" && !chatOpen) setHasUnread(true);
  }, [props.messages, chatOpen]);
  useEffect(() => { if (chatOpen) setHasUnread(false); }, [chatOpen]);

  // Auto-rematch when multiplayer game finishes (host triggers to avoid double-fire)
  const [rematchIn, setRematchIn] = useState<number | null>(null);
  useEffect(() => {
    if (!props.finished || !props.autoRematch) { setRematchIn(null); return; }
    setRematchIn(4);
    const tick = setInterval(() => {
      setRematchIn((n) => {
        if (n === null) return null;
        if (n <= 1) { clearInterval(tick); props.onRematch(); return null; }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [props.finished, props.autoRematch, props.roomId, props.onRematch]);

  const sendReaction = (r: string) => props.onSend(r, "reaction");
  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    props.onSend(message.trim(), "chat");
    setMessage("");
  };

  // Waiting screen for host before guest joins
  if (props.waiting) {
    return (
      <div className="min-h-[100dvh] bg-surface flex flex-col items-center justify-center text-center gap-6 px-6">
        <div className="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center">
          <Icon name="hourglass_top" filled className="text-primary text-5xl" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Waiting for opponent…</h1>
          <p className="text-on-surface-variant mt-1">Share the code to start the match.</p>
        </div>
        <div className="bg-primary text-on-primary rounded-2xl px-6 py-4 shadow-[0_6px_0_#394086]">
          <p className="text-[10px] tracking-widest opacity-80 uppercase">Invite Code</p>
          <p className="text-4xl font-bold tracking-[0.3em]">{props.code}</p>
        </div>
        <button onClick={() => navigator.clipboard.writeText(props.code)} className="text-sm font-semibold text-primary underline">Copy code</button>
        <button onClick={props.onHome} className="text-sm font-semibold text-on-surface-variant underline">Cancel and go home</button>
      </div>
    );
  }

  const line = props.winningLine ?? (() => {
    for (const l of LINES) { const [a,b,c] = l; if (props.board[a] && props.board[a] === props.board[b] && props.board[a] === props.board[c]) return l; } return null;
  })();
  const youWon = props.winnerId && props.youMark && ((props.youMark === "X" && props.winnerId === props.hostId) || (props.youMark === "O" && props.winnerId === props.guestId));

  return (
    <div className="h-[100dvh] bg-surface text-on-surface flex flex-col overflow-hidden relative">
      <audio ref={audioRef} autoPlay playsInline />

      <header className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
        <button onClick={props.onHome} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center" aria-label="Leave game">
          <Icon name="arrow_back" />
        </button>
        <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wider text-on-surface-variant">LIVE · ROUND {props.round}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {!props.finished && !!props.guestId && !!props.youMark && (
            <button onClick={() => setForfeitOpen(true)} className="w-10 h-10 rounded-full bg-error/15 text-error flex items-center justify-center active:scale-95 transition-transform" aria-label="Forfeit match">
              <Icon name="flag" filled />
            </button>
          )}
          <button onClick={() => setChatOpen(true)} className="relative w-10 h-10 rounded-full bg-surface-container flex items-center justify-center" aria-label="Open chat">
            <Icon name="chat_bubble" filled />
            {hasUnread && (
              <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-error ring-2 ring-surface" />
            )}
          </button>
        </div>

      </header>

      <section className="flex items-stretch justify-between gap-1.5 px-3 shrink-0">
        <PlayerCard name={props.hostName} score={props.hostScore} active={props.turn === "X" && !props.finished} mark="X" side="left" you={props.youMark === "X"} />
        <ScoreCenter
          hostScore={props.hostScore}
          guestScore={props.guestScore}
          draws={Math.max(0, props.round - 1 - props.hostScore - props.guestScore)}
        />
        <PlayerCard name={props.guestName} score={props.guestScore} active={props.turn === "O" && !props.finished} mark="O" side="right" you={props.youMark === "O"} />
      </section>

      {props.finished && (
        <ResultOverlay outcome={props.isDraw ? "draw" : youWon ? "win" : "lose"} round={props.round} />
      )}

      {introPhase !== "hidden" && (
        <VsIntro
          hostName={props.hostName}
          guestName={props.guestName}
          phaseOut={introPhase === "out"}
        />
      )}

      <section className="flex-1 min-h-0 flex items-center justify-center px-4 py-2">
        <div className="bg-primary-container/60 p-3 rounded-3xl shadow-[0_10px_0_-2px_rgba(57,64,134,0.25)] border-2 border-primary/20 aspect-square" style={{ width: "min(100%, calc(100dvh - 360px), 360px)" }}>
          <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full h-full">
            {props.board.map((c, i) => {
              const winning = line?.includes(i);
              const myTurn = props.youMark === props.turn && !props.finished;
              const playable = myTurn && !c;
              return (
                <button key={i} onClick={() => playable && props.onCell(i)} disabled={!playable}
                  className={cn(
                    "rounded-2xl flex items-center justify-center transition-all active:scale-90 touch-manipulation",
                    "bg-surface shadow-[inset_0_-3px_0_rgba(57,64,134,0.12),0_2px_0_rgba(57,64,134,0.08)]",
                    winning && "bg-secondary-container ring-2 ring-secondary",
                    !playable && !c && "opacity-70",
                  )}>
                  {c === "X" && <Icon name="close" className="text-primary" style={{ fontSize: "min(13vw, 56px)", fontVariationSettings: '"wght" 700' }} />}
                  {c === "O" && <Icon name="radio_button_unchecked" className="text-tertiary" style={{ fontSize: "min(12vw, 52px)", fontVariationSettings: '"wght" 700' }} />}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="shrink-0 px-3 pb-3 pt-1 space-y-2">
        {props.finished ? (
          <div className="flex gap-2">
            <button onClick={props.onRematch} className="bubbly flex-1 bg-primary text-on-primary py-3 rounded-2xl flex items-center justify-center gap-2 shadow-[0_5px_0_#394086] font-bold">
              <Icon name="replay" filled />
              {rematchIn !== null ? `Rematch in ${rematchIn}…` : "Rematch"}
            </button>
            <button onClick={props.onHome} className="bubbly flex-1 bg-surface-container text-on-surface py-3 rounded-2xl flex items-center justify-center gap-2 shadow-[0_5px_0_#c7c5d2] font-bold">
              <Icon name="home" filled /> Home
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 bg-inverse-surface rounded-full px-3 py-2">
              <div className="flex items-center gap-1.5 pl-1">
                <span className={cn("w-2 h-2 rounded-full", voiceState === "live" ? "bg-green-400 animate-pulse" : voiceState === "connecting" ? "bg-yellow-400" : "bg-gray-500")} />
                <span className="text-[11px] font-bold text-white/80 tracking-wider">
                  {voiceState === "live" ? "LIVE VOICE" : voiceState === "connecting" ? "CONNECTING…" : "VOICE OFF"}
                </span>
              </div>
              <div className="flex-1" />
              <button onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}
                className={cn("w-9 h-9 rounded-full flex items-center justify-center", muted ? "bg-error text-on-error" : "bg-white/15 text-white")}>
                <Icon name={muted ? "mic_off" : "mic"} filled className="text-xl" />
              </button>
              <button onClick={toggleSpeaker} aria-label={speakerOn ? "Mute speaker" : "Enable speaker"}
                className={cn("w-9 h-9 rounded-full flex items-center justify-center", speakerOn ? "bg-white/15 text-white" : "bg-error text-on-error")}>
                <Icon name={speakerOn ? "volume_up" : "volume_off"} filled className="text-xl" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-1 bg-surface-container/80 backdrop-blur-md p-1.5 rounded-full shadow border border-outline-variant/30">
              {REACTIONS.map((r) => (
                <button key={r} onClick={() => sendReaction(r)} className="hover:scale-125 active:scale-110 transition-transform text-xl w-8 h-8 flex items-center justify-center">{r}</button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {floats.map((f) => (
          <span key={f.id} className="absolute bottom-32 text-4xl float-up" style={{ left: `${f.left}%` }}>{f.emoji}</span>
        ))}
      </div>

      {/* Floating chat pop-ups (auto-dismiss) */}
      {chatPops.length > 0 && (
        <div className="absolute top-28 left-0 right-0 z-10 px-4 flex flex-col items-center gap-1.5 pointer-events-none">
          {chatPops.map((m) => {
            const mine = (props.youMark === "X" && m.user_id === props.hostId) || (props.youMark === "O" && m.user_id === props.guestId);
            const name = m.user_id === props.hostId ? props.hostName : props.guestName;
            return (
              <button key={m.id} onClick={() => setChatOpen(true)}
                className={cn("pointer-events-auto max-w-[85%] px-4 py-2 rounded-2xl text-sm font-medium shadow-lg animate-slide-up text-left",
                  mine ? "bg-secondary text-on-secondary" : "bg-inverse-surface text-white")}>
                <span className="block text-[10px] font-bold opacity-70 uppercase tracking-wide">{name}</span>
                <span className="block">{m.text}</span>
              </button>
            );
          })}
        </div>
      )}

      {chatOpen && (
        <>
          <button className="absolute inset-0 bg-black/50 animate-fade-in z-10" onClick={() => setChatOpen(false)} aria-label="Close chat" />
          <div className="absolute bottom-0 left-0 right-0 bg-inverse-surface rounded-t-3xl shadow-2xl z-20 max-h-[70dvh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between p-4 pb-2 shrink-0">
              <h3 className="font-bold text-white">Chat</h3>
              <button onClick={() => setChatOpen(false)} className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center">
                <Icon name="close" />
              </button>
            </div>
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-3 px-4 pb-2">
              {props.messages.filter((m) => m.kind !== "reaction").map((m) => {
                const mine = (props.youMark === "X" && m.user_id === props.hostId) || (props.youMark === "O" && m.user_id === props.guestId);
                return (
                  <div key={m.id} className={cn("flex items-end gap-1", mine && "flex-row-reverse")}>
                    <div className={cn("px-4 py-2 rounded-2xl text-sm font-medium max-w-[80%]",
                      mine ? "bg-secondary text-on-secondary rounded-br-none" : "bg-surface-variant text-on-surface-variant rounded-bl-none")}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={sendChat} className="flex items-center gap-2 p-3 pt-2 border-t border-white/10 shrink-0">
              <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." autoFocus
                className="flex-1 bg-white/10 text-white rounded-full px-4 py-3 text-sm font-semibold placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-secondary" />
              <button type="submit" className="w-11 h-11 bg-secondary text-on-secondary rounded-full flex items-center justify-center shadow-[0_4px_0_#363a9c] active:translate-y-0.5 active:shadow-[0_2px_0_#363a9c]" aria-label="Send">
                <Icon name="send" />
              </button>
            </form>
          </div>
        </>
      )}

      <AlertDialog open={forfeitOpen} onOpenChange={setForfeitOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-error/15 text-error flex items-center justify-center mb-2 animate-pulse">
              <Icon name="flag" filled className="text-3xl" />
            </div>
            <AlertDialogTitle className="text-center text-2xl">Forfeit the match?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              You'll lose this round and your opponent wins. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel className="rounded-2xl font-bold">Keep playing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setForfeitOpen(false); props.onForfeit(); }}
              className="rounded-2xl font-bold bg-error text-on-error hover:bg-error/90">
              <Icon name="flag" filled className="mr-1" /> Forfeit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

  );
}

function ScoreCenter({ hostScore, guestScore, draws }: { hostScore: number; guestScore: number; draws: number }) {
  return (
    <div className="shrink-0 self-stretch flex flex-col items-center justify-center px-2.5 py-1.5 rounded-2xl bg-inverse-surface text-white shadow-[0_4px_0_rgba(0,0,0,0.25)] border border-white/10">
      <div className="flex items-baseline gap-1.5 leading-none">
        <span className="text-2xl font-black text-mint-blue tabular-nums">{hostScore}</span>
        <span className="text-sm font-bold opacity-50">:</span>
        <span className="text-2xl font-black text-pastel-pink tabular-nums">{guestScore}</span>
      </div>
      <div className="mt-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/10">
        <span className="text-[9px] font-bold tracking-widest opacity-70">DRAWS</span>
        <span className="text-[11px] font-black tabular-nums">{draws}</span>
      </div>
    </div>
  );
}

function PlayerCard({ name, score, active, mark, side, you }: {
  name: string; score: number; active: boolean; mark: "X" | "O"; side: "left" | "right"; you: boolean;
}) {
  const accent = mark === "X" ? "text-mint-blue" : "text-pastel-pink";
  return (
    <div className={cn("flex-1 flex items-center gap-2 p-2 rounded-2xl border-2 transition relative min-w-0",
      side === "right" && "flex-row-reverse",
      active ? "bg-secondary text-on-secondary border-[#FFD700] scale-[1.02] shadow-[0_0_20px_rgba(255,215,0,0.45)]" : "bg-surface-container text-on-surface border-transparent")}>
      {active && (
        <div className={cn("absolute -top-2 bg-[#FFD700] text-on-primary-fixed text-[9px] tracking-widest font-bold px-2 py-0.5 rounded-full shadow whitespace-nowrap animate-pulse",
          side === "left" ? "left-2" : "right-2")}>YOUR TURN</div>
      )}
      <div className={cn("w-11 h-11 rounded-full bg-primary-container flex items-center justify-center font-black text-on-primary-container shrink-0 text-lg border-2",
        active ? "border-[#FFD700]" : "border-transparent")}>
        {name[0]?.toUpperCase() ?? "?"}
      </div>
      <div className={cn("min-w-0 flex-1", side === "right" && "text-right")}>
        <div className="text-[11px] font-bold truncate opacity-90 uppercase tracking-wide">{name}{you && " (You)"}</div>
        <div className={cn("flex items-baseline gap-1.5", side === "right" && "justify-end flex-row-reverse")}>
          <span className={cn("text-2xl font-black leading-none tabular-nums", active ? "text-on-secondary" : accent)}>{score}</span>
          <span className={cn("text-[10px] font-bold opacity-70 tracking-widest", accent)}>{mark}</span>
        </div>
      </div>
    </div>
  );
}

function ResultOverlay({ outcome, round }: { outcome: "win" | "lose" | "draw"; round: number }) {
  // Stable random particle positions per mount
  const confetti = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 1.6 + Math.random() * 1.8,
      hue: Math.floor(Math.random() * 360),
      size: 6 + Math.random() * 10,
    })),
    [],
  );
  const rain = useMemo(
    () => Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 1.4 + Math.random() * 1.4,
      emoji: ["💧", "😭", "💔"][i % 3],
    })),
    [],
  );

  if (outcome === "win") {
    return (
      <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/40 via-amber-500/25 to-transparent animate-flash-bg" />
        {/* Confetti */}
        {confetti.map((p) => (
          <span key={p.id} className="confetti-piece"
            style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size * 1.6}px`,
              background: `hsl(${p.hue} 90% 60%)`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }} />
        ))}
        {/* Bursting rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-72 h-72">
            <div className="absolute inset-0 rounded-full border-4 border-yellow-300 animate-burst-ring" />
            <div className="absolute inset-0 rounded-full border-4 border-amber-400 animate-burst-ring" style={{ animationDelay: "0.4s" }} />
            <div className="absolute inset-0 rounded-full border-4 border-orange-300 animate-burst-ring" style={{ animationDelay: "0.8s" }} />
          </div>
        </div>
        {/* Trophy + label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
          <span className="text-[120px] leading-none animate-trophy-spin text-yellow-400 animate-result-glow">🏆</span>
          <h2 className="text-5xl font-black text-yellow-300 drop-shadow-[0_3px_0_rgba(0,0,0,0.4)] animate-result-pop"
              style={{ animationDelay: "0.3s" }}>
            VICTORY!
          </h2>
          <p className="text-yellow-100/90 font-bold tracking-widest text-xs animate-result-pop drop-shadow-[0_2px_0_rgba(0,0,0,0.6)]" style={{ animationDelay: "0.5s" }}>
            ROUND {round} · +COINS EARNED
          </p>
        </div>
      </div>
    );
  }

  if (outcome === "lose") {
    return (
      <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/60 via-red-700/35 to-transparent animate-flash-bg" />
        {/* Rain of tears */}
        {rain.map((p) => (
          <span key={p.id} className="rain-drop"
            style={{
              left: `${p.left}%`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}>
            {p.emoji}
          </span>
        ))}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
          <span className="text-[120px] leading-none text-red-500 animate-shake-hard animate-result-glow">💀</span>
          <h2 className="text-5xl font-black text-red-300 drop-shadow-[0_3px_0_rgba(0,0,0,0.7)] animate-result-pop"
              style={{ animationDelay: "0.3s" }}>
            DEFEAT
          </h2>
          <p className="text-red-100/90 font-bold tracking-widest text-xs animate-result-pop drop-shadow-[0_2px_0_rgba(0,0,0,0.6)]" style={{ animationDelay: "0.5s" }}>
            ROUND {round} · BETTER LUCK NEXT TIME
          </p>
        </div>
      </div>
    );
  }

  // Draw
  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />
      <div className="absolute inset-0 bg-gradient-to-b from-sky-500/40 via-indigo-500/25 to-transparent animate-flash-bg" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-72 h-72">
          <div className="absolute inset-0 rounded-full border-4 border-sky-300 animate-burst-ring" />
          <div className="absolute inset-0 rounded-full border-4 border-indigo-300 animate-burst-ring" style={{ animationDelay: "0.5s" }} />
        </div>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
        <span className="text-[120px] leading-none animate-draw-bounce text-sky-200 animate-result-glow">🤝</span>
        <h2 className="text-5xl font-black text-sky-100 drop-shadow-[0_3px_0_rgba(0,0,0,0.7)] animate-result-pop"
            style={{ animationDelay: "0.3s" }}>
          DRAW!
        </h2>
        <p className="text-sky-100/90 font-bold tracking-widest text-xs animate-result-pop drop-shadow-[0_2px_0_rgba(0,0,0,0.6)]" style={{ animationDelay: "0.5s" }}>
          ROUND {round} · EVENLY MATCHED
        </p>
      </div>
    </div>
  );
}

function VsIntro({ hostName, guestName, phaseOut }: { hostName: string; guestName: string; phaseOut: boolean }) {
  const sparks = useMemo(
    () => Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: 40 + Math.random() * 20,
      top: 40 + Math.random() * 20,
      delay: Math.random() * 0.3,
      duration: 0.8 + Math.random() * 0.6,
      hue: Math.floor(Math.random() * 360),
    })),
    [],
  );

  return (
    <div className={cn("pointer-events-none fixed inset-0 z-40 overflow-hidden", phaseOut && "animate-intro-out")}>
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600/60 via-black/70 to-cyan-600/60 backdrop-blur-sm" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-y-0 w-1/3 bg-white/10 animate-intro-streak" style={{ left: "-10%" }} />
        <div className="absolute inset-y-0 w-1/4 bg-white/15 animate-intro-streak" style={{ left: "-20%", animationDelay: "0.15s" }} />
      </div>

      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/40 to-blue-700/40 animate-slam-left"
          style={{ clipPath: "polygon(0 0, 60% 0, 40% 100%, 0 100%)" }} />
        <div className="absolute inset-0 bg-gradient-to-bl from-pink-400/40 to-rose-700/40 animate-slam-right"
          style={{ clipPath: "polygon(60% 0, 100% 0, 100% 100%, 40% 100%)" }} />
      </div>

      <div className="absolute inset-y-0 left-0 w-1/2 flex flex-col items-center justify-center gap-4 animate-slam-left">
        <div className="w-32 h-32 rounded-full bg-cyan-300 border-[6px] border-white flex items-center justify-center text-6xl font-black text-cyan-900 shadow-[0_0_60px_rgba(34,211,238,0.9)]">
          {hostName[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="text-white font-black text-2xl tracking-wider drop-shadow-[0_3px_0_rgba(0,0,0,0.6)] max-w-[80%] truncate text-center">{hostName}</div>
        <div className="text-cyan-200 text-xs font-bold tracking-[0.3em]">PLAYER · X</div>
      </div>

      <div className="absolute inset-y-0 right-0 w-1/2 flex flex-col items-center justify-center gap-4 animate-slam-right">
        <div className="w-32 h-32 rounded-full bg-pink-300 border-[6px] border-white flex items-center justify-center text-6xl font-black text-pink-900 shadow-[0_0_60px_rgba(244,114,182,0.9)]">
          {guestName[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="text-white font-black text-2xl tracking-wider drop-shadow-[0_3px_0_rgba(0,0,0,0.6)] max-w-[80%] truncate text-center">{guestName}</div>
        <div className="text-pink-200 text-xs font-bold tracking-[0.3em]">PLAYER · O</div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full border-4 border-yellow-300 animate-shockwave" style={{ animationDelay: "0.55s" }} />
          <div className="absolute inset-0 rounded-full border-4 border-white animate-shockwave" style={{ animationDelay: "0.7s" }} />
          <div className="relative text-[140px] leading-none font-black bg-gradient-to-b from-yellow-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent animate-vs-smash"
            style={{
              WebkitTextStroke: "4px white",
              filter: "drop-shadow(0 6px 0 rgba(0,0,0,0.5)) drop-shadow(0 0 30px rgba(253,224,71,0.8))",
              animationDelay: "0.5s",
            }}>
            VS
          </div>
          {sparks.map((s) => (
            <span key={s.id} className="absolute w-2 h-2 rounded-full animate-shockwave"
              style={{
                left: `${s.left}%`, top: `${s.top}%`,
                background: `hsl(${s.hue} 90% 70%)`,
                animationDelay: `${0.6 + s.delay}s`,
                animationDuration: `${s.duration}s`,
              }} />
          ))}
        </div>
      </div>

      <div className="absolute bottom-24 left-0 right-0 text-center">
        <div className="inline-block text-white font-black text-lg tracking-[0.4em] animate-vs-smash" style={{ animationDelay: "1.1s" }}>
          GAME ON!
        </div>
      </div>
    </div>
  );
}
