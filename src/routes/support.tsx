import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "XO Live — Support & Help Center" },
      {
        name: "description",
        content:
          "Get help with XO Live. Contact support, report issues, view FAQs, or read our privacy policy and terms.",
      },
    ],
  }),
  component: SupportPage,
});

const SUPPORT_EMAIL = "support@xolive.app";

function SupportPage() {
  return (
    <div className="min-h-[100dvh] bg-surface text-on-surface px-5 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">XO Live Support</h1>
          <p className="mt-2 text-on-surface-variant">
            We're here to help. Reach out anytime — we usually reply within 24 hours.
          </p>
        </header>

        <section className="rounded-2xl bg-surface-container p-5 mb-6">
          <h2 className="text-xl font-semibold mb-2">Contact us</h2>
          <p className="text-on-surface-variant mb-3">
            Email us with any question, bug report, account issue, or feedback:
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=XO%20Live%20Support`}
            className="inline-block px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold"
          >
            {SUPPORT_EMAIL}
          </a>
        </section>

        <section className="rounded-2xl bg-surface-container p-5 mb-6">
          <h2 className="text-xl font-semibold mb-3">Frequently asked questions</h2>

          <Faq q="How do I create an account?">
            Open the app and tap “Create account.” Enter a username, your email, and a
            password. You can sign in immediately after sign-up.
          </Faq>
          <Faq q="I forgot my password. What now?">
            Email us at {SUPPORT_EMAIL} from the address you signed up with and we'll
            help you reset it.
          </Faq>
          <Faq q="How do I delete my account or data?">
            Send a deletion request to {SUPPORT_EMAIL} from your account email. We
            will permanently remove your profile and game data within 7 days.
          </Faq>
          <Faq q="The app crashed or something looks broken.">
            Please email {SUPPORT_EMAIL} with your device model, OS version, and a
            short description of what you were doing. Screenshots help a lot.
          </Faq>
          <Faq q="How does multiplayer work?">
            Matches use peer-to-peer video and real-time messaging. A solid Wi-Fi or
            mobile connection gives the best experience.
          </Faq>
        </section>

        <section className="rounded-2xl bg-surface-container p-5 mb-6">
          <h2 className="text-xl font-semibold mb-3">Legal</h2>
          <ul className="space-y-2">
            <li>
              <Link to="/privacy" className="text-primary underline font-medium">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="text-primary underline font-medium">
                Terms of Service
              </Link>
            </li>
          </ul>
        </section>

        <footer className="text-center text-sm text-on-surface-variant mt-10">
          <Link to="/auth" className="underline">Back to app</Link>
          <p className="mt-2">© {new Date().getFullYear()} XO Live</p>
        </footer>
      </div>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="border-b border-outline-variant py-3 last:border-b-0">
      <summary className="cursor-pointer font-semibold">{q}</summary>
      <div className="mt-2 text-on-surface-variant text-sm leading-relaxed">
        {children}
      </div>
    </details>
  );
}
