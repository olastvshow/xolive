import type { Difficulty } from "@/games/difficulty";

export type HockeyBotSkill = { speed: number; error: number; reach: number };

export const hockeyBotSkill: Record<Difficulty, HockeyBotSkill> = {
  easy: { speed: 0.06, error: 0.09, reach: 0.42 },
  medium: { speed: 0.11, error: 0.05, reach: 0.5 },
  hard: { speed: 0.18, error: 0.02, reach: 0.58 },
};
