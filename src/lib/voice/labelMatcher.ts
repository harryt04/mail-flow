import type { GmailLabel } from '@/lib/gmail/labels'

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Matches a spoken folder name against the user's real Gmail labels. Labels are open
 * vocabulary (unlike the fixed command set), so this is deliberately simple normalized
 * exact/substring matching rather than fuzzy NLU — good enough for short label names like
 * "Unsubscribe" and keeps false-positive risk low before the caller speaks a confirmation.
 * Returns all matches so the caller can distinguish "no match" / "one match" / "ambiguous".
 */
export function findMatchingLabels(
  spoken: string,
  labels: GmailLabel[],
): GmailLabel[] {
  const target = normalize(spoken)
  if (!target) return []

  const exact = labels.filter((label) => normalize(label.name) === target)
  if (exact.length > 0) return exact

  return labels.filter((label) => {
    const name = normalize(label.name)
    return name.includes(target) || target.includes(name)
  })
}
