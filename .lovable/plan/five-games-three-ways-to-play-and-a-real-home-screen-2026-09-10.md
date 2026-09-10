# Five games, three ways to play, and a real home screen

Right now the app has two games (XO, Guess Me) that only work inside a paired
room, plus a separate solo XO page. This build finishes the set: five games,
each playable against the computer, with a partner, or with someone you meet
online.

## Three ways to play

1. **Solo** — every game against the computer, no sign-in needed, three
   difficulty levels where it makes sense.
2. **Your room** — the private room with your paired partner, voice always on
   (unchanged, just gets three more games on the shelf).
3. **Play online** — a lobby where you can see who is free right now and invite
   them, or open a room with a 4-letter code and send it to anyone. Accepting an
   invite drops both people into the same room, voice included, exactly like the
   pair room but temporary.

## The five games

| Game | Two players | Vs computer |
|---|---|---|
| XO | already built, moves into the new shell | already built, restyled |
| Guess Me | already built | new: computer plays a character with its own taste, you guess it |
| Sudoku Duo | shared grid, each person fills cells live, mistakes flagged, timer | race the clock with a computer partner filling cells at its own pace |
| Bottle Rush | tap-speed rounds: the bottle spins, first correct tap wins the point, best of 7 | computer reacts with a human-like delay tied to difficulty |
| Air Hockey Live | drag your paddle, puck physics, first to 7 | computer paddle tracks the puck with tunable reaction and error |

Air Hockey runs its physics on one side (the host) and streams puck position to
the other 20 times a second, with the paddle positions sent both ways — that
keeps it smooth without fighting over who is right.

## The new home screen

The home screen becomes a proper hub instead of the "pair up first" wall:

```text
  ┌─────────────────────────────┐
  │  PairPlay        [avatar]   │
  │                             │
  │  ┌───────────────────────┐  │
  │  │ your room · [partner] │  │  ← if paired: live status, tap to enter
  │  │ online now · knock    │  │     if not: "pair up" invitation
  │  └───────────────────────┘  │
  │                             │
  │  Play online                │
  │  [ find someone ] [ code ]  │
  │                             │
  │  Games                      │
  │  ┌──────┐ ┌──────┐          │
  │  │  XO  │ │Guess │  …       │  ← tap a game → solo / partner / online
  │  └──────┘ └──────┘          │
  └─────────────────────────────┘
```

Tapping a game card opens a sheet with three buttons: play the computer, play
your partner, play online. Choosing the computer starts instantly, with no
sign-in.

## Design

Same night palette, extended: each game gets its own accent so the shelf reads
as five distinct things rather than five grey cards. You stay cool blue, the
other person stays warm amber, in every game. Big touch targets, one hand,
spring motion on every result, haptics on wins and reveals, reduced motion
respected.

## Technical notes

- **Reducers**: `src/games/logic.ts` gains `sudokuInit/sudokuReduce`,
  `rushInit/rushReduce`, `hockeyInit/hockeyReduce`, all pure
  `(state, action, meta) => state`, registered in `applyAction`. Sudoku puzzle
  generation and Bottle Rush prompts are generated server-side at session start
  so neither client can peek.
- **Bots**: a per-game `bot.ts` next to each game module exporting
  `pickAction(state, meta, difficulty)`. Solo runs the same reducer locally with
  the bot supplying the opponent's actions — one rule set, no duplicate logic.
- **Air Hockey** bypasses `submit_move` for the 20Hz puck stream (room channel
  broadcast only) and writes only goals and the final result to
  `game_sessions`.
- **Schema**: new rows in `games` for the three new keys; new tables
  `presence_lobby` (who is open to play, heartbeat-backed),
  `match_rooms` + `match_invites` for code rooms and online invites, all with
  GRANTs and default-deny RLS scoped to the participants. `rooms` /
  `game_sessions` gain a nullable `match_room_id` path so an online match reuses
  the same session machinery as a pair room.
- **RoomProvider** is generalised to accept either a pair room or a match room;
  the voice, presence, reactions and stage code stay as-is so nothing remounts
  when a game starts or swaps.
- **Routes**: `/` becomes the hub, `/play` the online lobby, `/room` the pair
  room, `/match/$code` a joined online room, `/solo/$game` solo play (public,
  no auth). Each gets its own title and description.
- Outstanding from the last build: four `SECURITY DEFINER` linter warnings get
  fixed in the same migration (execute revoked from `anon`/`authenticated`).

## Order of work

1. Migration + security fixes
2. Home hub + game-card sheet + solo shell
3. Sudoku Duo, Bottle Rush, Air Hockey (reducers, bots, UIs)
4. Online lobby, code rooms, invite/accept
5. Visual pass and device testing
