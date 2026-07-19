export type Command =
  'continue' | 'skip' | 'archive' | 'reply' | 'confirm' | 'redo' | 'move'

// PRD §5.4: "no fuzzy NLU needed beyond basic synonym handling" — plain
// keyword/synonym matching against the STT transcript.
const COMMAND_PHRASES: Record<Exclude<Command, 'move'>, string[]> = {
  continue: ['continue', 'read on', 'keep going', 'keep reading', 'more'],
  skip: ['skip', 'next'],
  archive: ['archive', 'delete', 'remove'],
  reply: ['reply', 'respond'],
  confirm: ['send', 'yes', 'confirm', 'send it'],
  redo: ['redo', 'try again', 'no'],
}

// "move" is open-vocabulary (a Gmail label name, not a fixed word) — matched via a capturing
// trigger phrase instead of the fixed COMMAND_PHRASES list; the captured group is fuzzy-matched
// against the user's real labels client-side (see lib/voice/labelMatcher.ts).
const MOVE_TRIGGERS: RegExp[] = [
  /\bmove(?:\s+it)?\s+to\s+(.+)/i,
  /\bsort(?:\s+it)?\s+into\s+(.+)/i,
  /\bfile(?:\s+it)?\s+under\s+(.+)/i,
  /\bput(?:\s+it)?\s+in\s+(.+)/i,
]

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
