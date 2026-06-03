import { createFileRoute, Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — XO Live" },
      { name: "description", content: "The rules for using XO Live." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-[100dvh] bg-surface text-on-surface">
      <header className="sticky top-0 z-10 bg-surface/95 backdrop-blur border-b border-outline-variant/60 px-4 py-3 flex items-center gap-3">
        <Link to="/" className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center active:scale-95">
          <Icon name="arrow_back" />
        </Link>
        <h1 className="text-lg font-black">Terms of Service</h1>
      </header>
      <main className="max-w-2xl mx-auto px-5 py-6 space-y-5 text-sm leading-relaxed">
        <p className="text-xs text-on-surface-variant">Last updated: June 2026</p>

        <Section title="Using XO Live">
          You must be at least 13 years old to create an account. Pick a respectful username and
          keep your password secret — you're responsible for activity under your account.
        </Section>

        <Section title="Fair play">
          No cheating, exploits, automation, or harassment. We may suspend or remove accounts
          that abuse the service or other players.
        </Section>

        <Section title="Virtual coins">
          Coins are an in-game balance for matches and cosmetics. They have no real-world value,
          aren't redeemable for cash, and can't be transferred between accounts.
        </Section>

        <Section title="Content & conduct">
          Anything you type in chat must follow our community rules: no hate speech, threats, or
          illegal content. We may remove messages and players who break these rules.
        </Section>

        <Section title="Service availability">
          We work hard to keep XO Live up, but we don't guarantee uninterrupted service. Features
          may change as the game evolves.
        </Section>

        <Section title="Termination">
          You can delete your account from the Profile page at any time. We may suspend accounts
          that violate these terms.
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
