import charCup from '@/assets/char-cup-pong.png';
import charTennis from '@/assets/char-table-tennis.png';
import { lazy, type ComponentType } from "react";
import type { GameKey } from "@/games/logic";
import type { GlyphName } from "@/components/Glyph";
import charXo from "@/assets/char-xo.png";
import charGlass from "@/assets/char-glass.png";
import charKnowUs from "@/assets/char-knowus.png";
import charHockey from "@/assets/char-hockey.png";
import charTot from "@/assets/char-this-or-that.png";
import charLikely from "@/assets/char-likely.png";
import charTd from "@/assets/char-truth-dare.png";
import charFinish from "@/assets/char-finish.png";

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
  /** hidden games stay playable for sessions already running but are not listed */
  hidden?: boolean;
};

export const ALL_GAMES: GameEntry[] = [
  { key: 'cup-pong', name: 'Cup Pong', tagline: 'The perfect arc. The final cup.', icon: 'glass', character: charCup, accent: 'var(--color-pop)', wash: 'var(--sports-cup-wash)', soloBlurb: 'Six cups or ten. Make every throw count.', hidden: true, component: lazy(() => import('./cup-pong/CupPongGame')) },
  { key: 'table-tennis', name: 'Table Tennis', tagline: 'Find your rhythm. Win the rally.', icon: 'air-hockey', character: charTennis, accent: 'var(--color-xo)', wash: 'var(--sports-tennis-wash)', soloBlurb: 'Serve, return, and win by two.', component: lazy(() => import('./table-tennis/TableTennisGame')) },
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
    hidden: true,
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
  {
    key: "this-or-that", name: "This or That", tagline: "Two choices. Are you in sync?", icon: "spark",
    character: charTot, accent: "#ff7a6b", wash: "linear-gradient(160deg, #4a1f2a, #1e1220)",
    soloBlurb: "Quick picks, instant reveals",
    component: lazy(() => import("./guess-me/GuessMeGame").then((m) => ({ default: m.GuessMeGame }))),
  },
  {
    key: "likely", name: "Who's More Likely", tagline: "Point at each other. Agree, or argue.", icon: "people",
    character: charLikely, accent: "#ffa528", wash: "linear-gradient(160deg, #4a2c0f, #22160a)",
    soloBlurb: "Who cries at films? Be honest",
    component: lazy(() => import("./guess-me/GuessMeGame").then((m) => ({ default: m.GuessMeGame }))),
  },
  {
    key: "truth-dare", name: "Truth or Dare", tagline: "Sweet truths, playful dares.", icon: "flame",
    character: charTd, accent: "#ff3d6e", wash: "linear-gradient(160deg, #4d0f22, #240813)",
    soloBlurb: "Spin for a truth or a dare",
    component: lazy(() => import("./couples/TruthDareGame").then((m) => ({ default: m.TruthDareGame }))),
  },
  {
    key: "finish", name: "Finish the Sentence", tagline: "Little notes you'll want to keep.", icon: "heart",
    character: charFinish, accent: "#c49bff", wash: "linear-gradient(160deg, #2e1d4d, #160f26)",
    soloBlurb: "Write it, react, keep it",
    component: lazy(() => import("./couples/FinishGame").then((m) => ({ default: m.FinishGame }))),
  },
];

export const GAMES: GameEntry[] = ALL_GAMES.filter((g) => !g.hidden);

export const gameByKey = (key: string) => ALL_GAMES.find((g) => g.key === key);
