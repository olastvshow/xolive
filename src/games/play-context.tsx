import { createContext, useContext, type ReactNode } from "react";
import type { GameAction } from "@/games/logic";

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  last_seen_at?: string | null;
};

export type PlayValue = {
  me: Profile;
  partner: Profile;
  gameKey: string;
  state: unknown;
  players: string[];
  isHost: boolean;
  /** true when the opponent is another human over the network */
  live: boolean;
  partnerOnline: boolean;
  busy: boolean;
  play: (action: GameAction) => void;
  restart: () => void | Promise<void>;
  leaveGame: () => void | Promise<void>;
  /** low-latency, non-durable channel (air hockey puck, cursors) */
  sendStream: (payload: unknown) => void;
  onStream: (cb: (payload: unknown) => void) => () => void;
};

const PlayCtx = createContext<PlayValue | null>(null);

export const usePlay = () => {
  const v = useContext(PlayCtx);
  if (!v) throw new Error("usePlay used outside PlayProvider");
  return v;
};

export function PlayProvider({ value, children }: { value: PlayValue; children: ReactNode }) {
  return <PlayCtx.Provider value={value}>{children}</PlayCtx.Provider>;
}

export const displayName = (p: Profile) => p.display_name ?? p.username;
