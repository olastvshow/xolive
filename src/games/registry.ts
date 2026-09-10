import { lazy, type ComponentType } from "react";

export type GameModuleProps = { sessionId: string };

export type GameEntry = {
  key: string;
  name: string;
  tagline: string;
  emoji: string;
  component: ComponentType<GameModuleProps>;
};

export const GAMES: GameEntry[] = [
  {
    key: "guess-me",
    name: "Guess Me",
    tagline: "How well do you know each other?",
    emoji: "🫥",
    component: lazy(() => import("./guess-me/GuessMeGame").then((m) => ({ default: m.GuessMeGame }))),
  },
  {
    key: "xo",
    name: "XO Arena",
    tagline: "Three in a row. Nothing to explain.",
    emoji: "⭕",
    component: lazy(() => import("./xo/XoGame").then((m) => ({ default: m.XoGame }))),
  },
];

export const gameByKey = (key: string) => GAMES.find((g) => g.key === key);
