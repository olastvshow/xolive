import type { GameAction, GmState } from "@/games/logic";
import type { Difficulty } from "@/games/difficulty";

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * The computer plays a consistent character: the same prompt always gets the
 * same honest answer, so a human really can learn it over a round.
 */
export function gmBotAction(state: GmState, botId: string, difficulty: Difficulty): GameAction | null {
  if (state.done) return null;
  const q = state.questions[state.idx];
  if (!q) return null;
  if (state.revealed) return { type: "next" };
  if (state.answers[String(state.idx)]?.[botId] !== undefined) return null;

  if (q.subject === botId) {
    return { type: "answer", option: hash(q.prompt) % q.options.length };
  }
  // guessing the human — gets sharper with difficulty
  const sharp = difficulty === "hard" ? 0.7 : difficulty === "medium" ? 0.45 : 0.25;
  if (Math.random() < sharp) {
    return { type: "answer", option: hash(q.prompt + "guess") % q.options.length };
  }
  return { type: "answer", option: Math.floor(Math.random() * q.options.length) };
}
