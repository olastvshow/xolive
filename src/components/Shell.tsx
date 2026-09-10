import type { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-night text-ink">
      <main className="max-w-md mx-auto w-full px-5 py-8">{children}</main>
    </div>
  );
}
