import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { heartbeat } from "@/lib/xo.functions";
import { useNativeShell } from "@/hooks/useNativeShell";
import { IncomingInviteModal } from "@/components/IncomingInviteModal";

function Splash() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-surface">
      <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingComponent: Splash,
  pendingMs: 0,
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw redirect({ to: "/auth" });
    return { user: session.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  useNativeShell();
  const beat = useServerFn(heartbeat);
  useEffect(() => {
    let alive = true;
    const tick = () => { if (alive) beat().catch(() => {}); };
    tick();
    const id = setInterval(tick, 20_000);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [beat]);
  return (<><Outlet /><IncomingInviteModal /></>);
}
