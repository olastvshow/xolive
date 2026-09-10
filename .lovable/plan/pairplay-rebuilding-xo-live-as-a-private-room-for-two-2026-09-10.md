# PairPlay — rebuilding XO Live as a private room for two

## What changes

XO Live becomes **PairPlay**: instead of matching with strangers for coins, you pair permanently with one person. You both walk into the same private room, voice is already on, reactions fly, and games sit on a shelf inside the room — you start and swap them without ever leaving or dropping the call.

Your decisions, locked in:
- Full rebrand to PairPlay
- Keep the voice we already have (no new service, no new cost)
- Drop the public side: no leaderboard, no coins, no strangers
- First new game after the room: **Guess Me**

## What goes away

Coins and the coin balance, the cosmetics store, betting, the leaderboard, quick match with random players, and the invite/decline stranger flow. Solo-vs-computer stays (it's the thing to do when your partner is offline).

## What gets built

### Phase 1 — Pairing
- Invite screen: generates a 6-character code plus a share message ("come play with me 🫶 [link] — code ABCDEF"). Codes expire in 24 hours.
- Redeem screen: "I have a code."
- Once paired, you land straight in your room. One partner at a time; unpairing is available and calm, with no guilt-trip.
- New tables: pairs, pair members, invite codes, room, shared stats. Old coin/cosmetic tables get retired.

### Phase 2 — The room (the home screen)
There is no separate home. The room is it.
- Both avatars at the top with a live **voice ring** that moves when the other person talks.
- Always-on voice using the current setup, carried up so it never disconnects when a game starts or ends.
- Reaction bar (💛 😂 😮 🔥 😭 👏) — bursts on both screens, with a haptic buzz.
- Comment strip: 140 characters, last 20 kept.
- Game shelf when nothing is being played; proposing a game shows the partner a Play / Not now card that expires in 30 seconds.
- Offline partner: dimmed avatar, "was here 3 hours ago", and a big **Knock** button.

### Phase 3 — XO moves into the room
The existing tic-tac-toe becomes the first game on the shelf: same rules, restyled to the new dark palette, rendered inside the room's stage so voice and reactions keep running around it. Result card with a one-tap **Rematch**.

### Phase 4 — Guess Me
Ten questions per round. Both answer at the same time and privately — one answers as themselves, the other guesses what they'll say. Cards flip together on reveal; a match scores for both. Roles swap each question. Multiple choice, four options, across Food / Habits / Past / Future / Silly. Ships with a starter question bank.

### Phase 5 — Look and feel
Dark-only, nighttime, one-handed. Deep indigo surfaces, **you** are cool blue, **they** are warm amber — the only warm colour in the app, so the person always reads as the warmest thing on screen. Spring motion, tabular numbers, haptics on every mutual event. Reduced-motion respected throughout.

### Later (not this run)
Sudoku Duo, Bottle Rush, Air Hockey Live, push notifications, the "Us" stats page, and the Couple Pass subscription.

## Technical notes

- New schema per DATA_MODEL.md: `pairs`, `pair_members`, `pair_invites`, `rooms` (one per pair), `games`, `game_sessions`, `game_moves`, `messages`, `pair_stats`, `analytics_events`. RLS default-deny on all, gated through a `is_pair_member()` stable security-definer helper. Grants issued per table in the same migration. Includes the `one_active_pair_per_user` partial unique index and a negative-access test (a third account reads zero rows).
- Existing `rooms` is match-scoped and conflicts with the pair-scoped room; it is replaced, along with `coin_transactions`, `cosmetics`, `user_cosmetics`, and the coin/cosmetic RPCs (`start_match`, `finish_match`, `purchase_cosmetic`). Coin columns drop off `profiles`; `display_name` and `timezone` are added.
- `RoomProvider` owns one Supabase Realtime channel `room:{roomId}` (broadcast `self:false`, presence keyed by user id) plus the existing `RTCPeerConnection`. It sits above the game stage and must never remount when a game starts, ends, or is swapped. Signalling migrates from the `messages` table onto the room channel.
- Games are `React.lazy` modules registered against a `GameModule` contract and mounted into a stage slot. Reducers are pure `(state, action, meta) => state` so replay, reconnect and server validation all work.
- Tier A turn sync: moves go through a `submit_move` RPC with optimistic-concurrency on move count; `game_sessions.state` is the resume point. Local input renders immediately and reconciles after.
- Server logic stays in `createServerFn` (no edge functions). Route tree flattens: `/` becomes the room, with `/onboarding`, `/pair`, `/solo`, `/profile`, and the legal pages beside it. `create-room`, `join-room`, `quick-match`, `leaderboard`, and `game` are removed.
- Native shell, Capacitor config, delete-account and support routes are kept as-is.

## Suggested order

Phase 1 and 2 in the first build (pairing plus the live room), then XO into the stage, then Guess Me, then the visual pass. Each phase is testable on two real phones before the next starts.
