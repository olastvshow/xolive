
-- 1. Extend rooms with escrow pot
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS pot integer NOT NULL DEFAULT 0;

-- 2. Extend profiles with economy + cosmetics slots
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS coins_purchased_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins_spent_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS equipped_board text NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS equipped_piece text NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS equipped_frame text NOT NULL DEFAULT 'classic';

-- 3. Cosmetics catalog (unique per kind+slug)
CREATE TABLE public.cosmetics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('board','piece','frame','emote')),
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  price_coins integer NOT NULL DEFAULT 0 CHECK (price_coins >= 0),
  preview_url text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, slug)
);

GRANT SELECT ON public.cosmetics TO authenticated;
GRANT ALL ON public.cosmetics TO service_role;

ALTER TABLE public.cosmetics ENABLE ROW LEVEL SECURITY;

CREATE POLICY cosmetics_read_auth ON public.cosmetics
  FOR SELECT TO authenticated USING (active = true);

-- 4. User-owned cosmetics
CREATE TABLE public.user_cosmetics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cosmetic_id uuid NOT NULL REFERENCES public.cosmetics(id) ON DELETE CASCADE,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cosmetic_id)
);

GRANT SELECT ON public.user_cosmetics TO authenticated;
GRANT ALL ON public.user_cosmetics TO service_role;

ALTER TABLE public.user_cosmetics ENABLE ROW LEVEL SECURITY;

CREATE POLICY uc_select_own ON public.user_cosmetics
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 5. Coin ledger
CREATE TABLE public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta integer NOT NULL,
  balance_after integer NOT NULL,
  source text NOT NULL CHECK (source IN ('signup','purchase','bet_escrow','win_payout','draw_refund','cosmetic_spend','admin_adjust','refund')),
  ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX coin_tx_user_created_idx ON public.coin_transactions (user_id, created_at DESC);

GRANT SELECT ON public.coin_transactions TO authenticated;
GRANT ALL ON public.coin_transactions TO service_role;

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY coin_tx_select_own ON public.coin_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 6. start_match: atomically escrow both players' bets into rooms.pot
CREATE OR REPLACE FUNCTION public.start_match(_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  host_coins integer;
  guest_coins integer;
BEGIN
  SELECT * INTO r FROM public.rooms WHERE id = _room_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Room not found'; END IF;
  IF r.guest_id IS NULL THEN RAISE EXCEPTION 'No opponent yet'; END IF;
  IF r.status <> 'playing' THEN RAISE EXCEPTION 'Room not in playing state'; END IF;
  IF r.pot > 0 THEN RETURN; END IF;
  IF r.bet = 0 THEN RETURN; END IF;

  SELECT coins INTO host_coins FROM public.profiles WHERE id = r.host_id FOR UPDATE;
  SELECT coins INTO guest_coins FROM public.profiles WHERE id = r.guest_id FOR UPDATE;
  IF host_coins < r.bet OR guest_coins < r.bet THEN
    RAISE EXCEPTION 'Insufficient coins to start match';
  END IF;

  UPDATE public.profiles SET coins = coins - r.bet WHERE id = r.host_id;
  UPDATE public.profiles SET coins = coins - r.bet WHERE id = r.guest_id;
  UPDATE public.rooms SET pot = r.bet * 2 WHERE id = r.id;

  INSERT INTO public.coin_transactions (user_id, delta, balance_after, source, ref) VALUES
    (r.host_id, -r.bet, host_coins - r.bet, 'bet_escrow', r.id::text),
    (r.guest_id, -r.bet, guest_coins - r.bet, 'bet_escrow', r.id::text);
END;
$$;

REVOKE ALL ON FUNCTION public.start_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_match(uuid) TO service_role;

-- 7. finish_match: pay pot to winner, or refund equally on draw
CREATE OR REPLACE FUNCTION public.finish_match(_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  half integer;
  winner_balance integer;
  host_balance integer;
  guest_balance integer;
BEGIN
  SELECT * INTO r FROM public.rooms WHERE id = _room_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Room not found'; END IF;
  IF r.pot = 0 THEN RETURN; END IF;

  IF r.is_draw THEN
    half := r.pot / 2;
    UPDATE public.profiles SET coins = coins + half WHERE id = r.host_id
      RETURNING coins INTO host_balance;
    UPDATE public.profiles SET coins = coins + (r.pot - half) WHERE id = r.guest_id
      RETURNING coins INTO guest_balance;
    INSERT INTO public.coin_transactions (user_id, delta, balance_after, source, ref) VALUES
      (r.host_id, half, host_balance, 'draw_refund', r.id::text),
      (r.guest_id, r.pot - half, guest_balance, 'draw_refund', r.id::text);
  ELSIF r.winner_id IS NOT NULL THEN
    UPDATE public.profiles SET coins = coins + r.pot WHERE id = r.winner_id
      RETURNING coins INTO winner_balance;
    INSERT INTO public.coin_transactions (user_id, delta, balance_after, source, ref)
      VALUES (r.winner_id, r.pot, winner_balance, 'win_payout', r.id::text);
  END IF;

  UPDATE public.rooms SET pot = 0 WHERE id = r.id;
END;
$$;

REVOKE ALL ON FUNCTION public.finish_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finish_match(uuid) TO service_role;

-- 8. Seed cosmetics catalog
INSERT INTO public.cosmetics (kind, slug, name, description, price_coins, sort_order) VALUES
  ('board','classic','Classic','Default board',0,0),
  ('board','neon','Neon Grid','Glowing cyan lines',500,10),
  ('board','wood','Walnut','Warm wood tones',800,20),
  ('board','marble','Marble','Polished stone',1200,30),
  ('board','crt','Retro CRT','Scanlines & glow',1500,40),
  ('piece','classic','Classic','Default X and O',0,0),
  ('piece','neon','Neon','Glowing strokes',400,10),
  ('piece','emoji','Emoji','😎 vs 🤖',600,20),
  ('piece','fire-ice','Fire & Ice','🔥 vs ❄️',900,30),
  ('piece','royal','Royal','👑 vs ⚔️',1200,40),
  ('frame','classic','Classic','No frame',0,0),
  ('frame','gold','Gold','Gold ring',700,10),
  ('frame','rainbow','Rainbow','Animated gradient',1500,20),
  ('frame','legend','Legend','Pulsing aura',3000,30),
  ('emote','starter','Starter Pack','👍 😂 🔥 😱 🤝 💀',0,0),
  ('emote','rage','Rage Pack','😤 🤬 💢 🧨 ☠️ 🪦',500,10),
  ('emote','love','Love Pack','😍 💖 🥰 💋 🌹 💌',500,20);
