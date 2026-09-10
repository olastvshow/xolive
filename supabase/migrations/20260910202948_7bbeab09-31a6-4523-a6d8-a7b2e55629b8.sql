-- ============ tear down the public/coin era ============
DROP TRIGGER IF EXISTS prevent_sensitive_profile_updates_trg ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_sensitive_profile_updates() CASCADE;
DROP FUNCTION IF EXISTS public.start_match(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.finish_match(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.purchase_cosmetic(uuid, uuid) CASCADE;

DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.coin_transactions CASCADE;
DROP TABLE IF EXISTS public.user_cosmetics CASCADE;
DROP TABLE IF EXISTS public.cosmetics CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS coins,
  DROP COLUMN IF EXISTS coins_purchased_total,
  DROP COLUMN IF EXISTS coins_spent_total,
  DROP COLUMN IF EXISTS equipped_board,
  DROP COLUMN IF EXISTS equipped_piece,
  DROP COLUMN IF EXISTS equipped_frame,
  DROP COLUMN IF EXISTS wins,
  DROP COLUMN IF EXISTS losses,
  DROP COLUMN IF EXISTS draws;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Africa/Lagos';

UPDATE public.profiles SET display_name = COALESCE(display_name, username);

-- ============ pairs ============
CREATE TABLE public.pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','unpaired')),
  anniversary date,
  created_at timestamptz NOT NULL DEFAULT now(),
  unpaired_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.pairs TO authenticated;
GRANT ALL ON public.pairs TO service_role;
ALTER TABLE public.pairs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pair_members (
  pair_id uuid NOT NULL REFERENCES public.pairs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  active boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pair_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pair_members TO authenticated;
GRANT ALL ON public.pair_members TO service_role;
ALTER TABLE public.pair_members ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX one_live_pair_per_user
  ON public.pair_members (user_id)
  WHERE (active);

CREATE TABLE public.pair_invites (
  code text PRIMARY KEY,
  pair_id uuid NOT NULL REFERENCES public.pairs(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  redeemed_by uuid REFERENCES public.profiles(id),
  redeemed_at timestamptz
);
GRANT SELECT, INSERT ON public.pair_invites TO authenticated;
GRANT ALL ON public.pair_invites TO service_role;
ALTER TABLE public.pair_invites ENABLE ROW LEVEL SECURITY;

-- helper
CREATE OR REPLACE FUNCTION public.is_pair_member(_pair_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.pair_members WHERE pair_id = _pair_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.my_pair_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pm.pair_id FROM public.pair_members pm
  JOIN public.pairs p ON p.id = pm.pair_id
  WHERE pm.user_id = auth.uid() AND p.status IN ('pending','active')
  LIMIT 1;
$$;

CREATE POLICY pairs_select ON public.pairs FOR SELECT TO authenticated
  USING (public.is_pair_member(id, auth.uid()));
CREATE POLICY pairs_update ON public.pairs FOR UPDATE TO authenticated
  USING (public.is_pair_member(id, auth.uid()));

CREATE POLICY pm_select ON public.pair_members FOR SELECT TO authenticated
  USING (public.is_pair_member(pair_id, auth.uid()));
CREATE POLICY pm_delete_self ON public.pair_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY invites_select_own ON public.pair_invites FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_pair_member(pair_id, auth.uid()));

-- ============ room ============
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid NOT NULL UNIQUE REFERENCES public.pairs(id) ON DELETE CASCADE,
  host_id uuid REFERENCES public.profiles(id),
  theme text NOT NULL DEFAULT 'midnight',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY rooms_select ON public.rooms FOR SELECT TO authenticated
  USING (public.is_pair_member(pair_id, auth.uid()));

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 140),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_room_created_idx ON public.messages (room_id, created_at DESC);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_select ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND public.is_pair_member(r.pair_id, auth.uid())));
CREATE POLICY messages_insert ON public.messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND public.is_pair_member(r.pair_id, auth.uid())));

-- ============ games ============
CREATE TABLE public.games (
  key text PRIMARY KEY,
  name text NOT NULL,
  tagline text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY games_select ON public.games FOR SELECT TO authenticated USING (active);

INSERT INTO public.games (key, name, tagline, sort_order) VALUES
  ('guess-me', 'Guess Me', 'How well do you know each other?', 1),
  ('xo', 'XO Arena', 'Three in a row. No teaching needed.', 2);

CREATE TABLE public.game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  game_key text NOT NULL REFERENCES public.games(key),
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','active','ended','declined')),
  proposed_by uuid REFERENCES public.profiles(id),
  players uuid[] NOT NULL DEFAULT '{}',
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  move_count integer NOT NULL DEFAULT 0,
  winner_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE INDEX game_sessions_room_idx ON public.game_sessions (room_id, created_at DESC);
GRANT SELECT ON public.game_sessions TO authenticated;
GRANT ALL ON public.game_sessions TO service_role;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY gs_select ON public.game_sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND public.is_pair_member(r.pair_id, auth.uid())));

CREATE TABLE public.game_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  idx integer NOT NULL,
  action jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, idx)
);
GRANT SELECT ON public.game_moves TO authenticated;
GRANT ALL ON public.game_moves TO service_role;
ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;
CREATE POLICY gm_select ON public.game_moves FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.game_sessions s JOIN public.rooms r ON r.id = s.room_id
    WHERE s.id = session_id AND public.is_pair_member(r.pair_id, auth.uid())));

-- ============ shared stats ============
CREATE TABLE public.pair_stats (
  pair_id uuid PRIMARY KEY REFERENCES public.pairs(id) ON DELETE CASCADE,
  streak integer NOT NULL DEFAULT 0,
  last_played_on date,
  nights_played integer NOT NULL DEFAULT 0,
  total_seconds integer NOT NULL DEFAULT 0,
  games_played jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pair_stats TO authenticated;
GRANT ALL ON public.pair_stats TO service_role;
ALTER TABLE public.pair_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY ps_select ON public.pair_stats FOR SELECT TO authenticated
  USING (public.is_pair_member(pair_id, auth.uid()));

-- ============ guess me question bank ============
CREATE TABLE public.guess_me_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  prompt text NOT NULL,
  options text[] NOT NULL,
  active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.guess_me_questions TO authenticated;
GRANT ALL ON public.guess_me_questions TO service_role;
ALTER TABLE public.guess_me_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY gmq_select ON public.guess_me_questions FOR SELECT TO authenticated USING (active);

INSERT INTO public.guess_me_questions (category, prompt, options) VALUES
 ('Food','What would {name} order at a brand new restaurant?', ARRAY['The safest thing on the menu','The weirdest thing on the menu','Whatever the waiter suggests','Exactly what you ordered']),
 ('Food','How does {name} take breakfast on a lazy morning?', ARRAY['Skips it entirely','Something heavy and hot','Just coffee or tea','Snacks straight from the fridge']),
 ('Food','{name} is stress-eating. What is it?', ARRAY['Something sweet','Something crunchy','Something spicy','A whole proper meal']),
 ('Habits','How does {name} react to a ringing phone from an unknown number?', ARRAY['Answers immediately','Lets it ring out','Googles the number','Texts back instead']),
 ('Habits','{name} has 20 free minutes. What happens?', ARRAY['Scrolls the phone','Naps','Tidies something','Texts you']),
 ('Habits','How early does {name} arrive for things?', ARRAY['Painfully early','Right on time','Five minutes late','Late and unbothered']),
 ('Habits','What is {name} most likely to lose?', ARRAY['Keys','Charger','Patience','Nothing, ever']),
 ('Past','What was {name} like at 15?', ARRAY['The quiet one','The loud one','The class clown','The one always in trouble']),
 ('Past','What is the first thing {name} remembers about you?', ARRAY['Your voice','Something you wore','Something you said','A photo']),
 ('Past','{name} first thought about you was...', ARRAY['This one is trouble','This one is cute','This one is funny','Nothing at all']),
 ('Future','Where does {name} want to live one day?', ARRAY['Somewhere loud and busy','Somewhere quiet and green','Right where they are','Anywhere near you']),
 ('Future','If {name} won a lot of money tomorrow?', ARRAY['Saves nearly all of it','Books a flight','Buys a car','Gives most of it away']),
 ('Future','What would {name} name a pet?', ARRAY['Something human','Something food-related','Something dramatic','Just Dog or Cat']),
 ('Silly','If {name} were an animal?', ARRAY['A cat','A dog','A bird','Something nobody expects']),
 ('Silly','{name} in a horror movie would...', ARRAY['Die first','Survive to the end','Be the villain','Never enter the house']),
 ('Silly','What sound does {name} make when surprised?', ARRAY['A scream','A laugh','Total silence','Something unrepeatable']),
 ('Silly','{name} sings in the shower?', ARRAY['Every single day','Only good days','Never','Not singing, talking']),
 ('Silly','If {name} had one superpower?', ARRAY['Teleporting to you','Reading minds','Stopping time','Never needing sleep']),
 ('Habits','How does {name} end a long day?', ARRAY['A show','A call with you','Straight to sleep','Doom-scrolling']),
 ('Future','What would {name} do with a free week?', ARRAY['Travel','Sleep','Learn something','Spend it all with you']);

-- ============ realtime ============
ALTER TABLE public.game_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.pairs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pairs;

-- ============ new-user trigger keeps display_name ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare base text; uname text; n int := 0;
begin
  base := coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1));
  base := regexp_replace(coalesce(base,'player'),'[^a-zA-Z0-9_]','','g');
  if length(base) < 3 then base := base || 'xo'; end if;
  uname := base;
  while exists (select 1 from public.profiles where username = uname) loop
    n := n+1; uname := base || n::text;
  end loop;
  insert into public.profiles (id, username, display_name)
  values (new.id, uname, coalesce(new.raw_user_meta_data->>'display_name', uname));
  return new;
end; $$;

-- profiles: only pair members (and self) can read
DROP POLICY IF EXISTS profiles_read_all ON public.profiles;
CREATE POLICY profiles_read_self_or_partner ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.pair_members a
      JOIN public.pair_members b ON b.pair_id = a.pair_id
      WHERE a.user_id = auth.uid() AND b.user_id = profiles.id
    )
  );