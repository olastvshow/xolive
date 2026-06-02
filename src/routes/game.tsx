import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
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

  const { winner, line, draw } = useMemo(() => checkWinner(board), [board]);
  const finished = !!winner || draw;

  // Simulate opponent joining after a moment when waiting
  useEffect(() => {
    if (!waiting) return;
    const t = setTimeout(() => setWaiting(false), 2200);
    return () => clearTimeout(t);
  }, [waiting]);

  // Award score when game ends
  useEffect(() => {
    if (!finished || waiting) return;
    if (winner === "X") setScore((s) => ({ ...s, me: s.me + 1 }));
    else if (winner === "O") setScore((s) => ({ ...s, them: s.them + 1 }));
  }, [finished, winner, waiting]);

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

  const sendReaction = (r: string) =>
    setChat((c) => [...c, { from: "me", text: r, avatar: SARAH }]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setChat((c) => [...c, { from: "me", text: message.trim(), avatar: SARAH }]);
    setMessage("");
  };

  if (waiting) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center text-center gap-6 py-10">
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
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col items-center gap-8">
        {/* Scoreboard */}
        <section className="w-full flex justify-between items-stretch gap-3">
          <div
            className={cn(
              "flex-1 flex flex-col items-center p-5 rounded-2xl border-4 relative transition",
              turn === "X" && !finished
                ? "bg-secondary text-on-secondary border-[#FFD700] scale-[1.03]"
                : "bg-surface-container text-on-surface border-transparent"
            )}
          >
            {turn === "X" && !finished && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FFD700] text-on-primary-fixed text-[10px] tracking-widest font-bold px-2 py-1 rounded-full shadow whitespace-nowrap">
                YOUR TURN
              </div>
            )}
            <div className="w-14 h-14 rounded-full overflow-hidden mb-2">
              <img src={SARAH} alt="Sarah" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-semibold">Sarah</span>
            <span className="text-2xl font-bold mt-1">{score.me}</span>
          </div>

          <div className="flex flex-col items-center justify-center gap-2 px-2">
            <span className="text-4xl font-bold text-primary opacity-30 tracking-tight">VS</span>
            <div className="bg-surface-container px-3 py-1 rounded-full text-[10px] tracking-widest font-bold text-on-surface-variant">
              ROUND {round}
            </div>
          </div>

          <div
            className={cn(
              "flex-1 flex flex-col items-center p-5 rounded-2xl border-4 transition",
              turn === "O" && !finished
                ? "bg-secondary text-on-secondary border-[#FFD700] scale-[1.03]"
                : "bg-inverse-surface text-inverse-on-surface border-transparent opacity-80"
            )}
          >
            <div className="w-14 h-14 rounded-full overflow-hidden mb-2 grayscale">
              <img src={DAVID} alt="David" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-semibold">David</span>
            <span className="text-2xl font-bold mt-1">{score.them}</span>
          </div>
        </section>

        {/* Status banner */}
        {finished && (
          <div
            className={cn(
              "w-full text-center py-3 rounded-2xl font-bold text-lg shadow",
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

        {/* Board */}
        <section className="aspect-square w-full max-w-[400px] bg-inverse-surface p-4 rounded-2xl shadow-xl">
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
                    <Icon name="close" className="text-mint-blue glow-x" style={{ fontSize: 64 }} />
                  )}
                  {c === "O" && (
                    <Icon
                      name="radio_button_unchecked"
                      className="text-pastel-pink glow-o"
                      style={{ fontSize: 64 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Action row */}
        {finished ? (
          <div className="w-full flex gap-3">
            <button
              onClick={rematch}
              className="bubbly flex-1 bg-primary text-on-primary py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_6px_0_#394086] font-bold"
            >
              <Icon name="replay" filled />
              Rematch
            </button>
            <Link
              to="/"
              className="bubbly flex-1 bg-surface-container text-on-surface py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_6px_0_#c7c5d2] font-bold"
            >
              <Icon name="home" filled />
              Home
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-2 bg-surface-container/80 backdrop-blur-md p-2 rounded-full shadow-md mx-auto border border-outline-variant/30">
            {REACTIONS.map((r) => (
              <button
                key={r}
                onClick={() => sendReaction(r)}
                className="hover:scale-125 transition-transform duration-200 text-2xl p-1"
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {/* Chat */}
        <div className="w-full bg-inverse-surface rounded-2xl p-5 shadow-lg flex flex-col gap-3">
          <div className="flex-1 overflow-y-auto space-y-3 max-h-48 pr-1">
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
          <form onSubmit={send} className="flex items-center gap-3">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-white/10 text-surface rounded-full px-4 py-3 text-sm font-semibold placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-secondary"
            />
            <button
              type="submit"
              className="w-11 h-11 bg-secondary text-on-secondary rounded-full flex items-center justify-center shadow-[0_4px_0_#363a9c] active:translate-y-0.5 active:shadow-[0_2px_0_#363a9c] transition-all"
            >
              <Icon name="send" />
            </button>
          </form>
        </div>
      </div>
    </Shell>
  );
}
