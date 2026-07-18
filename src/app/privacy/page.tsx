import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — MailFlow",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <Link href="/" className="text-body text-text-secondary hover:text-text-primary">
        ← MailFlow
      </Link>
      <h1 className="text-h1 font-bold text-text-primary">Privacy Policy</h1>
      <p className="text-body-sm text-text-secondary">Last updated: July 18, 2026</p>

      <div className="flex flex-col gap-6 text-body text-text-secondary">
        <section className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold text-text-primary">1. Overview</h2>
          <p>
            MailFlow (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is an audiobook-style reader for your
            inbox. This policy explains what data we access, how we use it, and how you can
            control it.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold text-text-primary">2. Google user data</h2>
          <p>
            When you sign in with Google, MailFlow requests access to your Gmail account through
            the Gmail API. We use this access only to:
          </p>
          <ul className="list-disc pl-6">
            <li>Read email content and metadata (sender, subject, body) so it can be read aloud.</li>
            <li>Perform actions you request by voice or command, such as archiving, replying to,
              or snoozing a message.</li>
          </ul>
          <p>
            We do not use Gmail data for advertising, and we do not sell, rent, or share your
            Gmail data with third parties. Gmail data is used solely to provide the MailFlow
            experience to you.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold text-text-primary">3. Other data we collect</h2>
          <p>
            We store your Google account identifier and basic profile information (name, email
            address) to maintain your session, along with app settings and playback state you
            create while using MailFlow.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold text-text-primary">4. Data storage and security</h2>
          <p>
            Data is stored using industry-standard security practices. Access tokens are used only
            to communicate with the Gmail API on your behalf and are never exposed to third
            parties.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold text-text-primary">5. Data retention and deletion</h2>
          <p>
            You may revoke MailFlow&rsquo;s access to your Google account at any time from your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-text-primary">
              Google Account permissions
            </a>{" "}
            page. To request deletion of any data MailFlow has stored about you, email{" "}
            <a
              href="mailto:harrison.thomas04@gmail.com"
              className="underline hover:text-text-primary">
              harrison.thomas04@gmail.com
            </a>{" "}
            and we will delete it within a reasonable time.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold text-text-primary">6. Third-party sharing</h2>
          <p>
            We do not sell your personal data or Gmail data. We do not share it with third
            parties except as required to operate the Service (e.g. infrastructure providers
            bound by confidentiality obligations) or as required by law.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold text-text-primary">7. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Continued use of the Service
            after changes take effect constitutes acceptance of the revised policy.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold text-text-primary">8. Contact</h2>
          <p>
            Questions about this policy can be sent to{" "}
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
