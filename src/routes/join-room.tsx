import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/join-room")({
  head: () => ({
    meta: [
      { title: "XO Live — Join Room" },
      { name: "description", content: "Enter a 6-character invite code to join a live XO match." },
    ],
  }),
  component: JoinRoom,
});

const LENGTH = 6;

const SUGGESTED = [
  { name: "Sarah", code: "Q7K2MD" },
  { name: "David", code: "PX9HRA" },
  { name: "Luna",  code: "B3CVNZ" },
];

function JoinRoom() {
  const navigate = useNavigate();
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const setAt = (i: number, v: string) => {
    const ch = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-1);
    const next = [...digits];
    next[i] = ch;
    setDigits(next);
    setError(null);
    if (ch && i < LENGTH - 1) refs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!text) return;
    e.preventDefault();
    const next = Array(LENGTH).fill("");
    for (let i = 0; i < Math.min(LENGTH, text.length); i++) next[i] = text[i];
    setDigits(next);
    refs.current[Math.min(LENGTH - 1, text.length)]?.focus();
  };

  const code = digits.join("");
  const full = code.length === LENGTH;

  const submit = () => {
    if (!full) {
      setError("Enter the full 6-character code.");
      return;
    }
    navigate({ to: "/game", search: { code } as never });
  };

  return (
    <Shell>
      <div className="space-y-8">
        <header>
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex items-center gap-1 text-on-surface-variant text-sm font-semibold mb-3 active:scale-95 transition"
          >
            <Icon name="arrow_back" className="text-[20px]" /> Back
          </button>
          <h1 className="text-3xl font-bold text-on-surface">Join a Room</h1>
          <p className="text-base font-medium text-on-surface-variant mt-1">
            Paste the invite code your friend sent you.
          </p>
        </header>

        <section className="bg-surface-container rounded-3xl p-6 flex flex-col items-center gap-4">
          <div className="flex gap-2 justify-center">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                value={d}
                onChange={(e) => setAt(i, e.target.value)}
                onKeyDown={(e) => onKey(i, e)}
                onPaste={onPaste}
                inputMode="text"
                autoCapitalize="characters"
                maxLength={1}
                aria-label={`Code character ${i + 1}`}
                className="w-12 h-14 text-center text-2xl font-bold uppercase rounded-xl bg-white border-2 border-outline-variant focus:border-primary focus:outline-none transition"
              />
            ))}
          </div>
          {error && <p className="text-error text-sm font-semibold">{error}</p>}
          <button
            onClick={submit}
            disabled={!full}
            className="bubbly w-full bg-primary text-on-primary py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_6px_0_0_#394086] text-lg font-bold disabled:opacity-50 disabled:shadow-none"
          >
            <Icon name="login" filled />
            Join Match
          </button>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest mb-3">
            Friends Hosting Now
          </h3>
          <div className="space-y-2">
            {SUGGESTED.map((s) => (
              <button
                key={s.code}
                onClick={() => navigate({ to: "/game", search: { code: s.code } as never })}
                className="w-full flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm active:scale-[0.98] transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold">
                    {s.name[0]}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-on-surface">{s.name}</p>
                    <p className="text-xs text-on-surface-variant tracking-widest">{s.code}</p>
                  </div>
                </div>
                <Icon name="chevron_right" className="text-primary" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}
