import { lazy, type ComponentType } from "react";
import type { GameKey } from "@/games/logic";
import type { GlyphName } from "@/components/Glyph";

export type GameModuleProps = { sessionId?: string; difficulty?: "easy" | "medium" | "hard" };

export type GameEntry = {
  key: GameKey;
  name: string;
  tagline: string;
  icon: GlyphName;
  /** short line shown on the solo card */
  soloBlurb: string;
  component: ComponentType<GameModuleProps>;
};

export const GAMES: GameEntry[] = [
  {
    key: "xo",
    name: "XO Arena",
    tagline: "Three in a row. Nothing to explain.",
    icon: "xo",
    soloBlurb: "Beat the machine at its own grid",
    component: lazy(() => import("./xo/XoGame").then((m) => ({ default: m.XoGame }))),
  },
  {
    key: "fill-glass",
    name: "Fill the Glass",
    tagline: "Pour, pass, and don't be the one who spills.",
    icon: "glass",
    soloBlurb: "Hold your nerve against the computer",
    component: lazy(() => import("./fill-glass/FillGlassGame").then((m) => ({ default: m.FillGlassGame }))),
  },
  {
    key: "guess-me",
    name: "Know Us",
    tagline: "Twenty questions about the two of you.",
    icon: "guess-me",
    soloBlurb: "A practice round with the computer",
    component: lazy(() => import("./guess-me/GuessMeGame").then((m) => ({ default: m.GuessMeGame }))),
  },
  {
    key: "air-hockey",
    name: "Air Hockey",
    tagline: "Slide, slam, first to seven.",
    icon: "air-hockey",
    soloBlurb: "Face a paddle that never blinks",
    component: lazy(() => import("./air-hockey/AirHockeyGame").then((m) => ({ default: m.AirHockeyGame }))),
  },
];

export const gameByKey = (key: string) => GAMES.find((g) => g.key === key);
