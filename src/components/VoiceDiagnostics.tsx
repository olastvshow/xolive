import { useEffect, useState, type RefObject } from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

export type VoiceLogEntry = { id: number; t: number; msg: string; err?: boolean };

type Snapshot = {
  connection: string;
  ice: string;
  iceGathering: string;
  signaling: string;
  dtls: string;
  candidatePair: string;
  localCandidate: string;
  remoteCandidate: string;
  bytesReceived: number;
  bytesSent: number;
  audioPaused: string;
  audioMuted: string;
  micTracks: string;
};

const EMPTY: Snapshot = {
  connection: "—",
  ice: "—",
  iceGathering: "—",
  signaling: "—",
  dtls: "—",
  candidatePair: "—",
  localCandidate: "—",
  remoteCandidate: "—",
  bytesReceived: 0,
  bytesSent: 0,
  audioPaused: "—",
  audioMuted: "—",
  micTracks: "—",
};

function tone(v: string) {
  if (["connected", "completed", "stable", "live", "playing"].includes(v)) return "text-green-400";
  if (["failed", "closed", "disconnected"].includes(v)) return "text-red-400";
  if (v === "—") return "text-white/40";
  return "text-yellow-300";
}

export function VoiceDiagnostics({
  open,
  onClose,
  pcRef,
  audioRef,
  localStreamRef,
  voiceState,
  log,
  lastError,
  onRetry,
}: {
  open: boolean;
  onClose: () => void;
  pcRef: RefObject<RTCPeerConnection | null>;
  audioRef: RefObject<HTMLAudioElement | null>;
  localStreamRef: RefObject<MediaStream | null>;
  voiceState: string;
  log: VoiceLogEntry[];
  lastError: string | null;
  onRetry: () => void;
}) {
  const [snap, setSnap] = useState<Snapshot>(EMPTY);

  useEffect(() => {
    if (!open) return;
    let alive = true;

    const tick = async () => {
      const pc = pcRef.current;
      const el = audioRef.current;
      const stream = localStreamRef.current;
      const next: Snapshot = {
        ...EMPTY,
        connection: pc?.connectionState ?? "—",
        ice: pc?.iceConnectionState ?? "—",
        iceGathering: pc?.iceGatheringState ?? "—",
        signaling: pc?.signalingState ?? "—",
        audioPaused: el ? (el.srcObject ? (el.paused ? "paused" : "playing") : "no stream") : "—",
        audioMuted: el ? (el.muted ? "muted" : "on") : "—",
        micTracks: stream
          ? stream
              .getAudioTracks()
              .map((t) => `${t.readyState}${t.enabled ? "" : "/disabled"}`)
              .join(", ") || "none"
          : "none",
      };

      const sender = pc?.getSenders()[0] as (RTCRtpSender & { transport?: RTCDtlsTransport }) | undefined;
      next.dtls = sender?.transport?.state ?? "—";

      if (pc) {
        try {
          const stats = await pc.getStats();
          const byId = new Map<string, any>();
          stats.forEach((r: any) => byId.set(r.id, r));
          stats.forEach((r: any) => {
            if (r.type === "candidate-pair" && r.state === "succeeded" && r.nominated !== false) {
              const l = byId.get(r.localCandidateId);
              const rm = byId.get(r.remoteCandidateId);
              next.candidatePair = `${l?.candidateType ?? "?"} ⇄ ${rm?.candidateType ?? "?"}`;
              next.localCandidate = `${l?.candidateType ?? "?"} (${l?.protocol ?? "?"})`;
              next.remoteCandidate = `${rm?.candidateType ?? "?"} (${rm?.protocol ?? "?"})`;
            }
            if (r.type === "inbound-rtp" && r.kind === "audio") next.bytesReceived = r.bytesReceived ?? 0;
            if (r.type === "outbound-rtp" && r.kind === "audio") next.bytesSent = r.bytesSent ?? 0;
          });
        } catch {
          /* stats unavailable */
        }
      }
      if (alive) setSnap(next);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [open, pcRef, audioRef, localStreamRef]);

  if (!open) return null;

  const rows: [string, string][] = [
    ["Voice state", voiceState],
    ["Connection", snap.connection],
    ["ICE", snap.ice],
    ["ICE gathering", snap.iceGathering],
    ["Signaling", snap.signaling],
    ["DTLS", snap.dtls],
    ["Candidate pair", snap.candidatePair],
    ["Local candidate", snap.localCandidate],
    ["Remote candidate", snap.remoteCandidate],
    ["Audio element", snap.audioPaused],
    ["Speaker", snap.audioMuted],
    ["Mic tracks", snap.micTracks],
    ["Bytes recv / sent", `${snap.bytesReceived} / ${snap.bytesSent}`],
  ];

  const copy = () => {
    const text = [
      ...rows.map(([k, v]) => `${k}: ${v}`),
      `Last error: ${lastError ?? "none"}`,
      "--- log ---",
      ...log.map((l) => `${new Date(l.t).toLocaleTimeString()} ${l.err ? "! " : "  "}${l.msg}`),
    ].join("\n");
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-slide-up w-full max-w-md max-h-[85vh] overflow-y-auto hide-scrollbar rounded-t-3xl bg-inverse-surface text-inverse-on-surface p-4 pb-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <Icon name="graphic_eq" filled className="text-xl text-white/80" />
          <h2 className="font-bold tracking-wide text-white">Voice diagnostics</h2>
          <div className="flex-1" />
          <button onClick={copy} aria-label="Copy diagnostics" className="bubbly w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <Icon name="content_copy" className="text-lg text-white" />
          </button>
          <button onClick={onClose} aria-label="Close diagnostics" className="bubbly w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <Icon name="close" className="text-lg text-white" />
          </button>
        </div>

        <div className="rounded-2xl bg-white/5 divide-y divide-white/10 text-[13px]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-white/60">{k}</span>
              <span className={cn("font-mono font-semibold text-right break-all", tone(v))}>{v}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-2xl bg-white/5 px-3 py-2">
          <div className="text-white/60 text-[12px] mb-1">Last error</div>
          <div className={cn("font-mono text-[12px] break-all", lastError ? "text-red-400" : "text-white/40")}>
            {lastError ?? "none"}
          </div>
        </div>

        <div className="mt-3">
          <div className="text-white/60 text-[12px] mb-1">Event log</div>
          <div className="rounded-2xl bg-black/30 p-2 max-h-56 overflow-y-auto hide-scrollbar font-mono text-[11px] leading-relaxed">
            {log.length === 0 ? (
              <div className="text-white/40">No events yet.</div>
            ) : (
              log
                .slice()
                .reverse()
                .map((l) => (
                  <div key={l.id} className={l.err ? "text-red-400" : "text-white/70"}>
                    <span className="text-white/35">{new Date(l.t).toLocaleTimeString()} </span>
                    {l.msg}
                  </div>
                ))
            )}
          </div>
        </div>

        <button
          onClick={onRetry}
          className="bubbly mt-4 w-full bg-primary text-on-primary py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-[0_5px_0_#394086]"
        >
          <Icon name="refresh" filled /> Reconnect voice
        </button>
      </div>
    </div>
  );
}
