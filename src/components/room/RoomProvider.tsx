import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useVoice, type SignalBus, type VoicePayload } from "@/hooks/useVoice";
import { applyAction, type GameAction, type GameKey } from "@/games/logic";
import type { Profile } from "@/games/play-context";
import { getComments, getSession, proposeGame, respondProposal, sendComment, submitMove, endSession, restartSession } from "@/lib/pairplay.functions";

export type { Profile };

export type Session = {
  id: string;
  room_id: string;
  game_key: string;
  status: string;
  proposed_by: string | null;
  players: string[];
  state: unknown;
  move_count: number;
  winner_id: string | null;
};

export type Comment = { id: string; user_id: string; text: string; created_at: string };
export type Burst = { id: number; emoji: string; from: string };

type Ctx = {
  roomId: string;
  me: Profile;
  partner: Profile;
  partnerOnline: boolean;
  session: Session | null;
  bursts: Burst[];
  comments: Comment[];
  typingPartner: boolean;
  voice: ReturnType<typeof useVoice>;
  react: (emoji: string) => void;
  knock: () => void;
  knockReceived: number;
  say: (text: string) => void;
  setTyping: (on: boolean) => void;
  propose: (gameKey: GameKey) => Promise<void>;
  respond: (accept: boolean) => Promise<void>;
  play: (action: GameAction) => void;
  restart: () => Promise<void>;
  leaveGame: () => Promise<void>;
  isHost: boolean;
  sendStream: (payload: unknown) => void;
  onStream: (cb: (payload: unknown) => void) => () => void;
  busy: boolean;
};

const RoomCtx = createContext<Ctx | null>(null);
export const useRoom = () => {
  const v = useContext(RoomCtx);
  if (!v) throw new Error("useRoom outside RoomProvider");
  return v;
};

let burstId = 0;

export function RoomProvider({
  roomId, me, partner, isHost, children,
}: { roomId: string; me: Profile; partner: Profile; isHost: boolean; children: ReactNode }) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const streamListeners = useRef<Set<(payload: unknown) => void>>(new Set());
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [typingPartner, setTypingPartner] = useState(false);
  const [knockReceived, setKnockReceived] = useState(0);
  const [busy, setBusy] = useState(false);

  const bus = useRef<SignalBus>({
    handler: null,
    send: (payload: VoicePayload) => {
      channelRef.current?.send({ type: "broadcast", event: "voice", payload });
    },
  }).current;

  const voice = useVoice({ bus, myId: me.id, isOfferer: isHost, partnerOnline, enabled: true });

  const getSessionFn = useServerFn(getSession);
  const getCommentsFn = useServerFn(getComments);
  const sendCommentFn = useServerFn(sendComment);
  const proposeFn = useServerFn(proposeGame);
  const respondFn = useServerFn(respondProposal);
  const submitFn = useServerFn(submitMove);
  const endFn = useServerFn(endSession);
  const restartFn = useServerFn(restartSession);

  const refreshSession = useCallback(async () => {
    const s = await getSessionFn({ data: { roomId } });
    setSession((s as Session | null) ?? null);
  }, [getSessionFn, roomId]);

  useEffect(() => {
    refreshSession().catch(() => {});
    getCommentsFn({ data: { roomId } })
      .then((rows) => setComments(rows as Comment[]))
      .catch(() => {});
  }, [getCommentsFn, refreshSession, roomId]);

  // one channel for the whole room, mounted once
  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}`, {
      config: { broadcast: { self: false }, presence: { key: me.id } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const st = channel.presenceState();
        setPartnerOnline(Object.keys(st).some((k) => k !== me.id));
      })
      .on("broadcast", { event: "voice" }, ({ payload }) => bus.handler?.(payload as VoicePayload))
      .on("broadcast", { event: "reaction" }, ({ payload }) => {
        const p = payload as { emoji: string; from: string };
        const id = ++burstId;
        setBursts((b) => [...b, { id, emoji: p.emoji, from: p.from }]);
        setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1600);
        if (navigator.vibrate) navigator.vibrate(12);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        setTypingPartner(Boolean((payload as { on: boolean }).on));
      })
      .on("broadcast", { event: "knock" }, () => {
        setKnockReceived((n) => n + 1);
        if (navigator.vibrate) navigator.vibrate([30, 60, 30]);
      })
      .on("broadcast", { event: "stream" }, ({ payload }) => {
        streamListeners.current.forEach((cb) => cb(payload));
      })
      .on("postgres_changes",
        { event: "*", schema: "public", table: "game_sessions", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as Session | undefined;
          if (!row) return;
          setSession((prev) => {
            if (row.status === "ended" || row.status === "declined") {
              return prev && prev.id === row.id ? row : prev;
            }
            if (prev && prev.id === row.id && row.move_count < prev.move_count) return prev;
            return row;
          });
        })
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as Comment;
          setComments((c) => (c.some((x) => x.id === row.id) ? c : [...c, row].slice(-20)));
        })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") channel.track({ userId: me.id, at: Date.now() });
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [bus, me.id, roomId]);

  const react = useCallback((emoji: string) => {
    const id = ++burstId;
    setBursts((b) => [...b, { id, emoji, from: me.id }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1600);
    if (navigator.vibrate) navigator.vibrate(10);
    channelRef.current?.send({ type: "broadcast", event: "reaction", payload: { emoji, from: me.id } });
  }, [me.id]);

  const knock = useCallback(() => {
    channelRef.current?.send({ type: "broadcast", event: "knock", payload: { from: me.id } });
    if (navigator.vibrate) navigator.vibrate(20);
  }, [me.id]);

  const setTyping = useCallback((on: boolean) => {
    channelRef.current?.send({ type: "broadcast", event: "typing", payload: { on, from: me.id } });
  }, [me.id]);

  const say = useCallback((text: string) => {
    const optimistic: Comment = {
      id: `tmp-${Date.now()}`, user_id: me.id, text, created_at: new Date().toISOString(),
    };
    setComments((c) => [...c, optimistic].slice(-20));
    sendCommentFn({ data: { roomId, text } })
      .then((row) => setComments((c) => c.map((x) => (x.id === optimistic.id ? (row as Comment) : x))))
      .catch(() => setComments((c) => c.filter((x) => x.id !== optimistic.id)));
  }, [me.id, roomId, sendCommentFn]);

  const propose = useCallback(async (gameKey: GameKey) => {
    setBusy(true);
    try {
      const row = await proposeFn({ data: { roomId, gameKey } });
      setSession(row as Session);
    } finally { setBusy(false); }
  }, [proposeFn, roomId]);

  const respond = useCallback(async (accept: boolean) => {
    if (!session) return;
    setBusy(true);
    try {
      const row = await respondFn({ data: { sessionId: session.id, accept } });
      setSession(accept ? (row as Session) : null);
    } finally { setBusy(false); }
  }, [respondFn, session]);

  const play = useCallback((action: GameAction) => {
    setSession((prev) => {
      if (!prev) return prev;
      let optimistic = prev;
      try {
        const next = applyAction(prev.game_key, prev.state, action, { userId: me.id, players: prev.players });
        optimistic = { ...prev, state: next, move_count: prev.move_count + 1 };
      } catch {
        return prev;
      }
      submitFn({ data: { sessionId: prev.id, expectedMoveCount: prev.move_count, action } })
        .then((res) => {
          const r = res as { stale: boolean; session: Session };
          setSession((cur) => (cur && cur.id === r.session.id ? r.session : cur));
        })
        .catch(() => { refreshSession().catch(() => {}); });
      return optimistic;
    });
  }, [me.id, refreshSession, submitFn]);

  const restart = useCallback(async () => {
    if (!session) return;
    const row = await restartFn({ data: { sessionId: session.id } });
    setSession(row as Session);
  }, [restartFn, session]);

  const leaveGame = useCallback(async () => {
    if (!session) return;
    await endFn({ data: { sessionId: session.id } });
    setSession(null);
  }, [endFn, session]);

  const sendStream = useCallback((payload: unknown) => {
    channelRef.current?.send({ type: "broadcast", event: "stream", payload });
  }, []);

  const onStream = useCallback((cb: (payload: unknown) => void) => {
    streamListeners.current.add(cb);
    return () => { streamListeners.current.delete(cb); };
  }, []);

  const value = useMemo<Ctx>(() => ({
    roomId, me, partner, partnerOnline, session, bursts, comments, typingPartner, isHost,
    voice, react, knock, knockReceived, say, setTyping, propose, respond, play, restart, leaveGame,
    sendStream, onStream, busy,
  }), [roomId, me, partner, partnerOnline, session, bursts, comments, typingPartner, voice, isHost,
    react, knock, knockReceived, say, setTyping, propose, respond, play, restart, leaveGame,
    sendStream, onStream, busy]);

  return <RoomCtx.Provider value={value}>{children}</RoomCtx.Provider>;
}
