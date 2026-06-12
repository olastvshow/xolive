import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { heartbeat } from "@/lib/xo.functions";
import { useNativeShell } from "@/hooks/useNativeShell";
import { IncomingInviteModal } from "@/components/IncomingInviteModal";

function Splash() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-surface text-on-surface gap-3">
      <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      <p className="text-sm font-semibold text-on-surface-variant">Loading XO Live…</p>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingComponent: Splash,
  pendingMs: 0,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const { data: anon, error: anonErr } = await supabase.auth.signInAnonymously();
      if (anonErr || !anon.user) throw redirect({ to: "/auth" });
      return { user: anon.user };
    }
    return { user: data.user };
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
