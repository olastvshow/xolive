import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useRoom } from "./RoomProvider";
import { Avatar } from "@/components/AvatarPicker";
import { Glyph } from "@/components/Glyph";
import { cn } from "@/lib/utils";

function Ring({
  level, tone, children, dim,
}: { level: { current: number }; tone: "me" | "them"; children: React.ReactNode; dim?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const el = ref.current;
      if (el) {
        const v = level.current;
        el.style.transform = `scale(${1 + v * 0.16})`;
        el.style.opacity = String(0.3 + v * 0.7);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [level]);
  return (
    <div className="relative">
      <div
        ref={ref}
        className={cn("absolute -inset-1 rounded-full", tone === "me" ? "bg-pop/30" : "bg-knowus/30")}
        style={{ filter: "blur(6px)" }}
      />
      <div
        className={cn(
          "relative h-10 w-10 overflow-hidden rounded-full border",
          tone === "me" ? "border-pop/60" : "border-knowus/60",
          dim && "opacity-40 grayscale",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function lastSeen(iso?: string | null) {
  if (!iso) return "offline";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function RoomHeader({
  onLeave, leaveLabel,
}: { onLeave?: () => void; leaveLabel?: string }) {
  const { me, partner, partnerOnline, voice } = useRoom();

  const status = partnerOnline
    ? voice.state === "live" ? "voice on"
      : voice.state === "blocked" ? "mic blocked"
      : voice.state === "failed" ? "voice failed"
      : "connecting voice…"
    : lastSeen(partner.last_seen_at);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/6 bg-night/85 px-4 py-3 backdrop-blur">
      <Link
        to="/"
        aria-label="Go back"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-night-2 text-ink/60 press"
      >
        <Glyph name="left" size={18} />
      </Link>

      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="flex -space-x-2">
          <Ring level={voice.myLevel} tone="me">
            <Avatar url={me.avatar_url} name={me.display_name ?? me.username} className="h-full w-full" />
          </Ring>
          <Ring level={voice.theirLevel} tone="them" dim={!partnerOnline}>
            <Avatar url={partner.avatar_url} name={partner.display_name ?? partner.username} className="h-full w-full" />
          </Ring>
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-bold">{partner.display_name ?? partner.username}</p>
          <p className={cn("truncate text-[11px]", partnerOnline ? "text-pop" : "text-ink/40")}>{status}</p>
        </div>
      </div>

      {(voice.state === "failed" || voice.state === "blocked") && (
        <button
          onClick={voice.retry}
          className="h-9 shrink-0 rounded-full bg-white/6 px-3 text-[11px] font-bold uppercase tracking-[0.15em] text-ink/70 press"
        >
          Retry
        </button>
      )}

      {onLeave && (
        <button
          onClick={onLeave}
          aria-label={leaveLabel ?? "Leave room"}
          title={leaveLabel ?? "Leave room"}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/5 text-ink/50 press hover:text-knowus"
        >
          <Glyph name="exit" size={18} />
        </button>
      )}
    </header>
  );
}
