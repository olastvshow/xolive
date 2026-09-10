import type { GameAction, SudokuState } from "@/games/logic";
import type { Difficulty } from "@/games/difficulty";

/** How often the computer partner drops a number in. */
export const sudokuBotTempo: Record<Difficulty, number> = {
  easy: 9000,
  medium: 5000,
  hard: 2600,
};

export function sudokuBotAction(state: SudokuState, _botId: string): GameAction | null {
  if (state.done) return null;
  const empty: number[] = [];
  for (let i = 0; i < 81; i++) if (state.cells[i] === null) empty.push(i);
  if (!empty.length) return null;
  const cell = empty[Math.floor(Math.random() * empty.length)];
  return { type: "fill", cell, value: state.solution[cell] };
}
