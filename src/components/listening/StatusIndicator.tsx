import { IconCheck, IconAlert, IconDots } from "@/components/ui/icons";
import { Waveform } from "@/components/listening/Waveform";
import { ListeningRing } from "@/components/listening/ListeningRing";

export type ListeningState = "speaking" | "listening" | "thinking" | "confirmed" | "error" | "idle";

interface StatusIndicatorProps {
  state: ListeningState;
  label: string;
}

const STATE_COLOR: Record<ListeningState, string> = {
  speaking: "text-brand",
  listening: "text-attention",
  thinking: "text-text-secondary",
  confirmed: "text-positive",
  error: "text-danger",
  idle: "text-text-secondary",
};

/**
 * BRAND.md §6 — every state pairs shape/motion + color + a text label; color
 * is never the sole signal. Each `state` here maps 1:1 to a spoken/audio
 * equivalent handled by the caller (TTS phrasing or earcons), not this component.
 */
export function StatusIndicator({ state, label }: StatusIndicatorProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`flex items-center justify-center h-16 ${STATE_COLOR[state]}`}>
        {state === "speaking" && <Waveform />}

        {state === "listening" && <ListeningRing />}

        {state === "thinking" && (
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-text-secondary motion-safe:animate-[bounce-dot_1s_ease-in-out_infinite]"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}

        {state === "confirmed" && (
          <IconCheck className="w-8 h-8 motion-safe:animate-[scale-pop_0.25s_ease-out]" />
        )}

        {state === "error" && (
          <IconAlert className="w-8 h-8 motion-safe:animate-[shake_0.4s_ease-in-out]" />
        )}

        {state === "idle" && <IconDots className="w-6 h-6 opacity-40" />}
      </div>
      <p className={`text-label uppercase ${STATE_COLOR[state]}`}>{label}</p>
    </div>
  );
}
