import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { heartbeat } from "@/lib/xo.functions";
import { useNativeShell } from "@/hooks/useNativeShell";
import { IncomingInviteModal } from "@/components/IncomingInviteModal";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
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
