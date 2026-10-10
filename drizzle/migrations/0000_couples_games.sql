CREATE TABLE public.seen_prompts (
  scope_id uuid NOT NULL,
  game_key text NOT NULL,
  prompt text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope_id, game_key, prompt)
);
GRANT ALL ON public.seen_prompts TO service_role;
ALTER TABLE public.seen_prompts ENABLE ROW LEVEL SECURITY;

INSERT INTO public.games (key, name, tagline, sort_order, active) VALUES
  ('this-or-that', 'This or That', 'Two choices. Are you in sync?', 8, true),
  ('likely', 'Who''s More Likely', 'Point at each other. Agree, or argue.', 9, true),
  ('truth-dare', 'Truth or Dare', 'Sweet truths, playful dares.', 10, true),
  ('finish', 'Finish the Sentence', 'Little notes you''ll want to keep.', 11, true)
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, tagline = EXCLUDED.tagline, sort_order = EXCLUDED.sort_order, active = true;

UPDATE public.games SET active = false WHERE key IN ('cup-pong', 'fill-glass');