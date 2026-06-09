import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { getMyProfile, deleteMyAccount, checkAccountStatus } from "@/lib/xo.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/delete-account")({
  head: () => ({ meta: [{ title: "XO Live — Delete Account" }] }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profileFn = useServerFn(getMyProfile);
  const deleteFn = useServerFn(deleteMyAccount);
  const statusFn = useServerFn(checkAccountStatus);

  const { data: p } = useQuery({ queryKey: ["profile"], queryFn: () => profileFn(), retry: false });
  const { data: status } = useQuery({ queryKey: ["account-status"], queryFn: () => statusFn(), retry: false });

  const scheduledAt = status?.deletion_scheduled_at ?? null;
  const graceDays = status?.grace_days ?? 30;
  const daysLeft = scheduledAt
    ? Math.max(0, Math.ceil(graceDays - (Date.now() - new Date(scheduledAt).getTime()) / 86400000))
    : 0;

  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  if (scheduledAt) {
    return (
      <Shell>
        <div className="max-w-md mx-auto space-y-6 pt-6 px-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center">
            <Icon name="schedule" className="text-3xl" filled />
          </div>
          <h1 className="text-2xl font-black text-center text-on-surface">Deletion scheduled</h1>
          <p className="text-sm text-on-surface-variant text-center leading-relaxed">
            Your account <span className="font-bold text-on-surface">@{p?.username}</span> is queued for permanent deletion in{" "}
            <span className="font-bold text-error">{daysLeft} day{daysLeft === 1 ? "" : "s"}</span>.
            Sign back in any time before then to restore it.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth", replace: true });
            }}
            className="w-full py-3 rounded-2xl bg-on-surface text-surface font-bold text-sm active:scale-[0.98]"
          >
            Sign out
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="max-w-md mx-auto space-y-6 pt-6 px-4 pb-8">
        <button
          onClick={() => navigate({ to: "/profile" })}
          className="flex items-center gap-1 text-sm font-bold text-on-surface-variant active:scale-95 transition"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          Back to profile
        </button>

        <div className="mx-auto w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center">
          <Icon name="warning" className="text-3xl" filled />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-black text-on-surface">Delete account</h1>
          <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
            Permanently remove <span className="font-bold text-on-surface">@{p?.username ?? "your account"}</span> from XO Live.
          </p>
        </div>

        <section className="bg-surface-container-low ring-1 ring-outline-variant/60 rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">What happens</h3>
          <ul className="space-y-2 text-sm text-on-surface-variant">
            <li className="flex items-start gap-2">
              <Icon name="check" className="text-primary text-[18px] shrink-0 mt-0.5" filled />
              <span>Profile, stats, coins, and private chats are removed after <span className="font-bold text-on-surface">{graceDays} days</span></span>
            </li>
            <li className="flex items-start gap-2">
              <Icon name="check" className="text-primary text-[18px] shrink-0 mt-0.5" filled />
              <span>Public game records are anonymized</span>
            </li>
            <li className="flex items-start gap-2">
              <Icon name="check" className="text-primary text-[18px] shrink-0 mt-0.5" filled />
              <span>Sign back in during the grace period to restore everything instantly</span>
            </li>
          </ul>
        </section>

        <label className="block text-xs font-bold text-on-surface-variant mt-6 mb-1.5">
          Type <span className="text-error">DELETE</span> to confirm
        </label>
        <input
          value={deleteText}
          onChange={(e) => setDeleteText(e.target.value)}
          placeholder="DELETE"
          className="w-full h-12 px-3.5 rounded-2xl bg-surface-container ring-1 ring-outline-variant focus:ring-error outline-none font-bold tracking-widest text-center"
        />
        {deleteErr && <p className="text-xs text-error font-semibold mt-2 text-center">{deleteErr}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => navigate({ to: "/profile" })}
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
            {deleting ? "Scheduling…" : "Delete account"}
          </button>
        </div>
      </div>
    </Shell>
  );
}
