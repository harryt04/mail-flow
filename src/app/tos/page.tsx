import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — MailFlow",
};

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <Link href="/" className="text-body text-text-secondary hover:text-text-primary">
        ← MailFlow
      </Link>
      <h1 className="text-h1 font-bold text-text-primary">Terms of Service</h1>
      <p className="text-body-sm text-text-secondary">Last updated: July 18, 2026</p>

      <div className="flex flex-col gap-6 text-body text-text-secondary">
        <section className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold text-text-primary">1. Acceptance of terms</h2>
          <p>
            By accessing or using MailFlow (the &ldquo;Service&rdquo;), you agree to be bound by
            these Terms of Service. If you do not agree to these terms, do not use the Service.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold text-text-primary">2. Description of service</h2>
          <p>
            MailFlow connects to your Gmail account to read your inbox aloud and let you manage
            email (skip, archive, reply, snooze) by voice or simple commands. The Service is
            provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold text-text-primary">3. Your account</h2>
          <p>
            You are responsible for maintaining the security of your Google account and for any
            activity that occurs through your use of the Service. You may revoke MailFlow&rsquo;s
            access to your Google account at any time from your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-text-primary">
              Google Account permissions
            </a>{" "}
            page.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold text-text-primary">4. Acceptable use</h2>
          <p>
            You agree not to use the Service for any unlawful purpose or in any way that could
            damage, disable, or impair the Service or interfere with any other party&rsquo;s use
            of it.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold text-text-primary">5. Disclaimer of warranties</h2>
          <p>
            The Service is provided without warranties of any kind, whether express or implied.
            We do not guarantee that the Service will be uninterrupted, secure, or error-free.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold text-text-primary">6. Limitation of liability</h2>
          <p>
            To the fullest extent permitted by law, MailFlow shall not be liable for any
            indirect, incidental, or consequential damages arising from your use of the Service.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold text-text-primary">7. Changes to these terms</h2>
          <p>
            We may update these Terms of Service from time to time. Continued use of the Service
            after changes take effect constitutes acceptance of the revised terms.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold text-text-primary">8. Contact</h2>
          <p>
            Questions about these terms can be sent to{" "}
            <a
              href="mailto:harrison.thomas04@gmail.com"
              className="underline hover:text-text-primary">
              harrison.thomas04@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
