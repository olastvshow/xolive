
# XO Live — Monetization + Gap-closure Plan

## TL;DR on your idea

Buying coins is fine. **Withdrawing coins as cash is real-money gambling** — it requires a gambling license, KYC/AML, age verification, and is banned by Stripe/Paddle/Apple/Google under standard terms. It would get the app shut down before it makes a dollar.

**Recommended path:** keep the coin-bet loop you already have (it's the fun part), let users **buy** coins with real money, and let them **spend** coins on cosmetics. No cashout. This is the proven model (Chess.com, Clash Royale, 8 Ball Pool) — app-store safe, processor-safe, ship-this-week safe.

If XO Live blows up later, we revisit licensed real-money tournaments in specific jurisdictions with a specialist lawyer. Not now.

---

## How coins work today (audit)

From `src/lib/xo.functions.ts` + `profiles` schema:

- New user starts with **1,250 coins**.
- `Create Room` lets host pick bet: **0 / 50 / 100 / 250**. Quick Play & Join-by-code always = 0.
- On game end (`makeMove` handler):
  - **Winner:** `coins += 50 + bet`
  - **Loser:** `coins -= bet` (floored at 0)
  - **Draw:** no change
- **Bug:** the bet is never escrowed and never actually transferred. The winner is paid by "the house" (50 + bet minted from nothing), and the loser pays bet to the void. This is harmless today, but the moment coins cost money it becomes free money printing.
- No cap on bet vs. balance — a user with 10 coins can host a 250-coin bet and only lose 10.

## What's missing in the app (prioritized)

**Must-fix before money is involved**
1. True bet escrow + balance check (deduct both on game start, full pot to winner)
2. Anti-collusion: block matches where both players share IP/device fingerprint (prevents 2-tab coin laundering)
3. Per-action rate limits on `makeMove` and `sendMessage`

**Promised features still missing**
4. WebRTC live voice between the 2 players (signaling via Supabase Realtime on `messages` with `kind='signal'`)
5. Reaction emoji bar wired end-to-end (insert into `messages` with `kind='reaction'`, float on both clients)
6. Blitz mode per-move timer (mode is stored but not enforced)

**Polish gaps**
7. Loading / empty / error / offline states on leaderboard, recent matches, game
8. Edit-username UI on profile (server fn exists, no UI)
9. Leaderboard tie-breakers (wins, then win-rate, then draws)
10. Toasts for join errors / game-end states

## Monetization design (cosmetics + coin store)

**Coin Store** — Lovable's built-in Stripe payments (no Stripe account needed):
- $0.99 → 500 coins
- $4.99 → 3,000 coins (+20% bonus)
- $9.99 → 7,000 coins (+40% bonus)
- $19.99 → 16,000 coins (+60%)
- $49.99 → 45,000 coins (+80%)

**Spend coins on (no real-money withdrawal):**
- Board skins (neon, wood, marble, retro CRT)
- X/O piece styles (emoji, animated, neon)
- Win animations (fireworks, confetti, dragon)
- Avatar frames + name colors
- Emote packs for reactions

**Optional next step (out of scope for this turn):** "XO Pro" $4.99/month subscription — ranked mode, all skins, ad-free, 2× daily coin bonus.

---

## Implementation plan

### Phase 1 — Fix the economy (this turn)

**1. Schema migration**
- Add `rooms.pot` (int) — escrowed bet from both players at game start
- Add `profiles.coins_spent_total`, `profiles.coins_purchased_total` (for analytics)
- Add `cosmetics` table: `id`, `kind` (board/piece/frame/emote), `slug`, `name`, `price_coins`, `preview_url`
- Add `user_cosmetics` table: `user_id`, `cosmetic_id`, `equipped` (bool), unique(user_id, cosmetic_id)
- Add `profiles.equipped_board`, `equipped_piece`, `equipped_frame` (text slugs, default 'classic')
- Plus GRANTs + RLS per template rules

**2. Server fn changes in `src/lib/xo.functions.ts`**
- `joinRoomByCode` / `quickPlay`: when 2nd player joins a betting room, deduct `bet` from BOTH players atomically (RPC `start_match(room_id)`), insert into `rooms.pot = bet * 2`. Reject if either balance < bet.
- `createRoom`: validate host balance ≥ bet. (Don't deduct yet — wait for opponent.)
- `makeMove` on game end: pay `rooms.pot` to winner. On draw, refund half to each. Remove the magic +50 win bonus (the bet IS the reward now). Optional: keep a small win bonus only for 0-coin matches to keep new users active.
- New `cancelRoom` server fn: host cancels a waiting room — no refund needed (nothing deducted yet).

**3. New server fns**
- `getCosmetics()` — list catalog
- `purchaseCosmetic({ id })` — deducts coins, inserts `user_cosmetics` row
- `equipCosmetic({ id })` — sets `profiles.equipped_*`

### Phase 2 — Coin Store (Stripe Payments)

- Enable Lovable's built-in Stripe payments (no API key needed)
- Create the 5 coin-pack products
- Add `/coins` route: pack grid → Stripe checkout
- Add webhook at `src/routes/api/public/stripe-webhook.ts` (signature-verified) that credits `profiles.coins` on `checkout.session.completed` and logs to a `coin_transactions` table (id, user_id, delta, source: purchase|win|loss|spend|refund, ref, created_at)
- Add "Buy coins" CTA on TopBar when balance < 100, plus a "Store" tab in bottom nav

### Phase 3 — Cosmetics UI

- `/store` route: tabs for Boards / Pieces / Frames / Emotes. Each card shows preview, price, Buy / Equip / Equipped state
- Profile shows owned cosmetics
- Game board renders `equipped_board` skin and `equipped_piece` style
- TopBar avatar uses `equipped_frame`

### Phase 4 — Close the social gaps

- **Reactions UI**: floating emoji bar above the board (👍 😂 🔥 😱 🤝 💀). Tap inserts `messages` row with `kind='reaction'`. Realtime subscriber on both clients animates emoji floating up from sender's side.
- **WebRTC voice**: Mute/Unmute button in game header. Signaling (offer/answer/ICE) sent through `messages` with `kind='signal'` (not displayed in chat). Use STUN-only (Google public STUN); TURN can come later if NAT issues appear. Show mic-level indicator next to each avatar.
- **Blitz timer**: server tracks `rooms.move_deadline` (timestamp). If `now() > deadline` on next `makeMove`, force-forfeit the slow player. Client shows countdown.
- **Anti-collusion (basic)**: server fn rejects joining a betting room if both players share the same IP within the last hour (log IP hash in `messages` insert middleware).

### Phase 5 — Polish

- Toasts on every server-fn error/success via existing `sonner`
- Loading skeletons on leaderboard, recent matches, game waiting state
- Edit-username dialog on profile
- Leaderboard sort: wins DESC, then (wins / (wins+losses)) DESC, then draws DESC

---

## Technical notes

- All economy mutations go through `coin_transactions` ledger so we can audit, refund, and ban printers. Never update `profiles.coins` outside a server fn that also writes to the ledger.
- `start_match` and `finish_match` should be Postgres functions (security definer) to keep both-sides balance updates atomic — JS-side multi-step updates race under realtime.
- WebRTC: keep peer connection logic in a dedicated `src/hooks/useVoiceChat.ts`. Only initialize after the user explicitly taps "Join voice" (browser autoplay/permission rules).
- Reactions: throttle to 1 per 500ms per user, server-side.
- Stripe webhook MUST verify signature with `STRIPE_WEBHOOK_SECRET`; idempotent on `checkout.session.id`.
- All coin display in TopBar already reads live profile via React Query — invalidating `["profile"]` after purchase/win is enough.

## What I will NOT build

- Real-money withdrawals / cashout (legal blocker)
- Sweepstakes / "free entry" lottery loophole (needs lawyer)
- Tournaments with cash prizes
- Skins gambling / loot boxes (regulated in many countries; cosmetics direct-purchase only)

## Scope for the very next build turn

Phase 1 only (fix the economy + ledger + escrow). That unblocks everything else and ships a correct, auditable coin system. Phases 2–5 follow in subsequent turns once you've confirmed Phase 1 works.
