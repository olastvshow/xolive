import type { SVGProps } from "react";

export type GlyphName =
  | "xo"
  | "guess-me"
  | "glass"
  | "air-hockey"
  | "settings"
  | "globe"
  | "cpu"
  | "left"
  | "right"
  | "bell"
  | "people"
  | "clock"
  | "person"
  | "knock"
  | "trophy"
  | "spark"
  | "heart"
  | "flame"
  | "smile"
  | "surprise"
  | "clap"
  | "check";

const P: Record<GlyphName, string> = {
  // three-in-a-row grid
  xo: "M4 9h16M4 15h16M9 4v16M15 4v16",
  // two overlapping profiles — "how well do you know them"
  "guess-me": "M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11Zm-5.5 8.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5M16 5.2a3.2 3.2 0 0 1 0 6M18 14.8c1.8.7 3 2.4 3 4.7",
  // numbered grid
  glass: "M7.2 3.5h9.6l-1.1 12.2a3.6 3.6 0 0 1-7.4 0zM7.8 10h8.4M9.5 20.5h5",
  // reflex bolt
  // puck and paddle
  "air-hockey": "M4 4h16v16H4zM4 12h16M12 8.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Z",
  settings:
    "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm8-3.2-.1-1.1 1.7-1.4-1.7-3-2.1.7-1.8-1L15.5 4h-3.4M12 4H8.5l-.5 2.2-1.8 1-2.1-.7-1.7 3L4.1 11 4 12.1l.1 1.1-1.7 1.4 1.7 3 2.1-.7 1.8 1 .5 2.1h7l.5-2.1 1.8-1 2.1.7 1.7-3-1.7-1.4",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3.4 9.5h17.2M3.4 14.5h17.2M12 3c2.4 2.4 3.6 5.4 3.6 9S14.4 18.6 12 21c-2.4-2.4-3.6-5.4-3.6-9S9.6 5.4 12 3Z",
  cpu: "M7 7h10v10H7zM4.5 10H7M4.5 14H7M17 10h2.5M17 14h2.5M10 4.5V7M14 4.5V7M10 17v2.5M14 17v2.5",
  left: "M14.5 5.5 8 12l6.5 6.5",
  right: "M9.5 5.5 16 12l-6.5 6.5",
  bell: "M18 15.5V11a6 6 0 1 0-12 0v4.5L4.5 18h15zM10 21h4",
  people:
    "M8.5 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM2.8 19.5c0-3 2.6-5.1 5.7-5.1s5.7 2.1 5.7 5.1M16 5.4a3 3 0 0 1 0 5.9M17.6 14.7c2 .7 3.4 2.4 3.4 4.8",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7.2V12l3.2 2",
  person: "M12 11.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2ZM4.8 20c0-3.4 3-6 7.2-6s7.2 2.6 7.2 6",
  knock: "M8 12.5V6.3a1.4 1.4 0 1 1 2.8 0v4.6m0-.4V5a1.4 1.4 0 1 1 2.8 0v5.5m0-.3V6.6a1.4 1.4 0 1 1 2.8 0v7.6c0 3.4-2.2 5.8-5.5 5.8-3 0-4.4-1.6-5.6-4L4 14.2c-.5-1 0-2.1 1-2.4.8-.2 1.6.1 2 .8l1 1.4",
  trophy: "M7 4h10v5a5 5 0 0 1-10 0zM7 5.5H4.3v1.7A3.3 3.3 0 0 0 7.6 10.5M17 5.5h2.7v1.7a3.3 3.3 0 0 1-3.3 3.3M9.5 20h5M12 14v6",
  spark: "M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.4l-1.9-5.6-5.6-1.9L10.1 9zM18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z",
  heart: "M12 20s-7.6-4.6-7.6-9.4A4.1 4.1 0 0 1 12 8.1a4.1 4.1 0 0 1 7.6 2.5C19.6 15.4 12 20 12 20Z",
  flame: "M12 21c3.6 0 6-2.4 6-5.6 0-4-3.4-5.9-3.4-9.4-2 .8-3 2.3-3 4.2 0 1.4-.8 2-1.6 2-.9 0-1.5-.7-1.5-1.9C6.9 11.6 6 13.3 6 15.4 6 18.6 8.4 21 12 21Z",
  smile: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8.5 9.8h.01M15.5 9.8h.01M8 14.2c1 1.3 2.4 2 4 2s3-.7 4-2",
  surprise: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8.5 9.5h.01M15.5 9.5h.01M12 13.4a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6Z",
  clap: "M9.5 13 6.2 9.7a1.5 1.5 0 0 1 2.1-2.1l2.4 2.4M11 8.6 8.4 6a1.5 1.5 0 0 1 2.1-2.2l3.9 3.9M13.6 8.3l3.6 3.6c1.9 1.9 1.7 4.7-.2 6.6-1.9 1.9-4.9 1.9-6.8 0L5.9 14",
  check: "M5 12.8 9.6 17 19 6.8",
};

export function Glyph({
  name,
  size = 24,
  strokeWidth = 1.6,
  ...rest
}: { name: GlyphName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={P[name]} />
    </svg>
  );
}
