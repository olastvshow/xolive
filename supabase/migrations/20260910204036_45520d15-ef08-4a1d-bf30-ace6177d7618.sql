REVOKE ALL ON FUNCTION public.is_pair_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_pair_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_pair_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_pair_id() TO authenticated;