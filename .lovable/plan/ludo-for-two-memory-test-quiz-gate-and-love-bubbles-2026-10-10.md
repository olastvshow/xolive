# Ludo for Two, Memory Test, Quiz Gate and Love Bubbles

## What you get
1. **Ludo for Two** — a 2D Ludo board. Each of you has 4 pieces in your own colour. Roll the dice, move out on a 6, cut your partner's piece to send it home, and get all 4 home first to win. You can play with your partner in your room or against the computer. Rolls happen on the server so nobody can cheat.
2. **Memory Test** — each round names a topic (favourite food, colour, song mood, dream trip and so on). One of you secretly picks your real answer, and the other has to guess it. Then you swap. The most correct guesses after 10 rounds wins. Against the computer, the computer makes the pick.
3. **Quiz Gate (in Ludo)** — roll three times without a 6 and the gate opens: answer a quick question about your partner, and a match gives you a bonus roll. It uses the Know Us questions and won't repeat questions.
4. **Love bubbles in every game** — a heart button in the room shows 6 quick bubbles: "I love you", "I'm angry", "Miss you", "Haha", "Your turn, babe" and "Not fair". A tapped bubble floats over your partner's screen right away, with a little pop animation. No emojis; each bubble gets its own drawn icon.

Both games get their own character picture and colour, match the current dark arcade look, and save your progress if you refresh.

## Technical details
- New pure reducers: `src/games/ludo/logic.ts` (track of 52 squares plus a home column, safe squares, capture, exact-roll home, 6 gives an extra turn, gate counter) and `memoryReduce` in `src/games/couples/logic.ts`; both wired into `applyAction` / `GAME_KEYS`.
- Dice rolled in `pairplay.functions.ts` during action handling (server randomness); Quiz Gate prompts drawn through the existing `seen_prompts` flow.
- UI: `src/games/ludo/LudoGame.tsx` (SVG board, animated piece hops, dice tumble), `src/games/memory/MemoryGame.tsx`; registry entries and mascots `char-ludo.png`, `char-memory.png`; Memory topics and options added to `banks.ts`.
- Bots in `SoloPlay.tsx`: Ludo bot prefers capture > reaching home > leaving base > furthest piece.
- Love bubbles: `LoveBubbles.tsx` in `RoomDock`, sent over the existing room realtime broadcast channel (nothing is stored), rate-limited to one every 1.5s.
- Migration: insert `ludo` and `memory` into `games` (active, sort_order 12–13).
- Verify: typecheck, play both games against the computer with Playwright; two-device play is left for you to test.
