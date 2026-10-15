import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/join/$code")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Join me on Duet — tap to play together" },
      { name: "description", content: "Your partner invited you to a private Duet room. Tap to join and play together." },
      { property: "og:title", content: "Join me on Duet — tap to play together" },
      { property: "og:description", content: "Your partner invited you to a private Duet room. Tap to join and play together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  useEffect(() => {
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (clean.length === 6) localStorage.setItem("duet-join", clean);
    navigate({ to: "/pair", replace: true });
  }, [code, navigate]);
  return (
    <div className="min-h-[100dvh] bg-night grid place-items-center text-ink/60">Opening your room…</div>
  );
}
