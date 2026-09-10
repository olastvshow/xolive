import { Link } from "@tanstack/react-router";
import { Glyph, type GlyphName } from "@/components/Glyph";

type Tab = { to: string; label: string; icon: GlyphName };

const TABS: Tab[] = [
  { to: "/", label: "Home", icon: "home" },
  { to: "/play", label: "Online", icon: "globe" },
  { to: "/solo", label: "Solo", icon: "cpu" },
  { to: "/room", label: "Room", icon: "people" },
  { to: "/profile", label: "You", icon: "settings" },
];

/** Bottom tab bar on phones, top navigation rail on wide screens. */
export function TabBar() {
  return (
    <>
      {/* phone: floating bottom bar */}
      <nav
        aria-label="Main"
        className="lg:hidden fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-night via-night/90 to-transparent"
      >
        <ul className="mx-auto flex max-w-md items-center justify-between rounded-[26px] border border-white/10 bg-night-2/95 px-2 py-1.5 backdrop-blur">
          {TABS.map((t) => (
            <li key={t.to} className="flex-1">
              <Link
                to={t.to}
                activeOptions={{ exact: t.to === "/" }}
                className="group flex h-[52px] flex-col items-center justify-center gap-1 rounded-[20px] text-ink/45 data-[status=active]:bg-white/8 data-[status=active]:text-pop"
              >
                <Glyph name={t.icon} size={19} />
                <span className="text-[10px] font-semibold tracking-wide">{t.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* desktop: sticky top bar */}
      <nav aria-label="Main" className="hidden lg:block sticky top-0 z-50 border-b border-white/8 bg-night/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-8 px-8 py-4">
          <Link to="/" className="font-display text-xl">
            Duet<span className="text-pop">.</span>
          </Link>
          <ul className="flex items-center gap-1">
            {TABS.map((t) => (
              <li key={t.to}>
                <Link
                  to={t.to}
                  activeOptions={{ exact: t.to === "/" }}
                  className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-ink/50 hover:text-ink data-[status=active]:bg-white/8 data-[status=active]:text-pop"
                >
                  <Glyph name={t.icon} size={17} />
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
}
