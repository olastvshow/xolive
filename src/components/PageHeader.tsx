import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Glyph } from "@/components/Glyph";

/** Standard screen header: back control, title, optional trailing action. */
export function PageHeader({
  title,
  subtitle,
  back = "/",
  action,
}: {
  title: string;
  subtitle?: string;
  back?: LinkProps["to"];
  action?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-3">
      <Link
        to={back}
        aria-label="Go back"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-night-2 text-ink/70 press"
      >
        <Glyph name="left" size={18} />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-[26px] leading-tight lg:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-xs text-ink/45">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
