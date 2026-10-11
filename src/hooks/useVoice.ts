import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceState = "idle" | "connecting" | "live" | "failed" | "blocked";

export type SignalBus = {
  handler: ((payload: VoicePayload) => void) | null;
  send: (payload: VoicePayload) => void;
};

export type VoicePayload =
  | { kind: "hello"; from: string }
  | { kind: "offer"; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: "answer"; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: "ice"; from: string; candidate: RTCIceCandidateInit };

const ICE: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] },
    {
      urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443", "turns:openrelay.metered.ca:443"],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 2,
};

/** Clearer speech: in-band error correction, mono, 32 kbps Opus. */
function tuneOpus(sdp: RTCSessionDescriptionInit): RTCSessionDescriptionInit {
  if (!sdp.sdp) return sdp;
  const m = sdp.sdp.match(/a=rtpmap:(\d+) opus\/48000/i);
  if (!m) return sdp;
  const pt = m[1];
  const re = new RegExp(`a=fmtp:${pt} ([^\r\n]*)`);
  const extra = "useinbandfec=1;stereo=0;maxaveragebitrate=32000";
  const out = re.test(sdp.sdp)
    ? sdp.sdp.replace(re, (_l, p: string) => `a=fmtp:${pt} ${p.includes("useinbandfec") ? p : `${p};${extra}`}`)
    : sdp.sdp.replace(m[0], `${m[0]}\r\na=fmtp:${pt} ${extra}`);
  return { type: sdp.type, sdp: out };
}

export function useVoice(opts: {
  bus: SignalBus;
  myId: string;
  isOfferer: boolean;
  partnerOnline: boolean;
  enabled: boolean;
}) {
  const { bus, myId, isOfferer, partnerOnline, enabled } = opts;
  const [state, setState] = useState<VoiceState>("idle");
  const [muted, setMuted] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingRef = useRef<RTCIceCandidateInit[]>([]);
  const makingOfferRef = useRef(false);
  const mutedRef = useRef(false);
  const recoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoverRef = useRef<() => void>(() => {});
  const myLevel = useRef(0);
  const theirLevel = useRef(0);
  const ctxRef = useRef<AudioContext | null>(null);

  const meter = useCallback((stream: MediaStream, target: { current: number }) => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = ctxRef.current ?? new Ctx();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        if (!pcRef.current) return;
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
        target.current = Math.min(1, peak / 40);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    } catch {
      /* metering is decoration */
    }
  }, []);

  const teardown = useCallback(() => {
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    pendingRef.current = [];
    myLevel.current = 0;
    theirLevel.current = 0;
  }, []);

  const ensurePeer = useCallback(async () => {
    if (pcRef.current) return pcRef.current;
    setState("connecting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 48000 },
        video: false,
      });
    } catch {
      setState("blocked");
      throw new Error("mic blocked");
    }
    localRef.current = stream;
    stream.getAudioTracks().forEach((t) => (t.enabled = !mutedRef.current));
    meter(stream, myLevel);

    const pc = new RTCPeerConnection(ICE);
    pcRef.current = pc;
    // exactly one audio m-line, always in the same order on both sides
    pc.addTrack(stream.getAudioTracks()[0], stream);

    pc.onicecandidate = (e) => {
      if (e.candidate) bus.send({ kind: "ice", from: myId, candidate: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => {
      const remote = e.streams[0];
      if (!audioRef.current) {
        const el = document.createElement("audio");
        el.autoplay = true;
        el.setAttribute("playsinline", "true");
        document.body.appendChild(el);
        audioRef.current = el;
      }
      audioRef.current.srcObject = remote;
      audioRef.current.play().catch(() => {});
      meter(remote, theirLevel);
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (recoverTimer.current) { clearTimeout(recoverTimer.current); recoverTimer.current = null; }
      if (s === "connected") setState("live");
      else if (s === "connecting") setState("connecting");
      else if (s === "failed") { setState("connecting"); recoverRef.current(); }
      else if (s === "disconnected") {
        // Brief network blips heal on their own; otherwise rebuild the path.
        setState("connecting");
        recoverTimer.current = setTimeout(() => recoverRef.current(), 3500);
      }
    };
    return pc;
  }, [bus, meter, myId]);

  const makeOffer = useCallback(async () => {
    if (!isOfferer || makingOfferRef.current) return;
    makingOfferRef.current = true;
    try {
      const pc = await ensurePeer();
      if (pc.signalingState !== "stable") return;
      const offer = tuneOpus(await pc.createOffer({ iceRestart: pc.connectionState === "failed" || pc.connectionState === "disconnected" }));
      await pc.setLocalDescription(offer);
      bus.send({ kind: "offer", from: myId, sdp: offer });
    } catch {
      /* handled by state */
    } finally {
      makingOfferRef.current = false;
    }
  }, [bus, ensurePeer, isOfferer, myId]);

  // incoming signals
  useEffect(() => {
    bus.handler = async (payload) => {
      if (!enabled || payload.from === myId) return;
      try {
        if (payload.kind === "hello") {
          if (isOfferer) await makeOffer();
          return;
        }
        if (payload.kind === "offer") {
          if (isOfferer) return; // single-offerer model
          const pc = await ensurePeer();
          if (pc.signalingState !== "stable") {
            teardown();
          }
          const fresh = await ensurePeer();
          await fresh.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          for (const c of pendingRef.current.splice(0)) {
            await fresh.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          }
          const answer = tuneOpus(await fresh.createAnswer());
          await fresh.setLocalDescription(answer);
          bus.send({ kind: "answer", from: myId, sdp: answer });
          return;
        }
        if (payload.kind === "answer") {
          const pc = pcRef.current;
          if (!pc || pc.signalingState !== "have-local-offer") return;
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          for (const c of pendingRef.current.splice(0)) {
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          }
          return;
        }
        if (payload.kind === "ice") {
          const pc = pcRef.current;
          if (!pc || !pc.remoteDescription) {
            pendingRef.current.push(payload.candidate);
            return;
          }
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {});
        }
      } catch {
        setState("failed");
      }
    };
    return () => {
      bus.handler = null;
    };
  }, [bus, enabled, ensurePeer, isOfferer, makeOffer, myId, teardown]);

  // connect / disconnect with partner presence
  useEffect(() => {
    if (!enabled) return;
    if (!partnerOnline) {
      teardown();
      setState("idle");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await ensurePeer();
        if (cancelled) return;
        if (isOfferer) await makeOffer();
        else bus.send({ kind: "hello", from: myId });
      } catch {
        /* blocked state already set */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, partnerOnline, isOfferer]);

  useEffect(() => () => teardown(), [teardown]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      mutedRef.current = next;
      localRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, []);

  const retry = useCallback(async () => {
    teardown();
    setState("connecting");
    try {
      await ensurePeer();
      if (isOfferer) await makeOffer();
      else bus.send({ kind: "hello", from: myId });
    } catch {
      /* blocked */
    }
  }, [bus, ensurePeer, isOfferer, makeOffer, myId, teardown]);

  // Self-healing: up to 4 automatic reconnects, then show TAP TO RETRY.
  const attempts = useRef(0);
  useEffect(() => { if (state === "live") attempts.current = 0; }, [state]);
  recoverRef.current = () => {
    if (!enabled || !partnerOnline) return;
    if (attempts.current >= 4) { setState("failed"); return; }
    attempts.current += 1;
    const delay = 600 * attempts.current;
    setTimeout(() => {
      if (isOfferer && pcRef.current) void makeOffer();
      else void retry();
    }, delay);
  };

  // Network came back or app returned to the foreground: heal quickly.
  useEffect(() => {
    if (!enabled) return;
    const heal = () => {
      const st = pcRef.current?.connectionState;
      if (partnerOnline && (!pcRef.current || st === "failed" || st === "disconnected")) recoverRef.current();
      audioRef.current?.play().catch(() => {});
    };
    window.addEventListener("online", heal);
    document.addEventListener("visibilitychange", heal);
    return () => { window.removeEventListener("online", heal); document.removeEventListener("visibilitychange", heal); };
  }, [enabled, partnerOnline]);

  return { state, muted, toggleMute, retry, myLevel, theirLevel };
}
