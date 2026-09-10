import type { Difficulty } from "@/games/difficulty";

/** Reaction time in ms, plus the chance the computer stabs the wrong target. */
export function rushBotReaction(difficulty: Difficulty) {
  if (difficulty === "hard") return { ms: 300 + Math.random() * 160, slipChance: 0.05 };
  if (difficulty === "medium") return { ms: 520 + Math.random() * 260, slipChance: 0.14 };
  return { ms: 850 + Math.random() * 450, slipChance: 0.28 };
}
