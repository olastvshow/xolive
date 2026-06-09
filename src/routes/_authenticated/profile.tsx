import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { getMyProfile, updateProfile, cancelAccountDeletion, checkAccountStatus } from "@/lib/xo.functions";
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
  const cancelDelFn = useServerFn(cancelAccountDeletion);
  const statusFn = useServerFn(checkAccountStatus);
  const { data: p } = useQuery({ queryKey: ["profile"], queryFn: () => fn(), retry: false });
  const { data: status } = useQuery({ queryKey: ["account-status"], queryFn: () => statusFn(), retry: false });
  useEffect(() => {
    if (status?.purged) {
      supabase.auth.signOut().then(() => navigate({ to: "/auth", replace: true }));
    }
  }, [status?.purged, navigate]);
  const scheduledAt = status?.deletion_scheduled_at ?? null;
  const graceDays = status?.grace_days ?? 30;
  const daysLeft = scheduledAt
    ? Math.max(0, Math.ceil(graceDays - (Date.now() - new Date(scheduledAt).getTime()) / 86400000))
    : 0;
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
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const joined = p?.created_at ? new Date(p.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : null;

  return (
    <Shell>
      <div className="space-y-4 pb-4">
        {/* Hero card */}
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-tertiary text-on-primary px-5 pt-5 pb-5 shadow-lg">
          <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-white/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-12 w-52 h-52 rounded-full bg-secondary/30 blur-3xl pointer-events-none" />

          <div className="relative flex items-center gap-4">
            <button
              onClick={() => setPickerOpen(true)}
              className="relative w-20 h-20 shrink-0 rounded-2xl bg-white/10 p-1 ring-2 ring-white/60 shadow-md active:scale-95 transition"
              aria-label="Change avatar"
            >
              <Avatar url={p?.avatar_url ?? null} name={p?.username} className="w-full h-full rounded-xl text-2xl" />
              <span className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-on-surface text-surface flex items-center justify-center shadow-md ring-2 ring-white">
                <Icon name="photo_camera" className="text-[14px]" filled />
              </span>
            </button>

            <div className="flex-1 min-w-0">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="group flex items-center gap-1.5 max-w-full text-left"
                  aria-label="Edit username"
                >
                  <h1 className="text-xl font-black tracking-tight truncate">@{p?.username ?? "—"}</h1>
                  <Icon name="edit" className="text-[14px] opacity-70 group-active:scale-90 transition" filled />
                </button>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-black opacity-70">@</span>
                    <input
                      ref={inputRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submit();
                        if (e.key === "Escape") setEditing(false);
                      }}
                      maxLength={24}
                      className="flex-1 min-w-0 bg-white/15 text-white placeholder:text-white/50 font-bold text-base rounded-lg px-2.5 py-1 outline-none ring-2 ring-white/60 focus:ring-white"
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
                <>
                  <p className="text-xs font-medium opacity-90 mt-0.5 truncate">Tactical XO Strategist</p>
                  {joined && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-white/15 text-[10px] font-bold uppercase tracking-widest">
                      Joined {joined}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Summary badges */}
          <div className="relative mt-4 grid grid-cols-2 gap-2.5">
            <SummaryTile icon="paid" label="Balance" value={(p?.coins ?? 0).toLocaleString()} />
            <SummaryTile icon="trophy" label="Win rate" value={`${winRate}%`} />
          </div>
        </header>

        {p?.id && (
          <AvatarPicker open={pickerOpen} onClose={() => setPickerOpen(false)} currentUrl={p.avatar_url ?? null} userId={p.id} />
        )}

        {/* Stats */}
        <section className="grid grid-cols-3 gap-2">
          <Stat label="Wins" value={p?.wins ?? 0} tone="text-primary" />
          <Stat label="Losses" value={p?.losses ?? 0} tone="text-error" />
          <Stat label="Draws" value={p?.draws ?? 0} tone="text-on-surface" />
        </section>

        {/* Performance */}
        <section className="bg-surface-container-low ring-1 ring-outline-variant/60 p-4 rounded-2xl">
          <div className="flex items-end justify-between mb-3">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Performance</h3>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Based on {total} {total === 1 ? "match" : "matches"}</p>
            </div>
            <span className="text-2xl font-black text-primary tabular-nums leading-none">{winRate}%</span>
          </div>
          <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-secondary to-primary transition-all duration-700 rounded-full"
              style={{ width: `${winRate}%` }}
            />
          </div>
        </section>

        {/* Deletion banner */}
        {scheduledAt && (
          <div className="rounded-2xl bg-error/10 ring-1 ring-error/30 p-4">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 shrink-0 rounded-full bg-error/15 text-error flex items-center justify-center">
                <Icon name="schedule" className="text-[20px]" filled />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-on-surface">Account deletion scheduled</p>
                <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                  Permanently deleted in <span className="font-bold text-error">{daysLeft} day{daysLeft === 1 ? "" : "s"}</span>. Restore it any time before then.
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                await cancelDelFn();
                qc.invalidateQueries({ queryKey: ["account-status"] });
              }}
              className="mt-3 w-full py-2.5 rounded-xl bg-on-surface text-surface text-sm font-bold active:scale-[0.98]"
            >
              Restore account
            </button>
          </div>
        )}

        {/* Legal */}
        <section className="bg-surface-container-low ring-1 ring-outline-variant/60 rounded-2xl overflow-hidden divide-y divide-outline-variant/40">
          <ActionRow
            icon="shield_person"
            label="Privacy Policy"
            hint="How we handle your data"
            onClick={() => navigate({ to: "/privacy" })}
          />
          <ActionRow
            icon="gavel"
            label="Terms of Service"
            hint="Rules for using XO Live"
            onClick={() => navigate({ to: "/terms" })}
          />
        </section>

        {/* Account list */}
        <section className="bg-surface-container-low ring-1 ring-outline-variant/60 rounded-2xl overflow-hidden divide-y divide-outline-variant/40">
          <ActionRow
            icon="logout"
            label="Sign out"
            hint="End this session"
            onClick={signOut}
          />
          {!scheduledAt && (
          <ActionRow
            icon="delete_forever"
            label="Delete account"
            hint={`Recoverable for ${graceDays} days`}
            tone="error"
            onClick={() => navigate({ to: "/delete-account" })}
          />
          )}
        </section>

        {!scheduledAt && (
          <p className="text-[11px] text-on-surface-variant text-center px-4 leading-relaxed">
            Deleting your account permanently removes your profile, stats, coins, and private chats after {graceDays} days. Public game records are anonymized.
          </p>
        )}
      </div>


      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto" onClick={() => !deleting && setConfirmDelete(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-surface rounded-3xl p-5 sm:p-6 shadow-2xl my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="mx-auto w-14 h-14 rounded-full bg-error/10 text-error flex items-center justify-center mb-3">
              <Icon name="warning" className="text-3xl" filled />
            </div>
            <h2 className="text-xl font-black text-center text-on-surface">Delete your account?</h2>
            <p className="text-sm text-on-surface-variant text-center mt-2 leading-relaxed">
              <span className="font-bold text-on-surface">@{p?.username}</span> will be deactivated immediately and permanently deleted after{" "}
              <span className="font-bold text-on-surface">{graceDays} days</span>. Sign back in any time during that window to restore your account.
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
                Keep account
              </button>
              <button
                disabled={deleteText !== "DELETE" || deleting}
                onClick={async () => {
                  setDeleting(true); setDeleteErr(null);
                  try {
                    await deleteFn();
                    qc.clear();
                    await supabase.auth.signOut();
                    navigate({ to: "/auth", replace: true });
                  } catch (e) {
                    setDeleteErr(e instanceof Error ? e.message : "Could not delete account");
                    setDeleting(false);
                  }
                }}
                className="flex-1 py-3 rounded-2xl bg-error text-on-error font-bold text-sm active:scale-[0.98] disabled:opacity-50"
              >
                {deleting ? "Scheduling…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function SummaryTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 backdrop-blur px-3 py-2.5 ring-1 ring-white/20">
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <Icon name={icon} className="text-[16px]" filled />
        <span className="text-base font-black tabular-nums leading-none">{value}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="p-3 rounded-2xl bg-surface-container-low ring-1 ring-outline-variant/60 flex flex-col items-center text-center">
      <div className={cn("text-2xl font-black leading-none tabular-nums", tone)}>{value}</div>
      <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1.5">{label}</div>
    </div>
  );
}

function ActionRow({
  icon, label, hint, onClick, tone,
}: { icon: string; label: string; hint?: string; onClick: () => void; tone?: "error" }) {
  const isError = tone === "error";
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-surface-container transition-colors cursor-pointer"
    >
      <span className={cn(
        "w-10 h-10 shrink-0 rounded-xl flex items-center justify-center",
        isError ? "bg-error/10 text-error" : "bg-surface-container-highest text-on-surface-variant"
      )}>
        <Icon name={icon} className="text-[20px]" filled />
      </span>
      <span className="flex-1 min-w-0">
        <span className={cn("block text-sm font-bold leading-tight", isError ? "text-error" : "text-on-surface")}>{label}</span>
        {hint && <span className="block text-[11px] text-on-surface-variant mt-0.5">{hint}</span>}
      </span>
      <Icon name="chevron_right" className="text-on-surface-variant text-[20px]" />
    </button>
  );
}

