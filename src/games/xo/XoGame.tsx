import { useRoom } from "@/components/room/RoomProvider";
import type { XoState } from "@/games/logic";
import { cn } from "@/lib/utils";

export function XoGame() {
  const { session, me, partner, play, restart, leaveGame } = useRoom();
  if (!session) return null;
  const s = session.state as XoState;
  const myMark = s.marks[me.id];
  const myTurn = s.turn === myMark && !s.winner && !s.draw;
  const over = Boolean(s.winner) || s.draw;

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-me tabular-nums">
          You {s.scores[me.id] ?? 0}
        </span>
        <span className="text-xs uppercase tracking-widest text-ink/40">
          {over ? "round over" : myTurn ? "your turn" : "their turn"}
        </span>
        <span className="text-sm font-semibold text-them tabular-nums">
          {s.scores[partner.id] ?? 0} {partner.display_name ?? partner.username}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {s.board.map((cell, i) => {
          const mine = cell && s.marks[me.id] === cell;
          const inLine = s.line?.includes(i);
          return (
            <button
              key={i}
              disabled={!myTurn || Boolean(cell)}
              onClick={() => play({ type: "play", cell: i })}
              className={cn(
                "aspect-square rounded-3xl grid place-items-center text-5xl font-black transition-transform duration-150",
                "bg-night-3/70 active:scale-95 disabled:active:scale-100",
                inLine && "ring-2 ring-offset-0",
                inLine && (mine ? "ring-me bg-me/15" : "ring-them bg-them/15"),
                cell ? (mine ? "text-me" : "text-them") : "text-ink/10",
                myTurn && !cell && "hover:bg-night-3",
              )}
            >
              {cell ?? "·"}
            </button>
          );
        })}
      </div>

      {over && (
        <div className="mt-5 rounded-3xl bg-night-3/70 p-5 text-center">
          <p className="text-lg font-bold text-ink">
            {s.draw ? "Dead even." : s.winner === me.id ? "You got it 💙" : `${partner.display_name ?? partner.username} got it 🧡`}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => restart()}
              className="flex-1 h-12 rounded-2xl bg-me text-night font-bold active:scale-95"
            >
              Rematch
            </button>
            <button
              onClick={() => leaveGame()}
              className="h-12 px-5 rounded-2xl bg-night-2 text-ink/70 font-semibold active:scale-95"
            >
              Shelf
            </button>
          </div>
        </div>
      )}

      {!over && (
        <button
          onClick={() => leaveGame()}
          className="mt-4 w-full h-11 rounded-2xl bg-night-2 text-ink/50 text-sm font-semibold active:scale-95"
        >
          Back to the shelf
        </button>
      )}
    </div>
  );
}
