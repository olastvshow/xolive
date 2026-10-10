import { sportsInit, sportsBot, type SportsState } from './sports/logic';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyAction, xoInit, glassInit, hockeyInit,
  type GameAction, type GameKey, type GlassState, type GmState, type XoState,
} from "@/games/logic";
import { PlayProvider, type PlayValue, type Profile } from "@/games/play-context";
import { GAMES, gameByKey } from "@/games/registry";
import { buildCouplesState, isCouplesKey, type TdState, type FsState } from "@/games/couples/logic";
import { BOT_LINES } from "@/games/couples/banks";
import { xoBotMove } from "@/games/xo/bot";
import { gmBotAction } from "@/games/guess-me/bot";
import { glassBotAction, glassBotDelay } from "@/games/fill-glass/bot";
import { botDelay, type Difficulty } from "@/games/difficulty";

export const ME: Profile = { id: "me", username: "you", display_name: "You", avatar_url: null };
export const BOT: Profile = { id: "bot", username: "computer", display_name: "Computer", avatar_url: null };
const PLAYERS = [ME.id, BOT.id];

function initialState(gameKey: GameKey, _difficulty: Difficulty): unknown {
  if (gameKey === "cup-pong" || gameKey === "table-tennis") return sportsInit(PLAYERS, gameKey);
  if (gameKey === "xo") return xoInit(PLAYERS);
  if (isCouplesKey(gameKey)) {
    // Remember what this device has already seen so questions don't repeat.
    const key = `duet-seen-${gameKey}`;
    let seen: string[] = [];
    try { seen = typeof window === "undefined" ? [] : JSON.parse(localStorage.getItem(key) ?? "[]"); } catch {}
    const { state, used, reset } = buildCouplesState(gameKey, PLAYERS, ME.id, new Set(seen));
    try { if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(reset ? used : [...seen, ...used])); } catch {}
    return state;
  }
  if (gameKey === "fill-glass") return glassInit(PLAYERS);
  return hockeyInit(PLAYERS, 7);
}

export function SoloPlay({
  gameKey, difficulty, onExit,
}: { gameKey: GameKey; difficulty: Difficulty; onExit: () => void }) {
  // Built after hydration: the deck is random, so the server must not render it.
  const [state, setState] = useState<unknown>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Keep the game safe across refreshes and app switches.
  const saveKey = `duet-solo-${gameKey}`;
  const restored = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(saveKey);
      setState(raw ? JSON.parse(raw) : initialState(gameKey, difficulty));
    } catch { setState(initialState(gameKey, difficulty)); }
    restored.current = true;
  }, [saveKey, gameKey, difficulty]);
  useEffect(() => {
    if (!restored.current || state === null) return;
    try { localStorage.setItem(saveKey, JSON.stringify(state)); } catch {}
  }, [saveKey, state]);

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
  const exit = useCallback(() => {
    try { localStorage.removeItem(`duet-solo-${gameKey}`); } catch {}
    onExit();
  }, [gameKey, onExit]);

  // ---- the computer ----
  useEffect(() => {
    let timer: number | undefined;
    if (stateRef.current === null) return;
    const act = (action: GameAction, delay: number) => {
      timer = window.setTimeout(() => dispatch(action, BOT.id), delay);
    };

    if (gameKey === "xo") {
      const s = stateRef.current as XoState;
      const move = xoBotMove(s, BOT.id, difficulty);
      if (move) act(move, botDelay(difficulty, 450));
    }

    if (gameKey === "truth-dare") {
      const s = stateRef.current as TdState;
      if (!s.done && s.turn === BOT.id) {
        if (!s.current) act({ type: "spin", kind: Math.random() < 0.5 ? "truth" : "dare" }, 1200);
        else act({ type: "complete" }, 3500);
      }
    }

    if (gameKey === "finish") {
      const s = stateRef.current as FsState;
      if (!s.done) {
        const writing = s.entries.length === s.idx;
        if (writing && s.writer === BOT.id) act({ type: "write", text: BOT_LINES[s.idx % BOT_LINES.length] }, 2200);
        if (!writing && s.writer === ME.id) act({ type: "react", reaction: "heart" }, 1500);
      }
    }

    if (gameKey === "guess-me" || gameKey === "this-or-that" || gameKey === "likely") {
      const s = stateRef.current as GmState;
      const action = gmBotAction(s, BOT.id, difficulty);
      if (action && action.type === "answer") act(action, botDelay(difficulty, 1100));
    }

    if (gameKey === "fill-glass") {
      const s = stateRef.current as GlassState;
      const action = glassBotAction(s, BOT.id, difficulty);
      if (action) act(action, glassBotDelay(difficulty));
    }

    if (gameKey === 'cup-pong' || gameKey === 'table-tennis') {
      const s = stateRef.current as SportsState;
      timer = window.setTimeout(() => {
        const move = sportsBot(s, BOT.id);
        if (move) dispatch(move, BOT.id);
      }, s.phase === 'setup' ? 450 : gameKey === 'cup-pong' ? (s.last?.duration ?? 1.8) * 1000 + 1000 : 1800);
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
    leaveGame: exit,
    sendStream: () => {},
    onStream: () => () => {},
  }), [gameKey, state, play, restart, exit]);

  if (state === null) return <div className="px-4 text-sm text-ink/40">loading game…</div>;

  return (
    <PlayProvider value={value}>
      <Suspense fallback={<div className="px-4 text-sm text-ink/40">loading game…</div>}>
        <Stage difficulty={difficulty} />
      </Suspense>
    </PlayProvider>
  );
}
