
REVOKE EXECUTE ON FUNCTION public.purchase_cosmetic(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_sensitive_profile_updates() FROM anon, authenticated, public;
