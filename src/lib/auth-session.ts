import { supabase } from "@/integrations/supabase/client";

let refreshPromise: ReturnType<typeof supabase.auth.refreshSession> | null = null;

function expiresSoon(expiresAt?: number) {
  return !expiresAt || expiresAt * 1000 <= Date.now() + 60_000;
}

export async function getFreshSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  if (!expiresSoon(data.session.expires_at)) return data.session;

  refreshPromise ??= supabase.auth.refreshSession();
  try {
    const { data: refreshed, error: refreshError } = await refreshPromise;
    if (refreshError || !refreshed.session || expiresSoon(refreshed.session.expires_at)) {
      await supabase.auth.signOut({ scope: "local" });
      return null;
    }
    return refreshed.session;
  } finally {
    refreshPromise = null;
  }
}