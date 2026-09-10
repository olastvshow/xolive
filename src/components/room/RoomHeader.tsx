import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useRoom } from "./RoomProvider";
import { Avatar } from "@/components/AvatarPicker";
import { Icon } from "@/components/Icon";
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
        el.style.opacity = String(0.35 + v * 0.65);
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
        className={cn(
          "absolute -inset-1.5 rounded-full transition-none",
          tone === "me" ? "bg-me/30" : "bg-them/30",
        )}
        style={{ filter: "blur(6px)" }}
      />
      <div
        className={cn(
          "relative w-16 h-16 rounded-full overflow-hidden border-2",
          tone === "me" ? "border-me" : "border-them",
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
  if (hrs < 24) return `was here ${hrs}h ago`;
  return `was here ${Math.floor(hrs / 24)}d ago`;
}

export function RoomHeader() {
  const { me, partner, partnerOnline, voice, knock } = useRoom();

  return (
    <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
      <div className="flex items-center gap-3">
        <Ring level={voice.myLevel} tone="me">
          <Avatar url={me.avatar_url} name={me.display_name ?? me.username} className="w-full h-full" />
        </Ring>
        <div className="text-xl text-ink/25 font-light">·</div>
        <Ring level={voice.theirLevel} tone="them" dim={!partnerOnline}>
          <Avatar url={partner.avatar_url} name={partner.display_name ?? partner.username} className="w-full h-full" />
        </Ring>
        <div className="leading-tight">
          <p className="text-ink font-semibold text-base">
            {partner.display_name ?? partner.username}
          </p>
          <p className={cn("text-xs", partnerOnline ? "text-them" : "text-ink/40")}>
            {partnerOnline
              ? voice.state === "live" ? "voice on"
                : voice.state === "blocked" ? "mic blocked"
                : voice.state === "failed" ? "voice failed"
                : "connecting voice…"
              : lastSeen(partner.last_seen_at)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {partnerOnline ? (
          <>
            {(voice.state === "failed" || voice.state === "blocked") && (
              <button
                onClick={voice.retry}
                className="rounded-full bg-night-3 px-3 py-2 text-xs font-semibold text-ink active:scale-95"
              >
                retry
              </button>
            )}
            <button
              onClick={voice.toggleMute}
              aria-label={voice.muted ? "Unmute" : "Mute"}
              className={cn(
                "w-11 h-11 rounded-full grid place-items-center active:scale-95 transition",
                voice.muted ? "bg-night-3 text-ink/50" : "bg-me/20 text-me",
              )}
            >
              <Icon name={voice.muted ? "mic_off" : "mic"} />
            </button>
          </>
        ) : (
          <button
            onClick={knock}
            className="rounded-full bg-them/20 text-them px-4 py-2.5 text-sm font-bold active:scale-95"
          >
            Knock
          </button>
        )}
        <Link
          to="/profile"
          aria-label="Profile"
          className="w-11 h-11 rounded-full grid place-items-center bg-night-3 text-ink/70 active:scale-95"
        >
          <Icon name="settings" />
        </Link>
      </div>
    </header>
  );
}
