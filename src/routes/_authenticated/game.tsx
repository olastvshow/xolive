import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getRoomByCode, makeMove, sendMessage, rematch } from "@/lib/xo.functions";

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
      onCell={(i) => moveFn({ data: { roomId: room.id, index: i } }).catch(() => {})}
      onSend={(text, kind) => sendFn({ data: { roomId: room.id, text, kind } }).catch(() => {})}
      onRematch={() => rematchFn({ data: { roomId: room.id } }).catch(() => {})}
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
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [message, setMessage] = useState("");
  const [floats, setFloats] = useState<{ id: number; emoji: string; left: number }[]>([]);
  const floatId = useRef(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [voiceState, setVoiceState] = useState<"off" | "connecting" | "live">("off");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Spawn reaction emoji floats from message stream
  useEffect(() => {
    const last = props.messages[props.messages.length - 1];
    if (last && last.kind === "reaction") {
      const id = ++floatId.current;
      const left = 20 + Math.random() * 60;
      setFloats((f) => [...f, { id, emoji: last.text, left }]);
      setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 2200);
    }
    if (chatOpen && chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [props.messages, chatOpen]);

  // WebRTC voice - only when both players present
  useEffect(() => {
    if (!props.guestId || !props.youMark) return;
    let pc: RTCPeerConnection | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    const isHost = props.youMark === "X";

    (async () => {
      try {
        setVoiceState("connecting");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        localStreamRef.current = stream;
        pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc!.addTrack(t, stream));
        pc.ontrack = (e) => {
          if (audioRef.current) {
            audioRef.current.srcObject = e.streams[0];
            audioRef.current.play().catch(() => {});
            setVoiceState("live");
          }
        };
        channel = supabase.channel(`voice-${props.roomId}`, { config: { broadcast: { self: false } } });
        pc.onicecandidate = (e) => {
          if (e.candidate && channel) channel.send({ type: "broadcast", event: "ice", payload: { from: isHost ? "host" : "guest", candidate: e.candidate } });
        };
        channel.on("broadcast", { event: "offer" }, async (msg) => {
          if (isHost || !pc) return;
          await pc.setRemoteDescription(msg.payload.sdp);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel!.send({ type: "broadcast", event: "answer", payload: { sdp: answer } });
        });
        channel.on("broadcast", { event: "answer" }, async (msg) => {
          if (!isHost || !pc) return;
          await pc.setRemoteDescription(msg.payload.sdp);
        });
        channel.on("broadcast", { event: "ice" }, async (msg) => {
          if (!pc) return;
          try { await pc.addIceCandidate(msg.payload.candidate); } catch { /* ignore */ }
        });
        channel.on("broadcast", { event: "ready" }, async () => {
          if (isHost && pc) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            channel!.send({ type: "broadcast", event: "offer", payload: { sdp: offer } });
          }
        });
        await channel.subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            if (!isHost) {
              channel!.send({ type: "broadcast", event: "ready", payload: {} });
            } else {
              // also try after a delay in case guest subscribed first
              setTimeout(async () => {
                if (pc && pc.signalingState === "stable" && !pc.currentRemoteDescription) {
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);
                  channel!.send({ type: "broadcast", event: "offer", payload: { sdp: offer } });
                }
              }, 500);
            }
          }
        });
      } catch (err) {
        console.warn("voice error", err);
        setVoiceState("off");
      }
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      pc?.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
  }, [props.roomId, props.guestId, props.youMark]);

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

  const unread = props.messages.filter((m) => m.kind === "chat").length;

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
        <button onClick={() => setChatOpen(true)} className="relative w-10 h-10 rounded-full bg-surface-container flex items-center justify-center" aria-label="Open chat">
          <Icon name="chat_bubble" filled />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-error text-on-error text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">{unread}</span>
          )}
        </button>
      </header>

      <section className="flex items-center justify-between gap-2 px-3 shrink-0">
        <PlayerCard name={props.hostName} score={props.hostScore} active={props.turn === "X" && !props.finished} mark="X" side="left" you={props.youMark === "X"} />
        <span className="text-xs font-bold text-on-surface-variant opacity-50">VS</span>
        <PlayerCard name={props.guestName} score={props.guestScore} active={props.turn === "O" && !props.finished} mark="O" side="right" you={props.youMark === "O"} />
      </section>

      {props.finished && (
        <div className={cn("mx-3 mt-2 text-center py-2 rounded-xl font-bold text-sm shadow shrink-0",
          youWon && "bg-primary text-on-primary",
          !youWon && !props.isDraw && "bg-error text-on-error",
          props.isDraw && "bg-surface-container-high text-on-surface")}>
          {props.isDraw ? "🤝 Draw" : youWon ? "🏆 You won!" : "💀 You lost"}
        </div>
      )}

      <section className="flex-1 min-h-0 flex items-center justify-center px-4 py-2">
        <div className="bg-inverse-surface p-3 rounded-2xl shadow-xl aspect-square" style={{ width: "min(100%, calc(100dvh - 360px), 360px)" }}>
          <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full h-full">
            {props.board.map((c, i) => {
              const winning = line?.includes(i);
              const myTurn = props.youMark === props.turn && !props.finished;
              return (
                <button key={i} onClick={() => myTurn && props.onCell(i)} disabled={!myTurn || !!c}
                  className={cn("rounded-xl flex items-center justify-center transition-transform active:scale-95 shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)]",
                    winning ? "bg-primary/40" : "bg-secondary/20", !myTurn && "cursor-not-allowed")}>
                  {c === "X" && <Icon name="close" className="text-mint-blue glow-x" style={{ fontSize: "min(13vw, 56px)" }} />}
                  {c === "O" && <Icon name="radio_button_unchecked" className="text-pastel-pink glow-o" style={{ fontSize: "min(12vw, 52px)" }} />}
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
    </div>
  );
}

function PlayerCard({ name, score, active, mark, side, you }: {
  name: string; score: number; active: boolean; mark: "X" | "O"; side: "left" | "right"; you: boolean;
}) {
  return (
    <div className={cn("flex-1 flex items-center gap-2 p-2 rounded-2xl border-2 transition relative min-w-0",
      side === "right" && "flex-row-reverse",
      active ? "bg-secondary text-on-secondary border-[#FFD700] scale-[1.02]" : "bg-surface-container text-on-surface border-transparent")}>
      {active && (
        <div className={cn("absolute -top-2 bg-[#FFD700] text-on-primary-fixed text-[9px] tracking-widest font-bold px-2 py-0.5 rounded-full shadow whitespace-nowrap",
          side === "left" ? "left-2" : "right-2")}>TURN</div>
      )}
      <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center font-bold text-on-primary-container shrink-0">
        {name[0]?.toUpperCase() ?? "?"}
      </div>
      <div className={cn("min-w-0 flex-1", side === "right" && "text-right")}>
        <div className="text-xs font-semibold truncate">{name}{you && " (You)"}</div>
        <div className="text-lg font-bold leading-none flex items-baseline gap-1.5" style={{ justifyContent: side === "right" ? "flex-end" : "flex-start" }}>
          <span>{score}</span>
          <span className={cn("text-xs opacity-60", mark === "X" ? "text-mint-blue" : "text-pastel-pink")}>{mark}</span>
        </div>
      </div>
    </div>
  );
}
