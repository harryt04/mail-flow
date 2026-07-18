import { Card } from "@/components/ui/Card";
import { IconGoogle, IconMic, IconPlay, IconCheck } from "@/components/ui/icons";

const STEPS = [
  {
    icon: IconGoogle,
    title: "Sign in with Google",
    body: "One consent screen connects your account and your inbox — nothing else to set up.",
  },
  {
    icon: IconPlay,
    title: "Say “start listening”",
    body: "MailFlow picks up exactly where you left off, even if that was days ago.",
  },
  {
    icon: IconMic,
    title: "Listen, one paragraph at a time",
    body: "It reads each email aloud, then pauses to ask what's next — you're never stuck mid-message.",
  },
  {
    icon: IconCheck,
    title: "Say the word",
    body: "“Skip,” “archive,” “reply,” or “snooze.” No typing, no tapping required.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-t border-border bg-surface px-6 py-20 sm:py-24 md:py-28">
      <h2 className="mx-auto mb-12 max-w-md text-center text-h1 font-bold text-text-primary">
        How it works
      </h2>
      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <Card key={title} className="flex flex-col gap-4 p-8 text-left">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-label uppercase tracking-wide text-text-muted">
                Step {i + 1}
              </span>
            </div>
            <h3 className="text-h2 font-semibold text-text-primary">{title}</h3>
            <p className="text-body text-text-secondary">{body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
