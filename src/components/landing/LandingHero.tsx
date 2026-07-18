import { Waveform } from "@/components/listening/Waveform";
import { GoogleSignInForm } from "@/components/landing/GoogleSignInForm";

export function LandingHero() {
  return (
    <section className="flex flex-col items-center gap-8 px-6 pt-12 pb-20 text-center sm:pt-16 sm:pb-28 md:pb-32">
      <h1
        className="max-w-2xl text-display font-bold text-text-primary md:text-hero"
        style={{ fontFamily: "var(--font-display)" }}>
        Your inbox, read aloud.
      </h1>
      <p className="mx-auto max-w-sm text-body-lg text-text-secondary">
        MailFlow listens to your inbox for you. Skip, archive, reply, and snooze
        with a word — no scrolling, no tapping.
      </p>
      <GoogleSignInForm />
      <Waveform className="mt-6 opacity-80" />
    </section>
  );
}
