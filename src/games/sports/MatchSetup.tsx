import { Button } from '@/components/ui/button';
import type { SportsState } from './logic';

const LABELS = {
  'cup-pong': [{ id: 'quick', title: 'Quick rack', blurb: '6 cups each' }, { id: 'full', title: 'Full rack', blurb: '10 cups each' }],
  'table-tennis': [{ id: 'quick', title: 'Quick match', blurb: 'First to 7, win by 2' }, { id: 'full', title: 'Full match', blurb: 'First to 11, win by 2' }],
} as const;

export function MatchSetup({ state, canChoose, iAmReady, waiting, onFormat, onReady }: {
  state: SportsState; canChoose: boolean; iAmReady: boolean; waiting: boolean;
  onFormat: (format: 'quick' | 'full') => void; onReady: () => void;
}) {
  return (
    <section className="mx-auto w-full max-w-md px-4 text-center" aria-label="Match settings">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-ink/40">Before you start</p>
      <h2 className="mt-2 font-display text-3xl">Pick your match length</h2>
      <div className="mt-6 grid gap-3">
        {LABELS[state.kind].map(option => {
          const active = state.format === option.id;
          return (
            <Button key={option.id} type="button" disabled={!canChoose} aria-pressed={active}
              onClick={() => onFormat(option.id)}
              className={`tile h-auto whitespace-normal flex items-center justify-between p-5 text-left transition ${active ? 'ring-2 ring-pop' : ''} ${canChoose ? 'press' : 'opacity-70'}`}>
              <span>
                <span className="block font-display text-xl">{option.title}</span>
                <span className="mt-1 block text-sm text-ink/55">{option.blurb}</span>
              </span>
              {active && <span className="text-sm font-bold text-pop">Chosen</span>}
            </Button>
          );
        })}
      </div>
      {!canChoose && <p className="mt-3 text-sm text-ink/50">Your opponent picks the match length.</p>}
      <Button type="button" className="btn-pop mt-7 h-13 w-full py-4" disabled={iAmReady} onClick={onReady}>
        {iAmReady ? (waiting ? 'Waiting for your opponent…' : 'Starting…') : "I'm ready"}
      </Button>
    </section>
  );
}
