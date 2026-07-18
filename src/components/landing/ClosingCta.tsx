import { GoogleSignInForm } from '@/components/landing/GoogleSignInForm'

export function ClosingCta() {
  return (
    <section className="border-border bg-surface border-t px-6 pt-20 pb-24 sm:pt-24 sm:pb-32 md:pt-28">
      <div className="rounded-card border-border bg-bg mx-auto flex max-w-md flex-col items-center gap-8 border px-8 py-16 text-center shadow-[var(--shadow-soft)]">
        <h2
          className="text-display text-text-primary font-bold"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Close your eyes. Listen. Say a word.
        </h2>
        <p className="text-body text-text-secondary">
          Free to start — connect your Gmail and hear your first email in under
          a minute.
        </p>
        <GoogleSignInForm />
      </div>
    </section>
  )
}
