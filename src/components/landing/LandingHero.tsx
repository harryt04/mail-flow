import { Waveform } from '@/components/listening/Waveform'
import { GoogleSignInForm } from '@/components/landing/GoogleSignInForm'

export function LandingHero() {
  return (
    <section className="flex flex-col items-center gap-8 px-6 pt-12 pb-20 text-center sm:pt-16 sm:pb-28 md:pb-32">
      <h1
        className="text-display text-text-primary md:text-hero max-w-2xl font-bold"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Your inbox, read aloud.
      </h1>
      <p className="text-body-lg text-text-secondary mx-auto max-w-sm">
        MailFlow listens to your inbox for you. Skip, archive, and reply with a
        word — no scrolling, no tapping.
      </p>
      <GoogleSignInForm />
      <Waveform className="mt-6 opacity-80" />
    </section>
  )
}
