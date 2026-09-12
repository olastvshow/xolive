import { useEffect, useRef, useState } from 'react';
import { Trophy, Volume2, VolumeX, Flag, Zap, RotateCcw, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PlayValue } from './play-context';

export function GameFeedback({ value }: { value: PlayValue }) {
  const [muted, setMuted] = useState(false);
  const [notice, setNotice] = useState('');
  const [intro, setIntro] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [eventId, setEventId] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  const previous = useRef('');
  const priorScores = useRef<Record<string, number>>({});
  const priorOver = useRef(false);
  const s = (value.state ?? {}) as { winner?: string; loser?: string; draw?: boolean; done?: boolean; score?: number; questions?: unknown[]; scores?: Record<string, number>; board?: unknown[]; level?: number; idx?: number; revealed?: boolean };
  const over = Boolean(s.winner || s.loser || s.draw || s.done);
  useEffect(() => {
    if (over) { setIntro(false); return; }
    setIntro(true);
    const timer = setTimeout(() => setIntro(false), 1300);
    return () => clearTimeout(timer);
  }, [over]);
  const act = async (action: () => void | Promise<void>) => {
    setPending(true); setError('');
    try { await action(); } catch { setError('Could not connect. Please try again.'); }
    finally { setPending(false); }
  };
  useEffect(() => {
    setMuted(localStorage.getItem('duet-muted') === 'true');
    const unlock = () => {
      if (!audio.current) audio.current = new AudioContext();
      void audio.current.resume().catch(() => {});
    };
    window.addEventListener('pointerdown', unlock);
    return () => { window.removeEventListener('pointerdown', unlock); void audio.current?.close(); audio.current = null; };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 1700);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const signature = JSON.stringify([s.board, s.level, s.idx, s.revealed, s.scores, s.score, over]);
    if (signature === previous.current) return;
    const initial = previous.current === '';
    previous.current = signature;
    let message = '';
    let frequencies = [420, 560];
    const scorer = Object.keys(s.scores ?? {}).find(id => (s.scores?.[id] ?? 0) > (priorScores.current[id] ?? 0));
    if (!initial && scorer) {
      const delta = (s.scores?.[scorer] ?? 0) - (priorScores.current[scorer] ?? 0);
      message = scorer === value.me.id ? `You scored +${delta}` : `${value.partner.display_name ?? value.partner.username} scored +${delta}`;
      frequencies = [520, 660, 780];
    }
    if (!initial && over && !priorOver.current) {
      message = s.draw ? 'A perfect draw' : s.winner ? (s.winner === value.me.id ? 'You win!' : `${value.partner.display_name ?? value.partner.username} wins`) : 'Round complete';
      frequencies = s.winner === value.me.id ? [523, 659, 784, 1047] : [440, 350, 290];
    } else if (!initial && priorOver.current && !over) message = 'Game on';
    priorOver.current = over;
    priorScores.current = { ...s.scores };
    if (message) { setNotice(message); setEventId(id => id + 1); }
    const ctx = audio.current;
    if (!initial && !muted && ctx?.state === 'running') frequencies.forEach((frequency, i) => {
      const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      const time = ctx.currentTime + i * .075;
      gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(.035, time + .012); gain.gain.exponentialRampToValueAtTime(.001, time + .14);
      oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(time); oscillator.stop(time + .15);
    });
  }, [value.state, muted, over, value.me.id, value.partner]);
  return <>
    <div className="flex justify-end px-4 pb-2"><Button variant="ghost" className="h-11 w-11 text-ink/60" aria-label={muted ? 'Enable game sounds' : 'Mute game sounds'} title={muted ? 'Enable game sounds' : 'Mute game sounds'} onClick={() => setMuted(v => { localStorage.setItem('duet-muted', String(!v)); return !v; })}>{muted ? <VolumeX /> : <Volume2 />}</Button></div>
    {intro && !over && <div className="match-intro" role="status"><div className="match-intro-line" /><span className="text-sm font-bold uppercase text-pop">{value.live ? 'Live match' : 'New round'}</span><strong className="font-display text-5xl">Game on</strong><span className="text-sm text-ink/70">You <span className="px-3 text-pop">vs</span> {value.partner.display_name ?? value.partner.username}</span><div className="match-intro-line" /></div>}
    {notice && !over && <div key={eventId} className="match-notice" role="status"><span className="match-notice-icon"><Zap /></span><strong>{notice}</strong>{s.scores && <span className="score-bounce tabular-nums text-pop">{s.scores[value.me.id] ?? 0} — {s.scores[value.partner.id] ?? 0}</span>}</div>}
    {over && <section className="match-result mx-auto w-full max-w-lg px-6 py-8 text-center" aria-label="Match result">
      <div className="result-emblem mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full bg-pop/10 text-pop">{s.winner && s.winner !== value.me.id ? <Flag size={44} /> : <Trophy size={44} />}</div>
      <p className="mb-2 text-xs font-bold uppercase text-ink/50">Final result</p>
      <h2 className="font-display text-4xl">{s.draw ? 'Honours even' : s.winner ? s.winner === value.me.id ? 'You win!' : 'Good game' : 'Round complete'}</h2>
      <p className="mt-3 text-sm text-ink/60">{s.winner ? `${s.winner === value.me.id ? 'You' : value.partner.display_name ?? value.partner.username} won this round` : s.done ? 'Another round together?' : 'Time for a rematch?'}</p>
      {s.scores && <div className="my-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4"><div className="min-w-0"><div key={`me-${s.scores[value.me.id]}`} className="score-bounce font-display text-6xl text-pop">{s.scores[value.me.id] ?? 0}</div><p className="mt-2 text-sm">You</p></div><span className="text-ink/30">—</span><div className="min-w-0"><div key={`them-${s.scores[value.partner.id]}`} className="score-bounce font-display text-6xl text-xo">{s.scores[value.partner.id] ?? 0}</div><p className="mt-2 break-words text-sm">{value.partner.display_name ?? value.partner.username}</p></div></div>}
      {typeof s.score === 'number' && <p className="score-bounce my-8 font-display text-5xl text-pop">{s.score} / {s.questions?.length ?? 10}<span className="mt-2 block font-sans text-sm text-ink/60">Answers in sync</span></p>}
      <div className="mt-8 flex flex-col gap-3"><Button className="btn-pop h-12 w-full" disabled={pending || value.busy || (value.live && !value.partnerOnline)} onClick={() => void act(value.restart)}><RotateCcw size={18} />{pending ? 'Connecting…' : 'Play again'}</Button><Button variant="ghost" className="h-12 text-ink/70" disabled={pending || value.busy} onClick={() => void act(value.leaveGame)}><LayoutGrid size={18} />{value.live ? 'Choose another game' : 'All games'}</Button></div>
      {value.live && !value.partnerOnline && <p className="mt-3 text-sm text-ink/50">Waiting for your opponent to reconnect</p>}
      {error && <p role="alert" className="mt-3 text-sm text-knowus">{error}</p>}
    </section>}
  </>;
}
