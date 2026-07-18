import type { gmail_v1 } from "googleapis";

export interface GmailLabel {
  id: string;
  name: string;
}

/**
 * The user's real Gmail labels (folders), for the "Move to" action — MVP deliberately doesn't
 * create labels on the user's behalf; if they want a new one, they add it in Gmail and it
 * shows up here next time. `type: "system"` labels (INBOX, SPAM, CATEGORY_*, etc.) are
 * excluded — only labels the user created themselves are valid move targets.
 */
export async function listUserLabels(gmail: gmail_v1.Gmail): Promise<GmailLabel[]> {
  const res = await gmail.users.labels.list({ userId: "me" });
  return (res.data.labels ?? [])
    .filter((label): label is gmail_v1.Schema$Label & { id: string; name: string } =>
      label.type === "user" && typeof label.id === "string" && typeof label.name === "string"
    )
    .map((label) => ({ id: label.id, name: label.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
