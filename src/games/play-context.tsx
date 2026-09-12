import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { GameFeedback } from "./GameFeedback";
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
  const [presented,setPresented]=useState(value.state);
  useEffect(()=>{const s=value.state as {kind?:string;seq?:number;last?:{duration?:number}};
    if(s?.kind!=='cup-pong'||!s.seq){setPresented(value.state);return;}
    const timer=setTimeout(()=>setPresented(value.state),((s.last?.duration??0)+.9)*1000);
    return ()=>clearTimeout(timer);
  },[value.state]);
  const display=value.gameKey==='cup-pong'?presented:value.state;
  const state = display as { winner?: string; loser?: string; draw?: boolean; done?: boolean } | null;
  const finished = Boolean(state?.winner || state?.loser || state?.draw || state?.done);
  return <PlayCtx.Provider value={value}><GameFeedback value={{...value,state:display}} />{!finished && children}</PlayCtx.Provider>;
}

export const displayName = (p: Profile) => p.display_name ?? p.username;
