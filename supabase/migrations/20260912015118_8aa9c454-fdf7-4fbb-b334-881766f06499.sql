INSERT INTO public.games (key, name, tagline, sort_order, active) VALUES
  ('cup-pong', 'Cup Pong', 'Sink every cup on the far side.', 6, true),
  ('table-tennis', 'Table Tennis', 'Rally, serve, win by two.', 7, true)
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, tagline = EXCLUDED.tagline, sort_order = EXCLUDED.sort_order, active = true;