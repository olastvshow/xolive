import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { joinRoomByCode } from "@/lib/xo.functions";

export const Route = createFileRoute("/_authenticated/join-room")({
  head: () => ({ meta: [{ title: "XO Live — Join Room" }] }),
  component: JoinRoomPage,
});

const LENGTH = 6;

function JoinRoomPage() {
  const navigate = useNavigate();
  const join = useServerFn(joinRoomByCode);
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const setAt = (i: number, v: string) => {
    const ch = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-1);
    const next = [...digits]; next[i] = ch; setDigits(next); setError(null);
    if (ch && i < LENGTH - 1) refs.current[i + 1]?.focus();
  };
  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!text) return; e.preventDefault();
    const next = Array(LENGTH).fill("");
    for (let i = 0; i < Math.min(LENGTH, text.length); i++) next[i] = text[i];
    setDigits(next); refs.current[Math.min(LENGTH - 1, text.length)]?.focus();
  };
  const code = digits.join("");
  const full = code.length === LENGTH;

  const m = useMutation({
    mutationFn: (c: string) => join({ data: { code: c } }),
    onSuccess: (room) => navigate({ to: "/game", search: { code: room.code } as never }),
    onError: (e) => setError(e instanceof Error ? e.message : "Could not join"),
  });

  return (
    <Shell>
      <div className="space-y-8">
        <header>
          <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-1 text-on-surface-variant text-sm font-semibold mb-3 active:scale-95">
            <Icon name="arrow_back" className="text-[20px]" /> Back
          </button>
          <h1 className="text-3xl font-bold text-on-surface">Join a Room</h1>
          <p className="text-base font-medium text-on-surface-variant mt-1">Paste the invite code your friend sent you.</p>
        </header>

        <section className="bg-surface-container rounded-3xl p-6 flex flex-col items-center gap-4">
          <div className="flex gap-2 justify-center">
            {digits.map((d, i) => (
              <input key={i} ref={(el) => { refs.current[i] = el; }} value={d}
                onChange={(e) => setAt(i, e.target.value)} onKeyDown={(e) => onKey(i, e)} onPaste={onPaste}
                inputMode="text" autoCapitalize="characters" maxLength={1}
                aria-label={`Code character ${i + 1}`}
                className="w-12 h-14 text-center text-2xl font-bold uppercase rounded-xl bg-white border-2 border-outline-variant focus:border-primary focus:outline-none transition" />
            ))}
          </div>
          {error && <p className="text-error text-sm font-semibold">{error}</p>}
          <button onClick={() => full ? m.mutate(code) : setError("Enter the full 6-character code.")} disabled={m.isPending}
            className="bubbly w-full bg-primary text-on-primary py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_6px_0_0_#394086] text-lg font-bold disabled:opacity-60">
            <Icon name="login" filled />
            {m.isPending ? "Joining…" : "Join Match"}
          </button>
        </section>
      </div>
    </Shell>
  );
}
