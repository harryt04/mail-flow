import type { gmail_v1 } from 'googleapis'

export interface GmailLabel {
  id: string
  name: string
}

/**
 * The user's real Gmail labels (folders), for the "Move to" action. `type: "system"` labels
 * (INBOX, SPAM, CATEGORY_*, etc.) are excluded — only labels the user created themselves
 * (or created via `createLabel` below) are valid move targets.
 */
export async function listUserLabels(
  gmail: gmail_v1.Gmail,
): Promise<GmailLabel[]> {
  const res = await gmail.users.labels.list({ userId: 'me' })
  return (res.data.labels ?? [])
    .filter(
      (label): label is gmail_v1.Schema$Label & { id: string; name: string } =>
        label.type === 'user' &&
        typeof label.id === 'string' &&
        typeof label.name === 'string',
    )
    .map((label) => ({ id: label.id, name: label.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Creates a new user label (e.g. from the "New Folder" chip in the move-to picker).
 * Gmail itself rejects a duplicate name with a 409 — let that surface as a normal
 * thrown error; the caller (the API route) maps it to a 400.
 */
export async function createLabel(
  gmail: gmail_v1.Gmail,
  name: string,
): Promise<GmailLabel> {
  const res = await gmail.users.labels.create({
    userId: 'me',
    requestBody: {
      name,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
    },
  })
  if (!res.data.id || !res.data.name) {
    throw new Error('Gmail did not return a valid label')
  }
  return { id: res.data.id, name: res.data.name }
}
