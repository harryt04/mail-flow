import type { gmail_v1 } from "googleapis";
import type { InboxScope, InboxOrder } from "@/lib/types";

// Friends/family MVP scale (PRD §3) — cap a single snapshot so one huge
// inbox can't turn "Start Listening" into a runaway pagination loop.
const MAX_SNAPSHOT_SIZE = 2000;
const PAGE_SIZE = 500;

/**
 * Builds a stable, ordered message-ID snapshot for a listening session.
 * Gmail's list API returns newest-first; we reverse for oldest-first so the
 * snapshot itself encodes the order the plan walks through it.
 */
export async function buildInboxSnapshot(
  gmail: gmail_v1.Gmail,
  scope: InboxScope,
  order: InboxOrder
): Promise<string[]> {
  const query = scope === "unread" ? "in:inbox is:unread" : "in:inbox";
  const messageIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: PAGE_SIZE,
      pageToken,
    });

    for (const message of res.data.messages ?? []) {
      if (message.id) messageIds.push(message.id);
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken && messageIds.length < MAX_SNAPSHOT_SIZE);

  const capped = messageIds.slice(0, MAX_SNAPSHOT_SIZE);
  return order === "oldest" ? capped.reverse() : capped;
}
