export type Command = "continue" | "skip" | "archive" | "reply" | "snooze" | "confirm" | "redo";

// PRD §5.4: "no fuzzy NLU needed beyond basic synonym handling" — plain
// keyword/synonym matching against the Deepgram transcript.
const COMMAND_PHRASES: Record<Command, string[]> = {
  continue: ["continue", "read on", "keep going", "keep reading", "more"],
  skip: ["skip", "next"],
  archive: ["archive", "delete", "remove"],
  reply: ["reply", "respond"],
  snooze: ["snooze"],
  confirm: ["send", "yes", "confirm", "send it"],
  redo: ["redo", "try again", "no"],
};

export interface CommandMatch {
  command: Command;
  phrase: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesPhrase(text: string, phrase: string): boolean {
  return new RegExp(`\\b${escapeRegExp(phrase)}\\b`).test(text);
}

export function matchCommand(transcript: string): CommandMatch | null {
  const normalized = transcript.toLowerCase().trim();
  if (!normalized) return null;

  for (const [command, phrases] of Object.entries(COMMAND_PHRASES) as [Command, string[]][]) {
    for (const phrase of phrases) {
      if (matchesPhrase(normalized, phrase)) {
        return { command, phrase };
      }
    }
  }
  return null;
}
