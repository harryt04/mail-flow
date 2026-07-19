import {
  IconCheck,
  IconAlert,
  IconDots,
  IconPause,
} from '@/components/ui/icons'
import { Waveform } from '@/components/listening/Waveform'
import { ListeningRing } from '@/components/listening/ListeningRing'

export type ListeningState =
  | 'speaking'
  | 'listening'
  | 'thinking'
  | 'confirmed'
  | 'error'
  | 'idle'
  | 'paused'

interface StatusIndicatorProps {
  state: ListeningState
  label: string
}

const STATE_COLOR: Record<ListeningState, string> = {
  speaking: 'text-brand',
  listening: 'text-attention',
  thinking: 'text-text-secondary',
  confirmed: 'text-positive',
  error: 'text-danger',
  idle: 'text-text-secondary',
  // Neutral, deliberately not a semantic color (BRAND.md §6) — pausing is
  // neither an error nor an attention-needed state.
  paused: 'text-text-secondary',
}

/**
 * BRAND.md §6 — every state pairs shape/motion + color + a text label; color
 * is never the sole signal. Each `state` here maps 1:1 to a spoken/audio
 * equivalent handled by the caller (TTS phrasing or earcons), not this component.
 */
export function StatusIndicator({ state, label }: StatusIndicatorProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`flex h-16 items-center justify-center ${STATE_COLOR[state]}`}
      >
        {state === 'speaking' && <Waveform />}

        {state === 'listening' && <ListeningRing />}

        {state === 'thinking' && (
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="bg-text-secondary h-2 w-2 rounded-full motion-safe:animate-[bounce-dot_1s_ease-in-out_infinite]"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}

        {state === 'confirmed' && (
          <IconCheck className="h-8 w-8 motion-safe:animate-[scale-pop_0.25s_ease-out]" />
        )}

        {state === 'error' && (
          <IconAlert className="h-8 w-8 motion-safe:animate-[shake_0.4s_ease-in-out]" />
        )}

        {state === 'idle' && <IconDots className="h-6 w-6 opacity-40" />}

        {state === 'paused' && <IconPause className="h-8 w-8" />}
      </div>
      <p className={`text-label uppercase ${STATE_COLOR[state]}`}>{label}</p>
    </div>
  )
}
