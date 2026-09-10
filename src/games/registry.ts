import { lazy, type ComponentType } from "react";
import type { GameKey } from "@/games/logic";

export type GameModuleProps = { sessionId?: string; difficulty?: "easy" | "medium" | "hard" };

export type GameEntry = {
  key: GameKey;
  name: string;
  tagline: string;
  emoji: string;
  /** short line shown on the solo card */
  soloBlurb: string;
  component: ComponentType<GameModuleProps>;
};

export const GAMES: GameEntry[] = [
  {
    key: "xo",
    name: "XO Arena",
    tagline: "Three in a row. Nothing to explain.",
    emoji: "⭕",
    soloBlurb: "Beat the machine at its own grid",
    component: lazy(() => import("./xo/XoGame").then((m) => ({ default: m.XoGame }))),
  },
  {
    key: "guess-me",
    name: "Guess Me",
    tagline: "How well do you know each other?",
    emoji: "🫥",
    soloBlurb: "Learn the computer's taste",
    component: lazy(() => import("./guess-me/GuessMeGame").then((m) => ({ default: m.GuessMeGame }))),
  },
  {
    key: "sudoku",
    name: "Sudoku Duo",
    tagline: "One grid, two heads.",
    emoji: "🔢",
    soloBlurb: "Solve alongside a patient partner",
    component: lazy(() => import("./sudoku/SudokuGame").then((m) => ({ default: m.SudokuGame }))),
  },
  {
    key: "bottle-rush",
    name: "Bottle Rush",
    tagline: "Fastest hand wins the round.",
    emoji: "🍾",
    soloBlurb: "Out-react the computer",
    component: lazy(() => import("./bottle-rush/BottleRushGame").then((m) => ({ default: m.BottleRushGame }))),
  },
  {
    key: "air-hockey",
    name: "Air Hockey",
    tagline: "Slide, slam, first to seven.",
    emoji: "🏒",
    soloBlurb: "Face a paddle that never blinks",
    component: lazy(() => import("./air-hockey/AirHockeyGame").then((m) => ({ default: m.AirHockeyGame }))),
  },
];

export const gameByKey = (key: string) => GAMES.find((g) => g.key === key);
