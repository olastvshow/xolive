import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { acceptInvite, declineInvite, getPendingInviteForMe } from "@/lib/xo.functions";
import { Icon } from "@/components/Icon";

type Invite = {
  room: { id: string; code: string; host_id: string };
  host: { id: string; username: string; avatar_url: string | null; wins: number; losses: number; draws: number } | null;
};

const AUTO_DECLINE_MS = 25_000;

export function IncomingInviteModal() {
  const navigate = useNavigate();
  const accept = useServerFn(acceptInvite);
  const decline = useServerFn(declineInvite);
  const getPending = useServerFn(getPendingInviteForMe);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const ensureFreshSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    if (expiresAt && expiresAt - Date.now() < 60_000) {
      const { data, error } = await supabase.auth.refreshSession();
      return !error && !!data.session;
    }

    return true;
  }, []);

  const callWithRefresh = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      const hasSession = await ensureFreshSession();
      if (!hasSession) return null;
      return await fn();
    } catch (e) {
      const msg = (e as Error)?.message ?? "";
      if (/JWT|expired|Unauthorized|401/i.test(msg)) {
        try { await supabase.auth.refreshSession(); } catch { /* ignore */ }
        try { return await fn(); } catch { return null; }
      }
      return null;
    }
  }, [ensureFreshSession]);

  const refresh = useCallback(async () => {
    const inv = await callWithRefresh(() => getPending());
    if (inv && (inv as Invite).host) setInvite(inv as Invite);
  }, [getPending, callWithRefresh]);

  // Initial fetch + 5s poll fallback
  useEffect(() => {
    if (!userId) return;
    refresh();
    const id = setInterval(refresh, 5000);
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [userId, refresh]);

  // Realtime: listen for rooms updates where pending_guest_id = me
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`invites-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `pending_guest_id=eq.${userId}` },
        () => { refresh(); },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rooms", filter: `pending_guest_id=eq.${userId}` },
        () => { refresh(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, refresh]);

  // Auto-decline after timeout
  useEffect(() => {
    if (!invite) return;
    const t = setTimeout(async () => {
      try { await decline({ data: { roomId: invite.room.id } }); } catch { /* ignore */ }
      setInvite(null);
    }, AUTO_DECLINE_MS);
    return () => clearTimeout(t);
  }, [invite, decline]);

  if (!invite || !invite.host) return null;

  const handleAccept = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const room = await callWithRefresh(() => accept({ data: { roomId: invite.room.id } }));
      if (!room) throw new Error("Session expired");
      setInvite(null);
      navigate({ to: "/game", search: { code: room.code, quick: true } as never });
    } catch { setBusy(false); }
  };

  const handleDecline = async () => {
    if (busy) return;
    setBusy(true);
    try { await callWithRefresh(() => decline({ data: { roomId: invite.room.id } })); } catch { /* ignore */ }
    setInvite(null);
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-slide-up">
      <div className="w-full max-w-sm bg-surface rounded-3xl p-6 shadow-2xl text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/15 text-primary flex items-center justify-center mb-3 animate-pop-in">
          <Icon name="sports_esports" className="text-3xl" filled />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
          Incoming match invite
        </p>
        <div className="my-4 flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-primary/30 bg-primary-container flex items-center justify-center text-on-primary-container font-black text-2xl">
            {invite.host.avatar_url
              ? <img src={invite.host.avatar_url} alt="" className="w-full h-full object-cover" />
              : invite.host.username?.[0]?.toUpperCase() ?? "?"}
          </div>
          <h2 className="text-xl font-black text-on-surface">@{invite.host.username}</h2>
          <p className="text-xs text-on-surface-variant">
            {invite.host.wins}W · {invite.host.losses}L · {invite.host.draws}D
          </p>
          <p className="text-sm text-on-surface-variant">wants to play with you</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDecline}
            disabled={busy}
            className="flex-1 py-3 rounded-2xl bg-surface-container-highest text-on-surface font-bold active:scale-[0.98] disabled:opacity-50"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            disabled={busy}
            className="flex-1 py-3 rounded-2xl bg-primary text-on-primary font-bold active:scale-[0.98] disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
