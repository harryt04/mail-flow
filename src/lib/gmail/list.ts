import type { gmail_v1 } from "googleapis";
import type { InboxScope, InboxOrder } from "@/lib/types";
import { headerValue, parseSenderHeader } from "@/lib/gmail/parse";

// Friends/family MVP scale (PRD §3) — cap a single snapshot so one huge
// inbox can't turn "Start Listening" into a runaway pagination loop.
const MAX_SNAPSHOT_SIZE = 2000;
const PAGE_SIZE = 500;

export interface InboxSnapshot {
  messageIds: string[];
  /** Gmail's own approximation of total matching messages (`resultSizeEstimate`), captured from the first page — always an estimate, never exact for large mailboxes. */
  totalEstimate: number;
}

/**
 * Builds a stable, ordered message-ID snapshot for a listening session.
 * Gmail's list API returns newest-first; we reverse for oldest-first so the
 * snapshot itself encodes the order the plan walks through it.
 */
export async function buildInboxSnapshot(
  gmail: gmail_v1.Gmail,
  scope: InboxScope,
  order: InboxOrder
): Promise<InboxSnapshot> {
  const query = scope === "unread" ? "in:inbox is:unread" : "in:inbox";
  const messageIds: string[] = [];
  let pageToken: string | undefined;
  let totalEstimate: number | undefined;

  do {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: PAGE_SIZE,
      pageToken,
    });

    if (totalEstimate === undefined) {
      totalEstimate = res.data.resultSizeEstimate ?? undefined;
    }

    for (const message of res.data.messages ?? []) {
      if (message.id) messageIds.push(message.id);
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken && messageIds.length < MAX_SNAPSHOT_SIZE);

  const capped = messageIds.slice(0, MAX_SNAPSHOT_SIZE);
  return {
    messageIds: order === "oldest" ? capped.reverse() : capped,
    totalEstimate: totalEstimate ?? messageIds.length,
  };
}

export interface EmailSummary {
  messageId: string;
  sender: string;
  senderEmail: string;
  subject: string;
  snippet: string;
}

/**
 * Lightweight per-message fetch for the inbox browser list view — `format: "metadata"`
 * skips MIME body traversal entirely (unlike `fetchMessage`'s `format: "full"`, used only
 * for actual playback), so this is safe to call for a page of rows without the cost of
 * pulling full bodies. Caller is responsible for only passing one page of IDs at a time
 * (25-50), not the whole snapshot — Gmail's per-user quota makes bulk metadata fetches slow.
 */
export async function fetchMessageSummaries(
  gmail: gmail_v1.Gmail,
  messageIds: string[]
): Promise<EmailSummary[]> {
  const summaries = await Promise.all(
    messageIds.map(async (messageId) => {
      const res = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "metadata",
        metadataHeaders: ["From", "Subject"],
      });
      const headers = res.data.payload?.headers;
      const { name: sender, email: senderEmail } = parseSenderHeader(headerValue(headers, "From"));
      return {
        messageId,
        sender,
        senderEmail,
        subject: headerValue(headers, "Subject") || "(no subject)",
        snippet: res.data.snippet ?? "",
      };
    })
  );
  return summaries;
}
