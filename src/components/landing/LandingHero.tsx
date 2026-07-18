import { Waveform } from "@/components/listening/Waveform";
import { GoogleSignInForm } from "@/components/landing/GoogleSignInForm";

export function LandingHero() {
  return (
    <section className="flex flex-col items-center gap-6 px-6 pt-24 pb-20 text-center sm:pt-32 sm:pb-24">
      <p className="text-label uppercase tracking-wide text-text-muted">MailFlow</p>
      <h1
        className="max-w-2xl text-[2.5rem] leading-[1.1] font-semibold text-text-primary sm:text-[3.25rem] md:text-[3.75rem]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Your inbox, read aloud.
      </h1>
      <p className="mx-auto max-w-sm text-body-lg text-text-secondary">
        MailFlow listens to your inbox for you. Skip, archive, reply, and snooze with a
        word — no scrolling, no tapping.
      </p>
      <GoogleSignInForm />
      <Waveform className="mt-6 opacity-80" />
    </section>
  );
}
