import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { heartbeat } from "@/lib/pairplay.functions";
import { useNativeShell } from "@/hooks/useNativeShell";
import { getFreshSession } from "@/lib/auth-session";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const session = await getFreshSession();
    if (!session?.user) throw redirect({ to: "/auth" });
    return { user: session.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  useNativeShell();
  const navigate = useNavigate();
  useEffect(() => {
    if (localStorage.getItem("duet-join") && window.location.pathname !== "/pair") {
      navigate({ to: "/pair", replace: true });
    }
  }, [navigate]);
  const beat = useServerFn(heartbeat);
  useEffect(() => {
    let alive = true;
    const tick = () => { if (alive) beat().catch(() => {}); };
    tick();
    const id = setInterval(tick, 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [beat]);
  return <Outlet />;
}
