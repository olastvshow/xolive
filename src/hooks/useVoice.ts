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
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    } catch {
      setState("blocked");
      throw new Error("mic blocked");
    }
    localRef.current = stream;
    stream.getAudioTracks().forEach((t) => (t.enabled = !muted));
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
      if (s === "connected") setState("live");
      else if (s === "connecting") setState("connecting");
      else if (s === "failed") setState("failed");
      else if (s === "disconnected") setState("connecting");
    };
    return pc;
  }, [bus, meter, muted, myId]);

  const makeOffer = useCallback(async () => {
    if (!isOfferer || makingOfferRef.current) return;
    makingOfferRef.current = true;
    try {
      const pc = await ensurePeer();
      if (pc.signalingState !== "stable") return;
      const offer = await pc.createOffer();
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
          const answer = await fresh.createAnswer();
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

  return { state, muted, toggleMute, retry, myLevel, theirLevel };
}
