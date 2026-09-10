import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyAction, gmInit, xoInit, sudokuInit, makeSudoku, rushInit, makeRushRounds, hockeyInit,
  type GameAction, type GameKey, type GmQuestion, type GmState, type RushState, type SudokuState, type XoState,
} from "@/games/logic";
import { PlayProvider, type PlayValue, type Profile } from "@/games/play-context";
import { GAMES, gameByKey } from "@/games/registry";
import { SOLO_QUESTIONS } from "@/games/guess-me/bank";
import { xoBotMove } from "@/games/xo/bot";
import { gmBotAction } from "@/games/guess-me/bot";
import { sudokuBotAction, sudokuBotTempo } from "@/games/sudoku/bot";
import { rushBotReaction } from "@/games/bottle-rush/bot";
import { botDelay, type Difficulty } from "@/games/difficulty";

export const ME: Profile = { id: "me", username: "you", display_name: "You", avatar_url: null };
export const BOT: Profile = { id: "bot", username: "computer", display_name: "Computer", avatar_url: null };
const PLAYERS = [ME.id, BOT.id];

function initialState(gameKey: GameKey, difficulty: Difficulty): unknown {
  if (gameKey === "xo") return xoInit(PLAYERS);
  if (gameKey === "guess-me") {
    const pool = [...SOLO_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10);
    const questions: GmQuestion[] = pool.map((q, i) => ({ ...q, subject: i % 2 === 0 ? ME.id : BOT.id }));
    return gmInit(questions);
  }
  if (gameKey === "sudoku") {
    const holes = difficulty === "hard" ? 54 : difficulty === "medium" ? 46 : 36;
    const { given, solution } = makeSudoku(holes);
    return sudokuInit(given, solution);
  }
  if (gameKey === "bottle-rush") return rushInit(makeRushRounds(7), PLAYERS);
  return hockeyInit(PLAYERS, 7);
}

export function SoloPlay({
  gameKey, difficulty, onExit,
}: { gameKey: GameKey; difficulty: Difficulty; onExit: () => void }) {
  const [state, setState] = useState<unknown>(() => initialState(gameKey, difficulty));
  const stateRef = useRef(state);
  stateRef.current = state;

  const entry = gameByKey(gameKey) ?? GAMES[0];
  const Stage = entry.component;

  const dispatch = useCallback((action: GameAction, userId: string) => {
    setState((prev: unknown) => {
      try {
        return applyAction(gameKey, prev, action, { userId, players: PLAYERS });
      } catch {
        return prev;
      }
    });
  }, [gameKey]);

  const play = useCallback((action: GameAction) => dispatch(action, ME.id), [dispatch]);
  const restart = useCallback(() => setState(initialState(gameKey, difficulty)), [gameKey, difficulty]);

  // ---- the computer ----
  useEffect(() => {
    let timer: number | undefined;
    const act = (action: GameAction, delay: number) => {
      timer = window.setTimeout(() => dispatch(action, BOT.id), delay);
    };

    if (gameKey === "xo") {
      const s = stateRef.current as XoState;
      const move = xoBotMove(s, BOT.id, difficulty);
      if (move) act(move, botDelay(difficulty, 450));
    }

    if (gameKey === "guess-me") {
      const s = stateRef.current as GmState;
      const action = gmBotAction(s, BOT.id, difficulty);
      if (action && action.type === "answer") act(action, botDelay(difficulty, 1100));
    }

    if (gameKey === "sudoku") {
      const s = stateRef.current as SudokuState;
      if (!s.done) {
        const action = sudokuBotAction(s, BOT.id);
        if (action) act(action, sudokuBotTempo[difficulty]);
      }
    }

    if (gameKey === "bottle-rush") {
      const s = stateRef.current as RushState;
      if (s.phase === "live" && !s.locked.includes(BOT.id) && !s.winner) {
        const { ms, slipChance } = rushBotReaction(difficulty);
        const round = s.rounds[s.idx];
        const idx = Math.random() < slipChance
          ? (round.target + 1 + Math.floor(Math.random() * 3)) % 4
          : round.target;
        act({ type: "tap", idx }, ms);
      }
    }

    return () => { if (timer) clearTimeout(timer); };
  }, [state, gameKey, difficulty, dispatch]);

  const value = useMemo<PlayValue>(() => ({
    me: ME,
    partner: BOT,
    gameKey,
    state,
    players: PLAYERS,
    isHost: true,
    live: false,
    partnerOnline: true,
    busy: false,
    play,
    restart,
    leaveGame: onExit,
    sendStream: () => {},
    onStream: () => () => {},
  }), [gameKey, state, play, restart, onExit]);

  return (
    <PlayProvider value={value}>
      <Suspense fallback={<div className="px-4 text-sm text-ink/40">loading game…</div>}>
        <Stage difficulty={difficulty} />
      </Suspense>
    </PlayProvider>
  );
}
