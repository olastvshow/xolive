import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

/**
 * Attaches the Supabase bearer token, refreshing it first when it is expired
 * or about to expire (replaces the generated attachSupabaseAuth, which can
 * send a stale token and make server functions fail with "JWT has expired").
 */
const attachFreshSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    if (typeof window === "undefined") return next();

    const { supabase } = await import("@/integrations/supabase/client");
    let token: string | undefined;
    try {
      const { data } = await supabase.auth.getSession();
      let session = data.session;
      const expiresAt = session?.expires_at ?? 0;
      // refresh when it expires within the next 60 seconds
      if (session && expiresAt * 1000 - Date.now() < 60_000) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        session = refreshed.session ?? session;
      }
      token = session?.access_token;
    } catch {
      // fall through without a token; the server will answer 401
    }

    return token
      ? next({ headers: { Authorization: `Bearer ${token}` } })
      : next();
  },
);

export const startInstance = createStart(() => ({
  functionMiddleware: [attachFreshSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));

