
-- 1. Prevent users from updating sensitive profile fields (coins, stats, deletion)
-- Service role (admin client used by server fns) bypasses this check.
CREATE OR REPLACE FUNCTION public.prevent_sensitive_profile_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.coins IS DISTINCT FROM OLD.coins
    OR NEW.coins_purchased_total IS DISTINCT FROM OLD.coins_purchased_total
    OR NEW.coins_spent_total IS DISTINCT FROM OLD.coins_spent_total
    OR NEW.wins IS DISTINCT FROM OLD.wins
    OR NEW.losses IS DISTINCT FROM OLD.losses
    OR NEW.draws IS DISTINCT FROM OLD.draws
    OR NEW.deletion_scheduled_at IS DISTINCT FROM OLD.deletion_scheduled_at
    OR NEW.id IS DISTINCT FROM OLD.id
  THEN
    RAISE EXCEPTION 'Cannot modify protected profile fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_sensitive_profile_updates_trg ON public.profiles;
CREATE TRIGGER prevent_sensitive_profile_updates_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_sensitive_profile_updates();

-- 2. Hide sensitive profile columns from anon/authenticated via column-level grants.
-- Server functions use supabaseAdmin (service_role) and bypass these grants.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, username, avatar_url, wins, losses, draws,
  equipped_board, equipped_piece, equipped_frame,
  last_seen_at, created_at
) ON public.profiles TO anon, authenticated;

-- 3. Restrict rooms SELECT to participants (host/guest/pending_guest)
DROP POLICY IF EXISTS rooms_select_auth ON public.rooms;
CREATE POLICY rooms_select_participant ON public.rooms
FOR SELECT TO authenticated
USING (
  host_id = auth.uid()
  OR guest_id = auth.uid()
  OR pending_guest_id = auth.uid()
);

-- 4. Atomic cosmetic purchase to prevent TOCTOU race
CREATE OR REPLACE FUNCTION public.purchase_cosmetic(_user_id uuid, _cosmetic_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  new_balance integer;
BEGIN
  SELECT * INTO c FROM public.cosmetics WHERE id = _cosmetic_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cosmetic not found'; END IF;

  IF EXISTS (SELECT 1 FROM public.user_cosmetics WHERE user_id = _user_id AND cosmetic_id = _cosmetic_id) THEN
    RETURN jsonb_build_object('ok', true, 'already_owned', true);
  END IF;

  UPDATE public.profiles
  SET coins = coins - c.price_coins,
      coins_spent_total = coins_spent_total + c.price_coins
  WHERE id = _user_id AND coins >= c.price_coins
  RETURNING coins INTO new_balance;

  IF NOT FOUND THEN RAISE EXCEPTION 'Not enough coins'; END IF;

  INSERT INTO public.user_cosmetics (user_id, cosmetic_id) VALUES (_user_id, _cosmetic_id);

  IF c.price_coins > 0 THEN
    INSERT INTO public.coin_transactions (user_id, delta, balance_after, source, ref)
    VALUES (_user_id, -c.price_coins, new_balance, 'cosmetic_spend', _cosmetic_id::text);
  END IF;

  RETURN jsonb_build_object('ok', true, 'balance', new_balance);
END;
$$;

-- 5. Realtime broadcast/presence authorization — gate room and voice channels
-- to room participants. Other channels (e.g. invite channels) remain open to
-- authenticated users.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS realtime_room_participant ON realtime.messages;
CREATE POLICY realtime_room_participant ON realtime.messages
FOR SELECT TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'room-%' OR realtime.topic() LIKE 'voice-%' THEN
      EXISTS (
        SELECT 1 FROM public.rooms r
        WHERE r.id::text = split_part(realtime.topic(), '-', 2)
          AND (r.host_id = auth.uid() OR r.guest_id = auth.uid() OR r.pending_guest_id = auth.uid())
      )
    ELSE true
  END
);

DROP POLICY IF EXISTS realtime_room_participant_write ON realtime.messages;
CREATE POLICY realtime_room_participant_write ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  CASE
    WHEN realtime.topic() LIKE 'room-%' OR realtime.topic() LIKE 'voice-%' THEN
      EXISTS (
        SELECT 1 FROM public.rooms r
        WHERE r.id::text = split_part(realtime.topic(), '-', 2)
          AND (r.host_id = auth.uid() OR r.guest_id = auth.uid() OR r.pending_guest_id = auth.uid())
      )
    ELSE true
  END
);
