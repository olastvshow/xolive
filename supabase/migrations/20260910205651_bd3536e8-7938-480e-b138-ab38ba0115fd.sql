-- ============ rooms become pair rooms OR online match rooms ============
ALTER TABLE public.rooms ALTER COLUMN pair_id DROP NOT NULL;
ALTER TABLE public.rooms
  ADD COLUMN kind text NOT NULL DEFAULT 'pair',
  ADD COLUMN code text,
  ADD COLUMN guest_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN status text NOT NULL DEFAULT 'open',
  ADD COLUMN last_active_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX rooms_code_uniq ON public.rooms (code) WHERE code IS NOT NULL;
CREATE INDEX rooms_kind_status_idx ON public.rooms (kind, status);

CREATE OR REPLACE FUNCTION public.is_room_member(_room_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = _room_id
      AND (
        r.host_id = _user_id
        OR r.guest_id = _user_id
        OR (r.pair_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.pair_members pm
              WHERE pm.pair_id = r.pair_id AND pm.user_id = _user_id AND pm.active))
      )
  );
$$;

DROP POLICY IF EXISTS rooms_select ON public.rooms;
CREATE POLICY rooms_select ON public.rooms FOR SELECT TO authenticated
  USING (public.is_room_member(id, auth.uid()));

DROP POLICY IF EXISTS messages_select ON public.messages;
CREATE POLICY messages_select ON public.messages FOR SELECT TO authenticated
  USING (public.is_room_member(room_id, auth.uid()));
DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_room_member(room_id, auth.uid()));

DROP POLICY IF EXISTS gs_select ON public.game_sessions;
CREATE POLICY gs_select ON public.game_sessions FOR SELECT TO authenticated
  USING (public.is_room_member(room_id, auth.uid()));

DROP POLICY IF EXISTS gm_select ON public.game_moves;
CREATE POLICY gm_select ON public.game_moves FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.game_sessions s
                 WHERE s.id = game_moves.session_id
                   AND public.is_room_member(s.room_id, auth.uid())));

-- ============ lobby presence (server-read only) ============
CREATE TABLE public.lobby_presence (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  available boolean NOT NULL DEFAULT true,
  game_key text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.lobby_presence TO service_role;
ALTER TABLE public.lobby_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY lp_select_self ON public.lobby_presence FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE INDEX lobby_presence_live_idx ON public.lobby_presence (available, last_seen_at DESC);

-- ============ online invites ============
CREATE TABLE public.match_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  game_key text REFERENCES public.games(key),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '45 seconds')
);
GRANT SELECT ON public.match_invites TO authenticated;
GRANT ALL ON public.match_invites TO service_role;
ALTER TABLE public.match_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY mi_select ON public.match_invites FOR SELECT TO authenticated
  USING (to_user = auth.uid() OR from_user = auth.uid());
CREATE INDEX match_invites_to_idx ON public.match_invites (to_user, status, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.match_invites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;

-- ============ the three new games ============
INSERT INTO public.games (key, name, tagline, sort_order, active) VALUES
  ('sudoku',      'Sudoku Duo',      'One grid. Two heads. One clock.',        3, true),
  ('bottle-rush', 'Bottle Rush',     'The bottle stops. First finger wins.',   4, true),
  ('air-hockey',  'Air Hockey Live', 'Slide, slam, seven goals.',              5, true)
ON CONFLICT (key) DO UPDATE
  SET name = EXCLUDED.name, tagline = EXCLUDED.tagline,
      sort_order = EXCLUDED.sort_order, active = true;

-- ============ tighten helper function execution ============
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_pair_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_pair_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_room_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_pair_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_pair_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) TO authenticated;