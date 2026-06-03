import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { getMyProfile, updateProfile, deleteMyAccount } from "@/lib/xo.functions";
import { supabase } from "@/integrations/supabase/client";
import { AvatarPicker, Avatar } from "@/components/AvatarPicker";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "XO Live — Profile" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fn = useServerFn(getMyProfile);
  const updateFn = useServerFn(updateProfile);
  const deleteFn = useServerFn(deleteMyAccount);
  const { data: p } = useQuery({ queryKey: ["profile"], queryFn: () => fn() });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const total = (p?.wins ?? 0) + (p?.losses ?? 0) + (p?.draws ?? 0);
  const winRate = total ? Math.round(((p?.wins ?? 0) / total) * 100) : 0;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(p?.username ?? "");
      setErr(null);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editing, p?.username]);

  const saveUsername = useMutation({
    mutationFn: async (username: string) => updateFn({ data: { username } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile"] });
      setEditing(false);
    },
    onError: (e: Error) => {
      const msg = e.message?.includes("duplicate") || e.message?.includes("unique")
        ? "That username is taken"
        : e.message?.includes("Validation") || e.message?.includes("regex") || e.message?.includes("min") || e.message?.includes("max")
        ? "3–24 letters, numbers, or _"
        : e.message ?? "Could not update";
      setErr(msg);
    },
  });

  const submit = () => {
    setErr(null);
    const v = draft.trim();
    if (v === p?.username) { setEditing(false); return; }
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(v)) { setErr("3–24 letters, numbers, or _"); return; }
    saveUsername.mutate(v);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const joined = p?.created_at ? new Date(p.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : null;

  return (
    <Shell>
      <div className="space-y-5 pb-4">
        {/* Hero */}
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-secondary text-on-primary px-5 pt-6 pb-5 shadow-[0_8px_0_rgba(0,0,0,0.12)]">
          <div className="absolute -top-16 -right-12 w-48 h-48 rounded-full bg-white/15 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-44 h-44 rounded-full bg-secondary/40 blur-2xl pointer-events-none" />

          <div className="relative flex items-center gap-4">
            <button
              onClick={() => setPickerOpen(true)}
              className="relative w-24 h-24 rounded-full bg-white/15 p-1 border-4 border-white/80 shadow-lg active:scale-95 transition"
              aria-label="Change avatar"
            >
              <Avatar url={p?.avatar_url ?? null} name={p?.username} className="w-full h-full text-3xl" />
              <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-md ring-2 ring-white">
                <Icon name="photo_camera" className="text-[16px]" filled />
              </span>
            </button>

            <div className="flex-1 min-w-0">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="group flex items-center gap-1.5 max-w-full text-left"
                  aria-label="Edit username"
                >
                  <h1 className="text-2xl font-black truncate">@{p?.username ?? "—"}</h1>
                  <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-active:scale-90 transition">
                    <Icon name="edit" className="text-[15px]" filled />
                  </span>
                </button>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-black opacity-70">@</span>
                    <input
                      ref={inputRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submit();
                        if (e.key === "Escape") setEditing(false);
                      }}
                      maxLength={24}
                      className="flex-1 min-w-0 bg-white/15 text-white placeholder:text-white/50 font-bold text-lg rounded-xl px-3 py-1.5 outline-none ring-2 ring-white/60 focus:ring-white"
                      placeholder="username"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={submit}
                      disabled={saveUsername.isPending}
                      className="px-3 py-1 rounded-full bg-white text-primary text-xs font-bold shadow active:scale-95 disabled:opacity-60"
                    >
                      {saveUsername.isPending ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold active:scale-95"
                    >
                      Cancel
                    </button>
                    {err && <span className="text-[11px] font-semibold text-yellow-200">{err}</span>}
                  </div>
                </div>
              )}
              {!editing && (
                <p className="text-sm font-medium opacity-90 mt-0.5 truncate">Tactical XO Strategist ♟️</p>
              )}
            </div>
          </div>

          <div className="relative mt-4 flex flex-wrap items-center gap-2">
            <Chip icon="paid" label={`${p?.coins ?? 0} coins`} />
            {joined && <Chip icon="event" label={`Joined ${joined}`} />}
            <Chip icon="trophy" label={`${winRate}% win`} />
          </div>
        </header>

        {p?.id && (
          <AvatarPicker open={pickerOpen} onClose={() => setPickerOpen(false)} currentUrl={p.avatar_url ?? null} userId={p.id} />
        )}

        {/* Stats */}
        <section className="grid grid-cols-3 gap-2.5">
          <Stat label="Wins" value={p?.wins ?? 0} icon="emoji_events" tint="bg-primary-container text-on-primary-container" />
          <Stat label="Losses" value={p?.losses ?? 0} icon="close" tint="bg-error/10 text-error" />
          <Stat label="Draws" value={p?.draws ?? 0} icon="handshake" tint="bg-secondary-container text-on-secondary-container" />
        </section>

        {/* Win rate ring */}
        <section className="bg-surface-container-highest p-5 rounded-3xl">
          <div className="flex items-center gap-4">
            <WinRateRing percent={winRate} />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">Win rate</h2>
              <p className="text-2xl font-black text-primary leading-tight">{winRate}%</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {total} {total === 1 ? "game" : "games"} played
              </p>
            </div>
          </div>
          <div className="mt-4 w-full h-2.5 bg-surface rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-secondary to-primary transition-all duration-700"
              style={{ width: `${winRate}%` }}
            />
          </div>
        </section>

        {/* Account actions */}
        <div className="space-y-2.5">
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-surface-container-highest text-on-surface rounded-2xl text-sm font-bold tracking-wider active:scale-[0.98]"
          >
            <Icon name="logout" className="text-[18px]" /> Sign out
          </button>
          <button
            onClick={() => { setConfirmDelete(true); setDeleteText(""); setDeleteErr(null); }}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-error/10 text-error rounded-2xl text-sm font-bold tracking-wider active:scale-[0.98]"
          >
            <Icon name="delete_forever" className="text-[18px]" filled /> Delete account
          </button>
          <p className="text-[11px] text-on-surface-variant text-center px-4 leading-relaxed">
            Deleting your account permanently removes your profile, stats, coins, and chat history. This action can't be undone.
          </p>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => !deleting && setConfirmDelete(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-surface rounded-3xl p-6 shadow-2xl">
            <div className="mx-auto w-14 h-14 rounded-full bg-error/10 text-error flex items-center justify-center mb-3">
              <Icon name="warning" className="text-3xl" filled />
            </div>
            <h2 className="text-xl font-black text-center text-on-surface">Delete your account?</h2>
            <p className="text-sm text-on-surface-variant text-center mt-2 leading-relaxed">
              This permanently deletes <span className="font-bold text-on-surface">@{p?.username}</span>, all stats, coins, and chat history. This can't be undone.
            </p>
            <label className="block text-xs font-bold text-on-surface-variant mt-5 mb-1.5">Type <span className="text-error">DELETE</span> to confirm</label>
            <input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="DELETE"
              className="w-full h-12 px-3.5 rounded-2xl bg-surface-container ring-1 ring-outline-variant focus:ring-error outline-none font-bold tracking-widest text-center"
            />
            {deleteErr && <p className="text-xs text-error font-semibold mt-2 text-center">{deleteErr}</p>}
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 py-3 rounded-2xl bg-surface-container-highest text-on-surface font-bold text-sm active:scale-[0.98] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                disabled={deleteText !== "DELETE" || deleting}
                onClick={async () => {
                  setDeleting(true); setDeleteErr(null);
                  try {
                    await deleteFn();
                    await supabase.auth.signOut();
                    navigate({ to: "/auth", replace: true });
                  } catch (e) {
                    setDeleteErr(e instanceof Error ? e.message : "Could not delete account");
                    setDeleting(false);
                  }
                }}
                className="flex-1 py-3 rounded-2xl bg-error text-on-error font-bold text-sm active:scale-[0.98] disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Chip({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-[11px] font-bold uppercase tracking-wider">
      <Icon name={icon} className="text-[14px]" filled />
      {label}
    </span>
  );
}

function Stat({ label, value, icon, tint }: { label: string; value: number; icon: string; tint: string }) {
  return (
    <div className={cn("p-3 rounded-2xl flex flex-col items-center text-center", tint)}>
      <Icon name={icon} className="text-xl mb-0.5" filled />
      <div className="text-2xl font-black leading-none tabular-nums">{value}</div>
      <div className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}

function WinRateRing({ percent }: { percent: number }) {
  const size = 72;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-surface" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="text-primary transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon name="trophy" className="text-primary text-xl" filled />
      </div>
    </div>
  );
}
