
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS pending_guest_id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_rooms_pending_guest_id ON public.rooms(pending_guest_id);
