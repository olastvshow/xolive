import type { GlassState } from "@/games/logic";
import { GLASS_MAX, GLASS_MAX_POUR } from "@/games/logic";
import type { Difficulty } from "@/games/difficulty";

/**
 * The computer decides whether to pour again or pass.
 * Passing is only legal after at least one pour, so the choice is:
 * how close to the rim do I dare go before handing it over?
 */
export function glassBotAction(state: GlassState, botId: string, difficulty: Difficulty) {
  if (state.turn !== botId || state.loser) return null;

  // Must pour at least once before passing.
  if (state.poured === 0) return { type: "pour" as const };

  const headroom = GLASS_MAX - state.level;
  const risky = headroom <= GLASS_MAX_POUR;

  if (difficulty === "hard") {
    // Pours again only when it is mathematically safe, and leaves the
    // opponent as little headroom as it can.
    if (headroom > GLASS_MAX_POUR * 2) return { type: "pour" as const };
    return { type: "pass" as const };
  }

  if (difficulty === "medium") {
    if (risky) return { type: "pass" as const };
    return Math.random() < 0.45 ? { type: "pour" as const } : { type: "pass" as const };
  }

  // Easy: gambles too often.
  return Math.random() < 0.4 ? { type: "pour" as const } : { type: "pass" as const };
}

export function glassBotDelay(difficulty: Difficulty) {
  if (difficulty === "hard") return 650 + Math.random() * 300;
  if (difficulty === "medium") return 800 + Math.random() * 500;
  return 950 + Math.random() * 700;
}
