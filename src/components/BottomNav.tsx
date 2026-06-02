import { Link, useRouterState } from "@tanstack/react-router";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: "home" },
  { to: "/leaderboard", label: "Leaderboard", icon: "leaderboard" },
  { to: "/profile", label: "Profile", icon: "person" },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-surface-container shadow-[0_-8px_20px_rgba(81,88,160,0.15)] rounded-t-3xl">
      {items.map((it) => {
        const active = pathname === it.to;
        return (
          <Link
            key={it.to}
            to={it.to}
            className={cn(
              "flex flex-col items-center justify-center transition-all duration-200 active:scale-90",
              active
                ? "bg-secondary-container text-on-secondary-container rounded-full px-6 py-2"
                : "text-on-surface-variant px-4 py-2"
            )}
          >
            <Icon name={it.icon} filled={active} />
            <span className="text-xs font-semibold tracking-wider mt-0.5">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
