# XO Live — Completion Plan

Build out the remaining flows on top of the existing UI shell, with real-time multiplayer powered by Lovable Cloud and email/password auth.

## 1. Backend (Lovable Cloud)

Enable Lovable Cloud, then create schema:

- `profiles` — `id` (FK auth.users), `username`, `avatar_url`, `wins`, `losses`, `draws`, `coins`, `couple_bond`, `created_at`. Auto-created via signup trigger.
- `rooms` — `id`, `code` (6-char join code), `host_id`, `guest_id` (nullable), `status` (waiting/playing/finished), `board` (jsonb 9 cells), `turn` (X/O), `winner_id`, `is_quick_play`, `created_at`.
- `messages` — `id`, `room_id`, `user_id`, `text`, `kind` (chat/reaction), `created_at`.
- `user_roles` + `has_role()` (standard pattern, for future admin).

RLS: profiles readable by all auth'd users, updatable by owner. Rooms readable by participants or by code lookup, writable by participants. Messages scoped to room participants. Enable Realtime on `rooms` and `messages`.

GRANTs on every public table per template rules.

## 2. Auth

- `/auth` route with sign-in / sign-up tabs (email + password, username on signup).
- Root `onAuthStateChange` listener invalidates router + query cache.
- `src/routes/_authenticated/route.tsx` integration-managed gate (`ssr: false`, redirects to `/auth`).
- Move `/`, `/game/$roomId`, `/leaderboard`, `/profile` under `_authenticated/`.

## 3. Routes & flows

- **Home (`/`)** — wire real data: current user's recent matches (last 10 from rooms), coin counter from profile. Buttons:
  - **Quick Play** → server fn matches with any `waiting` quick-play room or creates one, redirects to `/game/$roomId`.
  - **Create Room** → modal/page collecting options → inserts room with generated code → redirect to game room (waiting state shows code to share).
  - **Join Room** → modal with 6-char code input → server fn validates + sets guest → redirect.
- **Game Room (`/game/$roomId`)** — replace local state with realtime:
  - Subscribe to `rooms` row + `messages` for the room.
  - Cell tap → server fn `makeMove(roomId, index)` validates turn/ownership, updates board, checks winner, swaps turn, awards coins & updates stats on game end.
  - Reactions & chat → insert into `messages`.
  - Waiting state when no guest yet: show invite code + "waiting for opponent".
  - Rematch button when finished.
- **Leaderboard (`/leaderboard`)** — query top profiles by wins; search by username; highlight current user's rank.
- **Profile (`/profile`)** — current user stats, badges (derived from wins thresholds), sign-out button.

## 4. Server functions

In `src/lib/*.functions.ts` (all gated by `requireSupabaseAuth` except where noted):
- `getMyProfile`, `updateProfile`
- `createRoom({ isQuickPlay })`, `joinRoomByCode({ code })`, `quickPlay()`
- `getRoom({ id })`, `getRecentMatches()`
- `makeMove({ roomId, index })` — auth'd, validates state, computes winner, updates stats
- `sendMessage({ roomId, text, kind })`
- `getLeaderboard({ search? })`
- `requestRematch({ roomId })`

## 5. Realtime wiring

Client subscribes via browser supabase client to `postgres_changes` on `rooms` (filter `id=eq.$roomId`) and `messages` (filter `room_id=eq.$roomId`); invalidate corresponding React Query keys on event.

## 6. Cleanup

- Remove placeholder static board state in `game.tsx`, replace with live data.
- Add `errorComponent` + `notFoundComponent` to every route with a loader.
- Update `TopBar` coin counter to read live profile.
- Add toasts for join errors, game-end states.

## Technical notes

- Game-end logic & coin awards happen server-side in `makeMove` (never trust client).
- Room code = uppercase alphanumeric, retry on collision.
- Quick Play matchmaking uses a single transaction (`SELECT ... FOR UPDATE SKIP LOCKED` via RPC) to avoid double-join races; if too complex, fall back to insert+update with unique constraint on `(status, is_quick_play)` filter and retry.
- Default move turn: host=X, guest=O.
