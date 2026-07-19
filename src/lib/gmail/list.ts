import type { gmail_v1 } from 'googleapis'
import type { InboxScope, InboxOrder, InboxCategory } from '@/lib/types'
import { headerValue, parseSenderHeader } from '@/lib/gmail/parse'

// Friends/family MVP scale (PRD §3) — cap a single snapshot so a truly pathological
// inbox can't turn "Start Listening" into an unbounded pagination loop. This is deliberately
// generous (well beyond the "thousands of unread emails" persona PRD §3 targets) — a real
// user with 2,275 unread was previously hitting the old 2,000 cap and seeing a wrong count.
const MAX_SNAPSHOT_SIZE = 20000
const PAGE_SIZE = 500

const CATEGORY_LABEL_IDS: Record<Exclude<InboxCategory, 'all'>, string> = {
  primary: 'CATEGORY_PERSONAL',
  promotions: 'CATEGORY_PROMOTIONS',
  social: 'CATEGORY_SOCIAL',
  updates: 'CATEGORY_UPDATES',
  forums: 'CATEGORY_FORUMS',
}

export interface InboxSnapshot {
  messageIds: string[]
  /** Gmail's own approximation of total matching messages (`resultSizeEstimate`), captured from the first page — always an estimate, never exact for large mailboxes. */
  totalEstimate: number
}

/**
 * Builds a stable, ordered message-ID snapshot for a listening session.
 * Gmail's list API returns newest-first; we reverse for oldest-first so the
 * snapshot itself encodes the order the plan walks through it.
 * Uses labelIds-based filtering for precise category/label selection to avoid
 * category leakage (e.g. Promotions/Social/Updates/Forums tabs). MAX_SNAPSHOT_SIZE
 * and PAGE_SIZE cap pagination as documented above.
 */
export async function buildInboxSnapshot(
  gmail: gmail_v1.Gmail,
  scope: InboxScope,
  order: InboxOrder,
  category: InboxCategory,
  labelId?: string,
): Promise<InboxSnapshot> {
  const labelIds = ['INBOX']
  if (labelId) {
    labelIds.push(labelId)
  } else if (category !== 'all') {
    labelIds.push(CATEGORY_LABEL_IDS[category])
  }

  const q = scope === 'unread' ? 'is:unread' : undefined
  const messageIds: string[] = []
  let pageToken: string | undefined
  let totalEstimate: number | undefined

  do {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q,
      labelIds,
      maxResults: PAGE_SIZE,
      pageToken,
    })

    if (totalEstimate === undefined) {
      totalEstimate = res.data.resultSizeEstimate ?? undefined
    }

    for (const message of res.data.messages ?? []) {
      if (message.id) messageIds.push(message.id)
    }

    pageToken = res.data.nextPageToken ?? undefined
  } while (pageToken && messageIds.length < MAX_SNAPSHOT_SIZE)

  const capped = messageIds.slice(0, MAX_SNAPSHOT_SIZE)
  return {
    messageIds: order === 'oldest' ? capped.reverse() : capped,
    totalEstimate: totalEstimate ?? messageIds.length,
  }
}

export interface EmailSummary {
  messageId: string
  sender: string
  senderEmail: string
  subject: string
  snippet: string
  receivedAt: string
  unread: boolean
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
  messageIds: string[],
): Promise<EmailSummary[]> {
  const summaries = await Promise.all(
    messageIds.map(async (messageId) => {
      const res = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject'],
      })
      const headers = res.data.payload?.headers
      const { name: sender, email: senderEmail } = parseSenderHeader(
        headerValue(headers, 'From'),
      )
      return {
        messageId,
        sender,
        senderEmail,
        subject: headerValue(headers, 'Subject') || '(no subject)',
        snippet: res.data.snippet ?? '',
        receivedAt: res.data.internalDate ?? '',
        unread: (res.data.labelIds ?? []).includes('UNREAD'),
      }
    }),
  )
  return summaries
}

export interface MessageSearchResult {
  items: EmailSummary[]
  nextPageToken?: string
}

/**
 * Server-side Gmail search for the /inbox browser's search box — issues a real Gmail
 * query (not a filter over already-loaded rows), scoped to the inbox and optionally a
 * category, paginated via Gmail's own opaque pageToken cursor (search results aren't a
 * stable slice-able list the way a snapshot is).
 */
export async function searchMessages(
  gmail: gmail_v1.Gmail,
  query: string,
  category: InboxCategory,
  pageToken?: string,
): Promise<MessageSearchResult> {
  const labelIds = ['INBOX']
  if (category !== 'all') labelIds.push(CATEGORY_LABEL_IDS[category])

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    labelIds,
    maxResults: 25,
    pageToken,
  })

  const messageIds = (res.data.messages ?? [])
    .map((m) => m.id)
    .filter((id): id is string => Boolean(id))

  const items = await fetchMessageSummaries(gmail, messageIds)
  return { items, nextPageToken: res.data.nextPageToken ?? undefined }
}
