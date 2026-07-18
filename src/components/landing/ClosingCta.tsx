import { GoogleSignInForm } from "@/components/landing/GoogleSignInForm";

export function ClosingCta() {
  return (
    <section className="px-6 pt-12 pb-24 sm:pb-32">
      <div className="mx-auto flex max-w-md flex-col items-center gap-8 rounded-card border border-border bg-surface px-8 py-16 text-center shadow-[var(--shadow-soft)]">
        <h2
          className="text-[2rem] leading-[1.15] font-semibold text-text-primary"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Close your eyes. Listen. Say a word.
        </h2>
        <p className="text-body text-text-secondary">
          Free to start — connect your Gmail and hear your first email in under a minute.
        </p>
        <GoogleSignInForm />
      </div>
    </section>
  );
}
