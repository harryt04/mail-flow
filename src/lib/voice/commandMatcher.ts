import messages from '@/messages/en-US.json'

export type Command =
  | 'continue'
  | 'skip'
  | 'archive'
  | 'reply'
  | 'confirm'
  | 'redo'
  | 'move'
  | 'pause'

// PRD §5.4: "no fuzzy NLU needed beyond basic synonym handling" — plain
// keyword/synonym matching against the STT transcript. Phrases live in the
// i18n message catalog (`voice.commandPhrases`) so they're centralized
// alongside every other user-facing string — still English-only for now,
// since true multi-language voice matching also needs STT-language
// switching, not just a translated phrase list (see docs/lib/voice.md).
const COMMAND_PHRASES: Record<Exclude<Command, 'move'>, string[]> = messages
  .voice.commandPhrases

// "move" is open-vocabulary (a Gmail label name, not a fixed word) — matched via a capturing
// trigger phrase instead of the fixed COMMAND_PHRASES list; the captured group is fuzzy-matched
// against the user's real labels client-side (see lib/voice/labelMatcher.ts).
const MOVE_TRIGGERS: RegExp[] = messages.voice.moveTriggers.map(
  (pattern) => new RegExp(pattern, 'i'),
)

export interface CommandMatch {
  command: Command
  phrase: string
  /** The raw spoken folder name, for "move" only — still needs fuzzy-matching against real labels. */
  argument?: string
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function matchesPhrase(text: string, phrase: string): boolean {
  return new RegExp(`\\b${escapeRegExp(phrase)}\\b`).test(text)
}

export function matchCommand(transcript: string): CommandMatch | null {
  const normalized = transcript.toLowerCase().trim()
  if (!normalized) return null

  for (const trigger of MOVE_TRIGGERS) {
    const match = normalized.match(trigger)
    if (match?.[1]?.trim()) {
      return { command: 'move', phrase: match[0], argument: match[1].trim() }
    }
  }

  for (const [command, phrases] of Object.entries(COMMAND_PHRASES) as [
    Exclude<Command, 'move'>,
    string[],
  ][]) {
    for (const phrase of phrases) {
      if (matchesPhrase(normalized, phrase)) {
        return { command, phrase }
      }
    }
  }
  return null
}
