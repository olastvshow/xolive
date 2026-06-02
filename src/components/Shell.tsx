import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      <TopBar />
      <main className="flex-grow pt-20 pb-32 px-4 max-w-2xl mx-auto w-full">{children}</main>
      <BottomNav />
    </div>
  );
}
