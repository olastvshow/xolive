import { useEffect, useRef, useState } from 'react';
import { Trophy, Volume2, VolumeX, Flag, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PlayValue } from './play-context';

export function GameFeedback({ value }: { value: PlayValue }) {
  const [muted, setMuted] = useState(false);
  const [notice, setNotice] = useState('Game on');
  const audio = useRef<AudioContext | null>(null);
  const previous = useRef('');
  const priorScores = useRef<Record<string, number>>({});
  const priorOver = useRef(false);
  const s = (value.state ?? {}) as { winner?: string; loser?: string; draw?: boolean; done?: boolean; scores?: Record<string, number>; board?: unknown[]; level?: number; idx?: number; revealed?: boolean };
  const over = Boolean(s.winner || s.loser || s.draw || s.done);
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
    const signature = JSON.stringify([s.board, s.level, s.idx, s.revealed, s.scores, over]);
    if (signature === previous.current) return;
    const initial = previous.current === '';
    previous.current = signature;
    let message = '';
    let frequencies = [420, 560];
    const scorer = Object.keys(s.scores ?? {}).find(id => (s.scores?.[id] ?? 0) > (priorScores.current[id] ?? 0));
    if (!initial && scorer) {
      message = scorer === value.me.id ? 'You scored +1' : `${value.partner.display_name ?? value.partner.username} scored +1`;
      frequencies = [520, 660, 780];
    }
    if (!initial && over && !priorOver.current) {
      message = s.draw ? 'A perfect draw' : s.winner ? (s.winner === value.me.id ? 'You win!' : `${value.partner.display_name ?? value.partner.username} wins`) : 'Round complete';
      frequencies = s.winner === value.me.id ? [523, 659, 784, 1047] : [440, 350, 290];
    } else if (!initial && priorOver.current && !over) message = 'Game on';
    priorOver.current = over;
    priorScores.current = { ...s.scores };
    if (message) setNotice(message);
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
    {notice && <div key={notice} className="match-notice" role="status"><span className="match-notice-icon">{over ? s.winner === value.me.id ? <Trophy /> : <Flag /> : <Zap />}</span><strong>{notice}</strong>{s.scores && <span className="tabular-nums text-ink/60">{s.scores[value.me.id] ?? 0} — {s.scores[value.partner.id] ?? 0}</span>}</div>}
  </>;
}
