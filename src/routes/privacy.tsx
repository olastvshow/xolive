import { createFileRoute, Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — XO Live" },
      { name: "description", content: "How XO Live collects, uses, and protects your data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-[100dvh] bg-surface text-on-surface">
      <header className="sticky top-0 z-10 bg-surface/95 backdrop-blur border-b border-outline-variant/60 px-4 py-3 flex items-center gap-3">
        <Link to="/" className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center active:scale-95">
          <Icon name="arrow_back" />
        </Link>
        <h1 className="text-lg font-black">Privacy Policy</h1>
      </header>
      <main className="max-w-2xl mx-auto px-5 py-6 space-y-5 text-sm leading-relaxed">
        <p className="text-xs text-on-surface-variant">Last updated: June 2026</p>

        <Section title="What we collect">
          When you sign up we store your email, a unique username, and a hashed password.
          As you play we keep your wins, losses, draws, coin balance, avatar, and match history.
          We log your last-seen timestamp so other players know when you're online.
        </Section>

        <Section title="How we use it">
          Your data powers your profile, the leaderboard, matchmaking, and in-game features.
          We never sell your personal information to third parties.
        </Section>

        <Section title="Who can see what">
          Your username, avatar, and public stats appear on the leaderboard and to opponents.
          Your email, password, coin transactions, and private chats are visible only to you.
        </Section>

        <Section title="Cookies & storage">
          We use local storage to keep you signed in on this device. We do not use third-party
          tracking cookies.
        </Section>

        <Section title="Your choices">
          You can change your username and avatar at any time. You can delete your account from
          the Profile page — your data is removed after a 30-day grace period during which you
          can restore it.
        </Section>

        <Section title="Contact">
          Questions about privacy? Reach out from the in-app support form.
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-black mb-1.5">{title}</h2>
      <p className="text-on-surface-variant">{children}</p>
    </section>
  );
}
