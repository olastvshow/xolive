export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: { key: Difficulty; label: string; blurb: string }[] = [
  { key: "easy", label: "Easy", blurb: "Warm up" },
  { key: "medium", label: "Medium", blurb: "A fair fight" },
  { key: "hard", label: "Hard", blurb: "Good luck" },
];

/** Human-ish thinking pause before the computer acts. */
export function botDelay(difficulty: Difficulty, base = 600) {
  const spread = difficulty === "hard" ? 0.4 : 0.9;
  return base + Math.random() * base * spread;
}
