CREATE OR REPLACE FUNCTION public.is_pair_member(_pair_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id = auth.uid()
     AND EXISTS (SELECT 1 FROM public.pair_members
                 WHERE pair_id = _pair_id AND user_id = _user_id AND active);
$$;

CREATE OR REPLACE FUNCTION public.is_room_member(_room_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id = auth.uid() AND EXISTS (
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

REVOKE ALL ON FUNCTION public.is_pair_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_room_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_pair_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) TO authenticated;