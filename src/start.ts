import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("JWT has expired") || message.startsWith("Unauthorized:")) {
      throw new Response("Unauthorized", { status: 401 });
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

    const { getFreshSession } = await import("@/lib/auth-session");
    const session = await getFreshSession();
    const token = session?.access_token;

    return token
      ? next({ headers: { Authorization: `Bearer ${token}` } })
      : next();
  },
);

export const startInstance = createStart(() => ({
  functionMiddleware: [attachFreshSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));

