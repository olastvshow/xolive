import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "@/lib/xo.functions";
import { Avatar } from "@/components/AvatarPicker";

export function TopBar() {
  const fn = useServerFn(getMyProfile);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fn() });
  const coins = profile?.coins ?? 0;

  return (
    <header className="bg-surface/90 backdrop-blur shadow-sm flex justify-between items-center px-5 py-2 w-full fixed top-0 left-0 z-50">
      <Link to="/profile" className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden">
          <Avatar url={profile?.avatar_url ?? null} name={profile?.username} className="w-full h-full" />
        </div>
        <span className="text-2xl font-bold text-primary tracking-tight">XO Live</span>
      </Link>
      <div className="bg-surface-container-high px-4 py-2 rounded-full flex items-center gap-1 shadow-sm">
        <span className="text-sm font-semibold tracking-wider text-primary">{coins.toLocaleString()}</span>
        <span className="text-lg">🪙</span>
      </div>
    </header>
  );
}
