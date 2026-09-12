import charCup from '@/assets/char-cup-pong.png';
import charTennis from '@/assets/char-table-tennis.png';
import { lazy, type ComponentType } from "react";
import type { GameKey } from "@/games/logic";
import type { GlyphName } from "@/components/Glyph";
import charXo from "@/assets/char-xo.png";
import charGlass from "@/assets/char-glass.png";
import charKnowUs from "@/assets/char-knowus.png";
import charHockey from "@/assets/char-hockey.png";

export type GameModuleProps = { sessionId?: string; difficulty?: "easy" | "medium" | "hard" };

export type GameEntry = {
  key: GameKey;
  name: string;
  tagline: string;
  icon: GlyphName;
  /** cartoon mascot for this game */
  character: string;
  /** css color for this game's identity */
  accent: string;
  /** background wash behind the mascot */
  wash: string;
  /** short line shown on the solo card */
  soloBlurb: string;
  component: ComponentType<GameModuleProps>;
};

export const GAMES: GameEntry[] = [
  { key: 'cup-pong', name: 'Cup Pong', tagline: 'The perfect arc. The final cup.', icon: 'glass', character: charCup, accent: 'var(--pop)', wash: 'var(--sports-cup-wash)', soloBlurb: 'Six cups or ten. Make every throw count.', component: lazy(() => import('./cup-pong/CupPongGame')) },
  { key: 'table-tennis', name: 'Table Tennis', tagline: 'Find your rhythm. Win the rally.', icon: 'air-hockey', character: charTennis, accent: 'var(--xo)', wash: 'var(--sports-tennis-wash)', soloBlurb: 'Serve, return, and win by two.', component: lazy(() => import('./table-tennis/TableTennisGame')) },
  {
    key: "xo",
    name: "XO Arena",
    tagline: "Three in a row. Nothing to explain.",
    icon: "xo",
    character: charXo,
    accent: "#2fb8ff",
    wash: "linear-gradient(160deg, #123a55, #0d2233)",
    soloBlurb: "Beat the machine at its own grid",
    component: lazy(() => import("./xo/XoGame").then((m) => ({ default: m.XoGame }))),
  },
  {
    key: "fill-glass",
    name: "Fill the Glass",
    tagline: "Pour, pass, and don't be the one who spills.",
    icon: "glass",
    character: charGlass,
    accent: "#23d2c6",
    wash: "linear-gradient(160deg, #0f3f3d, #0c2426)",
    soloBlurb: "Hold your nerve against the computer",
    component: lazy(() => import("./fill-glass/FillGlassGame").then((m) => ({ default: m.FillGlassGame }))),
  },
  {
    key: "guess-me",
    name: "Know Us",
    tagline: "Twenty questions about the two of you.",
    icon: "guess-me",
    character: charKnowUs,
    accent: "#ff4d8d",
    wash: "linear-gradient(160deg, #4a1330, #2a0d1e)",
    soloBlurb: "A practice round with the computer",
    component: lazy(() => import("./guess-me/GuessMeGame").then((m) => ({ default: m.GuessMeGame }))),
  },
  {
    key: "air-hockey",
    name: "Air Hockey",
    tagline: "Slide, slam, first to seven.",
    icon: "air-hockey",
    character: charHockey,
    accent: "#b6f250",
    wash: "linear-gradient(160deg, #2b1a4d, #171030)",
    soloBlurb: "Face a paddle that never blinks",
    component: lazy(() => import("./air-hockey/AirHockeyGame").then((m) => ({ default: m.AirHockeyGame }))),
  },
];

export const gameByKey = (key: string) => GAMES.find((g) => g.key === key);
