import { usePlay, displayName } from "@/games/play-context";
import { resolveOption } from "@/games/couples/logic";
import { HOME, SAFE, absOf, movable, type LudoState } from "./logic";
import { cn } from "@/lib/utils";

// 52 shared squares, clockwise, starting at the left arm.
const PATH: [number, number][] = [
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  [7, 0],
  [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7],
  [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14],
  [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  [0, 7],
  [0, 6],
];
const BASE_SLOTS: [number, number][] = [[1.5, 1.5], [3.5, 1.5], [1.5, 3.5], [3.5, 3.5]];
const C = 20; // cell size in svg units
const ME = "var(--color-pop)";
const THEM = "var(--color-xo)";

function cellOf(start: number, p: number, i: number): [number, number] {
  const far = start !== 0;
  if (p < 0) {
    const [x, y] = BASE_SLOTS[i];
    return far ? [x + 9, y + 9] : [x, y];
  }
  if (p === HOME) {
    const d = (i - 1.5) * 0.35;
    return far ? [7.5 + 0.6, 7.5 + d] : [7.5 - 0.6, 7.5 + d];
  }
  if (p > 50) {
    const k = p - 50;
    return far ? [14 - k + 0.5, 7.5] : [k + 0.5, 7.5];
  }
  const [x, y] = PATH[absOf(start, p)];
  return [x + 0.5, y + 0.5];
}

function Dice({ n, rolling }: { n: number | null; rolling: number }) {
  const pips: Record<number, [number, number][]> = {
    1: [[2, 2]], 2: [[1, 1], [3, 3]], 3: [[1, 1], [2, 2], [3, 3]],
    4: [[1, 1], [3, 1], [1, 3], [3, 3]], 5: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]],
    6: [[1, 1], [3, 1], [1, 2], [3, 2], [1, 3], [3, 3]],
  };
  return (
    <svg key={rolling} viewBox="0 0 4 4" className="h-16 w-16 animate-in spin-in-90 zoom-in-50 duration-500 drop-shadow-[0_8px_18px_rgba(0,0,0,.45)]">
      <rect x=".1" y=".1" width="3.8" height="3.8" rx=".8" className="fill-ink" />
      {n ? pips[n].map(([x, y], k) => <circle key={k} cx={x} cy={y} r=".34" className="fill-night" />)
        : <text x="2" y="2.45" textAnchor="middle" fontSize="1.2" className="fill-night font-black">?</text>}
    </svg>
  );
}

export function LudoGame() {
  const { state, me, partner, play, restart, leaveGame, busy } = usePlay();
  const s = state as LudoState;
  if (!s?.pieces) return null;
  const partnerName = displayName(partner);
  const myTurn = s.turn === me.id && !s.gate;
  const canPick = myTurn && s.dice !== null ? movable(s, me.id) : [];
  const colour = (uid: string) => (uid === me.id ? ME : THEM);
  const homeCount = (uid: string) => (s.pieces[uid] ?? []).filter((p) => p === HOME).length;

  const quad = (far: boolean) => (far ? [9, 9] : [0, 0]);

  if (s.winner) {
    const won = s.winner === me.id;
    return (
      <div className="mx-auto max-w-xl px-4">
        <div className="card-noir p-7 text-center">
          <p className="text-xs uppercase tracking-widest text-ink/40">ludo for two</p>
          <p className="mt-2 font-display text-5xl" style={{ color: won ? ME : THEM }}>{won ? "You won" : `${partnerName} won`}</p>
          <p className="mt-2 text-sm text-ink/60">{won ? "All four home. Time to tease a little." : "Ask for a rematch. Revenge is sweet."}</p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => restart()} className="btn-pop h-12 flex-1">Rematch</button>
            <button onClick={() => leaveGame()} className="h-12 rounded-2xl bg-night-2 px-5 font-semibold text-ink/70 press">Done</button>
          </div>
        </div>
      </div>
    );
  }

  const g = s.gate;
  const myGateAnswer = g?.answers[me.id];

  return (
    <div className="mx-auto max-w-xl px-3">
      <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-widest">
        <span style={{ color: ME }}>You {homeCount(me.id)}/4</span>
        <span className={cn("text-ink/45", myTurn && "text-pop")}>
          {s.gate ? "Quiz Gate" : myTurn ? (s.dice === null ? "Your roll" : "Pick a piece") : `${partnerName}'s turn`}
        </span>
        <span style={{ color: THEM }}>{partnerName} {homeCount(partner.id)}/4</span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${15 * C} ${15 * C}`} className="w-full rounded-[28px] bg-night-2 ring-1 ring-white/10">
          {/* bases */}
          {[false, true].map((far) => {
            const [qx, qy] = quad(far);
            const owner = Object.keys(s.starts).find((k) => (s.starts[k] !== 0) === far)!;
            return (
              <g key={String(far)}>
                <rect x={qx * C + 4} y={qy * C + 4} width={6 * C - 8} height={6 * C - 8} rx={22} fill={colour(owner)} opacity={0.16} />
                <rect x={(qx + 0.8) * C} y={(qy + 0.8) * C} width={4.4 * C} height={4.4 * C} rx={18} fill="none" stroke={colour(owner)} strokeOpacity={0.4} />
              </g>
            );
          })}
          {/* idle corners */}
          {[[9, 0], [0, 9]].map(([x, y]) => (
            <rect key={`${x}${y}`} x={x * C + 4} y={y * C + 4} width={6 * C - 8} height={6 * C - 8} rx={22} className="fill-white/[0.03]" />
          ))}
          {/* track */}
          {PATH.map(([x, y], k) => {
            const owner = Object.keys(s.starts).find((u) => s.starts[u] === k);
            return (
              <rect key={k} x={x * C + 1.5} y={y * C + 1.5} width={C - 3} height={C - 3} rx={5}
                fill={owner ? colour(owner) : "white"} fillOpacity={owner ? 0.5 : SAFE.includes(k) ? 0.14 : 0.06} />
            );
          })}
          {SAFE.filter((k) => !Object.values(s.starts).includes(k)).map((k) => {
            const [x, y] = PATH[k];
            return <circle key={`s${k}`} cx={(x + 0.5) * C} cy={(y + 0.5) * C} r={3} className="fill-white/30" />;
          })}
          {/* home columns */}
          {Object.keys(s.starts).map((u) =>
            [51, 52, 53, 54, 55].map((p) => {
              const [x, y] = cellOf(s.starts[u], p, 0);
              return <rect key={`${u}${p}`} x={(x - 0.5) * C + 1.5} y={(y - 0.5) * C + 1.5} width={C - 3} height={C - 3} rx={5} fill={colour(u)} fillOpacity={0.32} />;
            }),
          )}
          {/* centre */}
          <polygon points={`${6 * C},${6 * C} ${7.5 * C},${7.5 * C} ${6 * C},${9 * C}`} fill={colour(Object.keys(s.starts).find((u) => s.starts[u] === 0)!)} opacity={0.55} />
          <polygon points={`${9 * C},${6 * C} ${7.5 * C},${7.5 * C} ${9 * C},${9 * C}`} fill={colour(Object.keys(s.starts).find((u) => s.starts[u] !== 0)!)} opacity={0.55} />
          <polygon points={`${6 * C},${6 * C} ${7.5 * C},${7.5 * C} ${9 * C},${6 * C}`} className="fill-white/5" />
          <polygon points={`${6 * C},${9 * C} ${7.5 * C},${7.5 * C} ${9 * C},${9 * C}`} className="fill-white/5" />

          {/* pieces */}
          {Object.keys(s.pieces).map((u) =>
            s.pieces[u].map((p, i) => {
              const [x, y] = cellOf(s.starts[u], p, i);
              const pickable = u === me.id && canPick.includes(i);
              const stackShift = p >= 0 && p < HOME
                ? s.pieces[u].slice(0, i).filter((q) => q === p).length * 3 : 0;
              const lastMoved = s.last?.by === u && s.last.piece === i;
              return (
                <g key={`${u}${i}`}
                  style={{ transform: `translate(${x * C + stackShift}px, ${y * C - stackShift}px)`, transition: "transform 420ms cubic-bezier(.3,1.6,.5,1)" }}
                  onClick={() => pickable && !busy && play({ type: "move", piece: i })}
                  className={cn(pickable && "cursor-pointer")}
                  role={pickable ? "button" : undefined}
                  aria-label={pickable ? `Move piece ${i + 1}` : undefined}
                >
                  {pickable && <circle r={10} fill="none" stroke={colour(u)} strokeWidth={2} className="animate-pulse" />}
                  <circle r={7.2} cy={1.6} className="fill-night/60" />
                  <circle r={7} fill={colour(u)} className={cn(lastMoved && "animate-in zoom-in-50 duration-300")} />
                  <circle r={3} className="fill-night/35" />
                  <circle r={2} cx={-2.4} cy={-2.6} className="fill-white/50" />
                </g>
              );
            }),
          )}
        </svg>

        {/* Quiz Gate */}
        {g && (
          <div className="absolute inset-0 grid place-items-center rounded-[28px] bg-night/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm animate-in zoom-in-95 fade-in rounded-[24px] border border-white/10 bg-night-2 p-5 text-center duration-300">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-knowus">Quiz Gate</p>
              <p className="mt-1 text-xs text-ink/50">
                {g.player === me.id ? "Three rolls without a six. Match and you roll again." : `${partnerName} is at the gate. Answer honestly.`}
              </p>
              <p className="mt-3 font-display text-xl leading-snug">{resolveOption(g.q.prompt, g.q.subject, me.id, "you", partnerName)}</p>
              <p className="mt-1 text-xs text-ink/45">{g.q.subject === me.id ? "your honest answer" : `what would ${partnerName} say?`}</p>
              <div className="mt-4 grid gap-2">
                {g.q.options.map((o, k) => (
                  <button key={k} disabled={myGateAnswer !== undefined || busy}
                    onClick={() => play({ type: "answer", option: k })}
                    className={cn("h-11 rounded-2xl bg-white/6 px-3 text-sm font-semibold press disabled:opacity-60", myGateAnswer === k && "bg-knowus/25 ring-1 ring-knowus")}>
                    {resolveOption(o, g.q.subject, me.id, "Me", partnerName)}
                  </button>
                ))}
              </div>
              {myGateAnswer !== undefined && <p className="mt-3 text-xs text-ink/45">Waiting for {partnerName}…</p>}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4 rounded-[24px] border border-white/10 bg-night-2 p-3">
        <Dice n={s.dice} rolling={s.rollId} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight">
            {s.note ?? (s.lastGate ? (s.lastGate.matched ? "Gate matched" : "Gate missed") : myTurn ? (s.dice === null ? "Tap to roll" : "Tap a glowing piece") : `Waiting for ${partnerName}`)}
          </p>
          <p className="text-xs text-ink/45">Roll a 6 to leave base. Land on {partnerName} to cut.</p>
        </div>
        <button
          disabled={!myTurn || s.dice !== null || busy}
          onClick={() => play({ type: "roll" })}
          className="btn-pop h-12 px-6 disabled:opacity-30"
        >
          Roll
        </button>
      </div>

      <button onClick={() => leaveGame()} className="mx-auto mt-5 block text-[11px] font-bold uppercase tracking-[0.2em] text-ink/30 press">
        Leave game
      </button>
    </div>
  );
}
