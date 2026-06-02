import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { TopBar } from "@/components/TopBar";
import { cn } from "@/lib/utils";

type Search = { code?: string; quick?: boolean; mode?: string; bet?: number };

export const Route = createFileRoute("/game")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    code: typeof s.code === "string" ? s.code : undefined,
    quick: s.quick === true || s.quick === "true",
    mode: typeof s.mode === "string" ? s.mode : undefined,
    bet: typeof s.bet === "number" ? s.bet : undefined,
  }),
  head: () => ({
    meta: [
      { title: "XO Live — Game Room" },
      { name: "description", content: "Live tic-tac-toe match with voice chat and reactions." },
    ],
  }),
  component: GamePage,
});

type Cell = "X" | "O" | null;
const EMPTY: Cell[] = Array(9).fill(null);

const SARAH =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB1XVq64IGtYVJfsihbhb-6kP4hrLGnnnWIEqFkgHXPJTtU52T3fn6xoLWdlKQDGZAgqHlFTR5kUDOlHVmWFNP1XICXZ-jaK3ttAqUana0jJ0W1sC_oaOCV5PyyOIt9P4A-J05TUJI914bDUhgfvV_s7R4WjP3QjUkirbzTpWFj0ySZZsgDPKfafZ3t20qdJm3IYf5NMvB-gPQOFy4AlFOJJSys5Dbt4WiDUWB2yMbqAYxfQmTZGZClRM_TqzF0qReRmAPCjRjrKpau";
const DAVID =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCxNfjH7__d9WVfbgJkmOcPyh66nzGHMC6LvN02LPnqU2GXGqBqdRJgmeh_vAqW0sjWW6Z3X1qrKzF7qGnm901K2Rc-yunNMjBW-3fHE0qATHsnyJOJzkk-WwxEbFkFn5ShRgntqgHmmgXCwxg9TMcHjkvdBMNW2xFG7AsAg_jW_dexLQBlMC7yMaBwoiiX-6rWTvmCdIuI8ZKYrPeBmRdAWKjFGth5c2wUVLMqkfZmr5luFvcPdjbSkvTuf4AExmDcrQlWSif1elro";

const REACTIONS = ["❤️", "😂", "😭", "🥰", "😘", "🔥", "😡", "😎"];

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(b: Cell[]): { winner: "X" | "O" | null; line: number[] | null; draw: boolean } {
  for (const line of LINES) {
    const [a, b1, c] = line;
    if (b[a] && b[a] === b[b1] && b[a] === b[c]) {
      return { winner: b[a] as "X" | "O", line, draw: false };
    }
  }
  return { winner: null, line: null, draw: b.every((c) => c !== null) };
}

type FloatReaction = { id: number; emoji: string; left: number };

function GamePage() {
  const navigate = useNavigate();
  const { code, quick } = Route.useSearch();
  const navigatedFromCreate = !!code && !quick;

  const [waiting, setWaiting] = useState(navigatedFromCreate);
  const [board, setBoard] = useState<Cell[]>(EMPTY);
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<{ from: "me" | "them"; text: string; avatar: string }[]>([
    { from: "them", text: "GLHF! 🎮", avatar: DAVID },
  ]);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState({ me: 0, them: 0 });
  const [chatOpen, setChatOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [floats, setFloats] = useState<FloatReaction[]>([]);
  const floatId = useRef(0);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const { winner, line, draw } = useMemo(() => checkWinner(board), [board]);
  const finished = !!winner || draw;
  const unread = chat.length;

  useEffect(() => {
    if (!waiting) return;
    const t = setTimeout(() => {
      setWaiting(false);
      setVoiceConnected(true);
    }, 2000);
    return () => clearTimeout(t);
  }, [waiting]);

  useEffect(() => {
    if (!waiting) setVoiceConnected(true);
  }, [waiting]);

  useEffect(() => {
    if (!finished || waiting) return;
    if (winner === "X") setScore((s) => ({ ...s, me: s.me + 1 }));
    else if (winner === "O") setScore((s) => ({ ...s, them: s.them + 1 }));
  }, [finished, winner, waiting]);

  useEffect(() => {
    if (chatOpen && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chat, chatOpen]);

  const handleCell = (i: number) => {
    if (waiting || finished || board[i]) return;
    const next = [...board];
    next[i] = turn;
    setBoard(next);
    setTurn(turn === "X" ? "O" : "X");
  };

  const rematch = () => {
    setBoard(EMPTY);
    setTurn("X");
    setRound((r) => r + 1);
  };

  const spawnFloat = (emoji: string) => {
    const id = ++floatId.current;
    const left = 20 + Math.random() * 60;
    setFloats((f) => [...f, { id, emoji, left }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 2200);
  };

  const sendReaction = (r: string) => {
    spawnFloat(r);
    setChat((c) => [...c, { from: "me", text: r, avatar: SARAH }]);
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setChat((c) => [...c, { from: "me", text: message.trim(), avatar: SARAH }]);
    setMessage("");
  };

  if (waiting) {
    return (
      <div className="min-h-screen bg-surface flex flex-col">
        <TopBar />
        <main className="flex-1 flex flex-col items-center justify-center text-center gap-6 px-6 pt-20 pb-10">
          <div className="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center float-y">
            <Icon name="hourglass_top" filled className="text-primary text-5xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Waiting for opponent…</h1>
            <p className="text-on-surface-variant mt-1">Share the code to start the match.</p>
          </div>
          <div className="bg-primary text-on-primary rounded-2xl px-6 py-4 shadow-[0_6px_0_#394086]">
            <p className="text-[10px] tracking-widest opacity-80 uppercase">Invite Code</p>
            <p className="text-4xl font-bold tracking-[0.3em]">{code}</p>
          </div>
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-sm font-semibold text-on-surface-variant underline"
          >
            Cancel and go home
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-surface text-on-surface flex flex-col overflow-hidden relative">
      {/* Compact in-game top bar */}
      <header className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
        <Link
          to="/"
          className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center"
          aria-label="Leave game"
        >
          <Icon name="arrow_back" />
        </Link>
        <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wider text-on-surface-variant">
            LIVE · ROUND {round}
          </span>
        </div>
        <button
          onClick={() => setChatOpen(true)}
          className="relative w-10 h-10 rounded-full bg-surface-container flex items-center justify-center"
          aria-label="Open chat"
        >
          <Icon name="chat_bubble" filled />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-error text-on-error text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      </header>

      {/* Scoreboard – horizontal compact */}
      <section className="flex items-center justify-between gap-2 px-3 shrink-0">
        <PlayerCard
          name="Sarah"
          avatar={SARAH}
          score={score.me}
          active={turn === "X" && !finished}
          mark="X"
          side="left"
        />
        <span className="text-xs font-bold text-on-surface-variant opacity-50">VS</span>
        <PlayerCard
          name="David"
          avatar={DAVID}
          score={score.them}
          active={turn === "O" && !finished}
          mark="O"
          side="right"
        />
      </section>

      {/* Status banner — overlays board so layout doesn't shift */}
      {finished && (
        <div
          className={cn(
            "mx-3 mt-2 text-center py-2 rounded-xl font-bold text-sm shadow shrink-0 animate-fade-in",
            winner === "X" && "bg-primary text-on-primary",
            winner === "O" && "bg-error text-on-error",
            draw && "bg-surface-container-high text-on-surface"
          )}
        >
          {winner === "X" && "🏆 You won this round!"}
          {winner === "O" && "💀 David takes the round"}
          {draw && "🤝 Draw — nobody wins"}
        </div>
      )}

      {/* Board – flexes to fill remaining space, sized to fit */}
      <section className="flex-1 min-h-0 flex items-center justify-center px-4 py-2">
        <div
          className="bg-inverse-surface p-3 rounded-2xl shadow-xl aspect-square"
          style={{ width: "min(100%, calc(100dvh - 360px), 360px)" }}
        >
          <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full h-full">
            {board.map((c, i) => {
              const winning = line?.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => handleCell(i)}
                  className={cn(
                    "rounded-xl flex items-center justify-center transition-transform active:scale-95 shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)]",
                    winning ? "bg-primary/40" : "bg-secondary/20"
                  )}
                >
                  {c === "X" && (
                    <Icon name="close" className="text-mint-blue glow-x" style={{ fontSize: "min(13vw, 56px)" }} />
                  )}
                  {c === "O" && (
                    <Icon
                      name="radio_button_unchecked"
                      className="text-pastel-pink glow-o"
                      style={{ fontSize: "min(12vw, 52px)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom dock: voice + reactions OR rematch */}
      <div className="shrink-0 px-3 pb-3 pt-1 space-y-2">
        {finished ? (
          <div className="flex gap-2">
            <button
              onClick={rematch}
              className="bubbly flex-1 bg-primary text-on-primary py-3 rounded-2xl flex items-center justify-center gap-2 shadow-[0_5px_0_#394086] font-bold"
            >
              <Icon name="replay" filled />
              Rematch
            </button>
            <Link
              to="/"
              className="bubbly flex-1 bg-surface-container text-on-surface py-3 rounded-2xl flex items-center justify-center gap-2 shadow-[0_5px_0_#c7c5d2] font-bold"
            >
              <Icon name="home" filled />
              Home
            </Link>
          </div>
        ) : (
          <>
            {/* Voice bar */}
            <div className="flex items-center gap-2 bg-inverse-surface rounded-full px-3 py-2">
              <div className="flex items-center gap-1.5 pl-1">
                <span className={cn("w-2 h-2 rounded-full", voiceConnected ? "bg-green-400 animate-pulse" : "bg-gray-500")} />
                <span className="text-[11px] font-bold text-white/80 tracking-wider">
                  {voiceConnected ? "LIVE VOICE" : "OFFLINE"}
                </span>
              </div>
              <div className="flex-1" />
              <button
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? "Unmute" : "Mute"}
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition",
                  muted ? "bg-error text-on-error" : "bg-white/15 text-white"
                )}
              >
                <Icon name={muted ? "mic_off" : "mic"} filled className="text-xl" />
              </button>
              <button
                onClick={() => setSpeakerOn((s) => !s)}
                aria-label={speakerOn ? "Mute speaker" : "Enable speaker"}
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition",
                  speakerOn ? "bg-white/15 text-white" : "bg-error text-on-error"
                )}
              >
                <Icon name={speakerOn ? "volume_up" : "volume_off"} filled className="text-xl" />
              </button>
            </div>

            {/* Reactions strip */}
            <div className="flex items-center justify-between gap-1 bg-surface-container/80 backdrop-blur-md p-1.5 rounded-full shadow border border-outline-variant/30">
              {REACTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => sendReaction(r)}
                  className="hover:scale-125 active:scale-110 transition-transform duration-200 text-xl w-8 h-8 flex items-center justify-center"
                >
                  {r}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Floating reaction overlay */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {floats.map((f) => (
          <span
            key={f.id}
            className="absolute bottom-32 text-4xl float-up"
            style={{ left: `${f.left}%` }}
          >
            {f.emoji}
          </span>
        ))}
      </div>

      {/* Chat drawer */}
      {chatOpen && (
        <>
          <button
            className="absolute inset-0 bg-black/50 animate-fade-in z-10"
            onClick={() => setChatOpen(false)}
            aria-label="Close chat"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-inverse-surface rounded-t-3xl shadow-2xl z-20 max-h-[70dvh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between p-4 pb-2 shrink-0">
              <h3 className="font-bold text-white">Chat</h3>
              <button
                onClick={() => setChatOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center"
                aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </div>
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-3 px-4 pb-2">
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={cn("flex items-end gap-1", m.from === "me" ? "flex-row-reverse" : "")}
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden mb-1 shrink-0">
                    <img src={m.avatar} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div
                    className={cn(
                      "px-4 py-2 rounded-2xl text-sm font-medium max-w-[80%]",
                      m.from === "me"
                        ? "bg-secondary text-on-secondary rounded-br-none"
                        : "bg-surface-variant text-on-surface-variant rounded-bl-none"
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={send} className="flex items-center gap-2 p-3 pt-2 border-t border-white/10 shrink-0">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                autoFocus
                className="flex-1 bg-white/10 text-white rounded-full px-4 py-3 text-sm font-semibold placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-secondary"
              />
              <button
                type="submit"
                className="w-11 h-11 bg-secondary text-on-secondary rounded-full flex items-center justify-center shadow-[0_4px_0_#363a9c] active:translate-y-0.5 active:shadow-[0_2px_0_#363a9c] transition-all shrink-0"
                aria-label="Send"
              >
                <Icon name="send" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

function PlayerCard({
  name,
  avatar,
  score,
  active,
  mark,
  side,
}: {
  name: string;
  avatar: string;
  score: number;
  active: boolean;
  mark: "X" | "O";
  side: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex-1 flex items-center gap-2 p-2 rounded-2xl border-2 transition relative min-w-0",
        side === "right" && "flex-row-reverse",
        active
          ? "bg-secondary text-on-secondary border-[#FFD700] scale-[1.02]"
          : "bg-surface-container text-on-surface border-transparent"
      )}
    >
      {active && (
        <div
          className={cn(
            "absolute -top-2 bg-[#FFD700] text-on-primary-fixed text-[9px] tracking-widest font-bold px-2 py-0.5 rounded-full shadow whitespace-nowrap",
            side === "left" ? "left-2" : "right-2"
          )}
        >
          TURN
        </div>
      )}
      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className={cn("min-w-0 flex-1", side === "right" && "text-right")}>
        <div className="text-xs font-semibold truncate">{name}</div>
        <div className="text-lg font-bold leading-none flex items-baseline gap-1.5" style={{ justifyContent: side === "right" ? "flex-end" : "flex-start" }}>
          <span>{score}</span>
          <span className={cn("text-xs opacity-60", mark === "X" ? "text-mint-blue" : "text-pastel-pink")}>{mark}</span>
        </div>
      </div>
    </div>
  );
}
