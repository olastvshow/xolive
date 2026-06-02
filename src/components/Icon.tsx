import { cn } from "@/lib/utils";

export function Icon({
  name,
  filled = false,
  className,
  style,
}: {
  name: string;
  filled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={cn("material-symbols-outlined", filled && "icon-filled", className)}
      style={style}
    >
      {name}
    </span>
  );
}
