import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/game")({
  head: () => ({
    meta: [
      { title: "XO Live — Game Room" },
      { name: "description", content: "Live tic-tac-toe match with voice chat and reactions." },
    ],
  }),
  component: GamePage,
});

type Cell = "X" | "O" | null;
const initialBoard: Cell[] = [null, "O", "X", null, "X", null, "O", null, null];

const SARAH =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB1XVq64IGtYVJfsihbhb-6kP4hrLGnnnWIEqFkgHXPJTtU52T3fn6xoLWdlKQDGZAgqHlFTR5kUDOlHVmWFNP1XICXZ-jaK3ttAqUana0jJ0W1sC_oaOCV5PyyOIt9P4A-J05TUJI914bDUhgfvV_s7R4WjP3QjUkirbzTpWFj0ySZZsgDPKfafZ3t20qdJm3IYf5NMvB-gPQOFy4AlFOJJSys5Dbt4WiDUWB2yMbqAYxfQmTZGZClRM_TqzF0qReRmAPCjRjrKpau";
const DAVID =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCxNfjH7__d9WVfbgJkmOcPyh66nzGHMC6LvN02LPnqU2GXGqBqdRJgmeh_vAqW0sjWW6Z3X1qrKzF7qGnm901K2Rc-yunNMjBW-3fHE0qATHsnyJOJzkk-WwxEbFkFn5ShRgntqgHmmgXCwxg9TMcHjkvdBMNW2xFG7AsAg_jW_dexLQBlMC7yMaBwoiiX-6rWTvmCdIuI8ZKYrPeBmRdAWKjFGth5c2wUVLMqkfZmr5luFvcPdjbSkvTuf4AExmDcrQlWSif1elro";

const REACTIONS = ["❤️", "😂", "😭", "🥰", "😘", "🔥", "😡", "😎"];

function GamePage() {
  const [board, setBoard] = useState<Cell[]>(initialBoard);
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([
    { from: "them", text: "Nice move! I didn't see that coming.", avatar: DAVID },
    { from: "me", text: "Hehe, thanks! You're playing well too.", avatar: SARAH },
  ]);

  const handleCell = (i: number) => {
    if (board[i]) return;
    const next = [...board];
    next[i] = turn;
    setBoard(next);
    setTurn(turn === "X" ? "O" : "X");
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setChat((c) => [...c, { from: "me", text: message.trim(), avatar: SARAH }]);
    setMessage("");
  };

  return (
    <Shell>
      <div className="flex flex-col items-center gap-10">
        {/* Scoreboard */}
        <section className="w-full flex justify-between items-stretch gap-4">
          <div className="flex-1 flex flex-col items-center p-6 bg-secondary text-on-secondary rounded-2xl scale-[1.03] border-4 border-[#FFD700] relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FFD700] text-on-primary-fixed text-[10px] tracking-widest font-bold px-2 py-1 rounded-full shadow whitespace-nowrap">
              YOUR TURN
            </div>
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden mb-2">
                <img src={SARAH} alt="Sarah" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-secondary flex items-center justify-center">
                <span className="absolute w-3 h-3 bg-white/70 rounded-full voice-ring" />
                <Icon name="mic" className="text-[14px] text-white relative" />
              </div>
            </div>
            <span className="text-xl font-semibold mt-1">Sarah</span>
            <span className="text-xs font-bold tracking-widest opacity-80">12 WINS</span>
          </div>

          <div className="flex flex-col items-center justify-center gap-2 px-2">
            <span className="text-5xl font-bold text-primary opacity-20 tracking-tight">VS</span>
            <div className="bg-surface-container px-3 py-1 rounded-full text-[10px] tracking-widest font-bold text-on-surface-variant">
              ROUND 3
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center p-6 bg-inverse-surface text-inverse-on-surface rounded-2xl opacity-80">
            <div className="w-16 h-16 rounded-full overflow-hidden mb-2 grayscale">
              <img src={DAVID} alt="David" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-semibold">David</span>
            <span className="text-xs font-bold tracking-widest opacity-60">8 WINS</span>
          </div>
        </section>

        {/* Board */}
        <section className="aspect-square w-full max-w-[400px] bg-inverse-surface p-4 rounded-2xl shadow-xl">
          <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full h-full">
            {board.map((c, i) => (
              <button
                key={i}
                onClick={() => handleCell(i)}
                className="bg-secondary/20 rounded-xl flex items-center justify-center transition-transform active:scale-95 shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)]"
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
            ))}
          </div>
        </section>

        {/* Reactions */}
        <div className="flex flex-wrap justify-center gap-2 bg-surface-container/80 backdrop-blur-md p-2 rounded-full shadow-md mx-auto border border-outline-variant/30">
          {REACTIONS.map((r) => (
            <button
              key={r}
              className="hover:scale-125 transition-transform duration-200 text-2xl p-1"
            >
              {r}
            </button>
          ))}
        </div>

        {/* Chat */}
        <div className="w-full bg-inverse-surface rounded-2xl p-6 shadow-lg flex flex-col gap-3">
          <div className="flex-1 overflow-y-auto space-y-3 max-h-48 pr-1">
            {chat.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-end gap-1",
                  m.from === "me" ? "flex-row-reverse" : ""
                )}
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
