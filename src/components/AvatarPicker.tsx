import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { updateProfile } from "@/lib/xo.functions";
import { Icon } from "@/components/Icon";

const PRESETS = {
  male: ["Felix", "Aiden", "Leo", "Kai", "Marcus"],
  female: ["Luna", "Aria", "Zoe", "Mia", "Nora"],
};
const presetUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear&backgroundColor=b6e3f4,c0aede,ffd5dc,ffdfbf`;

export const ALL_PRESETS = [...PRESETS.male, ...PRESETS.female].map(presetUrl);

export function AvatarPicker({
  open, onClose, currentUrl, userId,
}: { open: boolean; onClose: () => void; currentUrl: string | null; userId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const update = useServerFn(updateProfile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(currentUrl);

  if (!open) return null;

  const save = async (url: string | null) => {
    setBusy(true); setError(null);
    try {
      await update({ data: { avatar_url: url } });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally { setBusy(false); }
  };

  const onUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Please pick an image file"); return; }
    if (file.size > 4 * 1024 * 1024) { setError("Image must be under 4MB"); return; }
    setBusy(true); setError(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const tenYears = 60 * 60 * 24 * 365 * 10;
      const { data, error: sErr } = await supabase.storage.from("avatars").createSignedUrl(path, tenYears);
      if (sErr || !data) throw sErr ?? new Error("Could not create URL");
      await save(data.signedUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-on-surface">Choose your avatar</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center"><Icon name="close" /></button>
        </div>

        <button onClick={() => fileRef.current?.click()} disabled={busy}
          className="w-full bg-primary text-on-primary py-3 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-[0_5px_0_#394086] disabled:opacity-60 mb-2">
          <Icon name="upload" filled /> Upload your photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />

        <p className="text-center text-xs text-on-surface-variant my-3">or pick a preset</p>

        <Section title="Male" seeds={PRESETS.male} selected={selected} onPick={setSelected} />
        <Section title="Female" seeds={PRESETS.female} selected={selected} onPick={setSelected} />

        {error && <p className="text-error text-sm mt-3 font-semibold">{error}</p>}

        <div className="flex gap-2 mt-5">
          {currentUrl && (
            <button onClick={() => save(null)} disabled={busy}
              className="flex-1 py-3 rounded-2xl border-2 border-outline-variant text-on-surface-variant font-semibold disabled:opacity-60">Remove</button>
          )}
          <button onClick={() => selected && save(selected)} disabled={busy || !selected || selected === currentUrl}
            className="flex-1 bg-secondary text-on-secondary py-3 rounded-2xl font-bold shadow-[0_5px_0_#26288c] disabled:opacity-60">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, seeds, selected, onPick }: { title: string; seeds: string[]; selected: string | null; onPick: (u: string) => void }) {
  return (
    <div className="mb-2">
      <p className="text-[11px] font-bold tracking-widest uppercase text-on-surface-variant mb-2">{title}</p>
      <div className="grid grid-cols-5 gap-2">
        {seeds.map((s) => {
          const url = presetUrl(s);
          const active = selected === url;
          return (
            <button key={s} onClick={() => onPick(url)}
              className={`aspect-square rounded-2xl overflow-hidden border-4 transition ${active ? "border-primary scale-105" : "border-transparent"} bg-surface-container`}>
              <img src={url} alt={s} className="w-full h-full object-cover" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Avatar({ url, name, className = "w-10 h-10" }: { url: string | null | undefined; name: string | null | undefined; className?: string }) {
  if (url) return <img src={url} alt={name ?? "avatar"} className={`${className} rounded-full object-cover bg-primary-container`} />;
  const initial = name?.[0]?.toUpperCase() ?? "?";
  return (
    <div className={`${className} rounded-full bg-primary-container flex items-center justify-center font-bold text-on-primary-container`}>
      {initial}
    </div>
  );
}
