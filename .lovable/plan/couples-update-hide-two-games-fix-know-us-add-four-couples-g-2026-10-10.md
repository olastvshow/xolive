# Couples update: hide two games, fix Know Us, add four couples games

## 1. Hide Cup Pong and Fill the Glass
- They no longer appear on any screen: home, Games, vs Computer, room shelf, or online play.
- Their code stays in place so they can be switched back on later.

## 2. Fix and improve Know Us
- **Fix the "Me / Them" mix-up.** Right now the person answering about themselves picks "Me", and the partner guessing also picks "Me", meaning themselves. So the two of you choose the same real answer but the app shows "Missed it". Answers like "Me", "Them", "I did" and "They did" will instead show real names, for example "Ada" and "Tunde", phrased the same way for both people. Picking the same person then counts as a match.
- **No repeated questions.** Each pair keeps a record of the questions it has already seen, and a new round only uses fresh ones. Questions only come round again once the whole bank has been used.
- **No repeat answers.** Once you lock in an answer it can't be submitted again, and duplicate taps are ignored.
- **More fun.** The question bank grows to about 120 relationship questions across categories: First moves, Us, Habits, Feelings, Future, Spicy-but-sweet, Memories and Silly. Results show a friendly verdict, and you can hit "Play again" for a fresh set.

## 3. Four new couples games
Each game works in a private room with your partner, and also as a practice round against the computer.
- **This or That.** Both of you secretly pick between two options, such as beach or mountains. The picks show at the same time, and your "in sync" score goes up when they match. 15 pairs per round, none repeated.
- **Who's More Likely.** Both of you secretly tap "Me" or your partner's name for things like "cry at a film" or "forget an anniversary". A match is a point. The reveal shows both picks side by side.
- **Truth or Dare (sweet).** You take turns. Spin for a gentle truth or a playful dare that is safe to do over a call. Each person gets one skip per round, and finished cards don't come up again.
- **Finish the Sentence.** One of you types a short ending to a prompt like "The moment I knew...". The other reacts with a heart, a laugh or a "tell me more", then you swap turns. The round ends with a keepsake list of what you both wrote.

Each new game gets its own character picture and colour, in the same style as the existing ones.

## Technical details
- Registry: add an `enabled` flag. `cup-pong` and `fill-glass` are set to false, and every list filters on it. A migration sets `games.active=false` for those two and inserts the four new keys.
- Know Us: options store tokens (`{self}` / `{partner}`) that are resolved per viewer relative to `q.subject`. The comparison stays index-based, so the scoring logic remains correct. Existing "Me"/"Them" options in the bank and table are rewritten to use tokens.
- No repeats: a new table `pair_seen_questions(pair_id, game_key, question_key)` with RLS for pair members, written by the server when a round is created. Solo play tracks seen questions in local storage.
- New pure reducers in `src/games/logic.ts` (`thisOrThat`, `likely`, `truthDare`, `finish`). The existing server session flow handles them, including the solo bot. Prompt banks live in code.
- Finish the Sentence text is capped at 140 characters and stored in the session state, so only room members can see it.
- Character pictures are generated as transparent PNGs.
