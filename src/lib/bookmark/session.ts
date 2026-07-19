import { ObjectId } from 'mongodb'
import type { gmail_v1 } from 'googleapis'
import {
  sessionsCollection,
  bookmarksCollection,
  emailActionLogsCollection,
  usersCollection,
} from '@/lib/db/collections'
import { buildInboxSnapshot } from '@/lib/gmail/list'
import { fetchMessage, fetchMessageLabelIds } from '@/lib/gmail/client'
import { parseGmailMessage } from '@/lib/gmail/parse'
import type {
  ListeningSessionDoc,
  InboxScope,
  InboxOrder,
  InboxCategory,
  EmailAction,
  CheckpointPayload,
} from '@/lib/types'

export interface SessionWithProgress {
  session: ListeningSessionDoc
  currentMessageId: string | null
  remaining: number
}

function toProgress(session: ListeningSessionDoc): SessionWithProgress {
  const currentMessageId =
    session.cursorIndex < session.messageIds.length
      ? session.messageIds[session.cursorIndex]
      : null
  return {
    session,
    currentMessageId,
    remaining: Math.max(session.messageIds.length - session.cursorIndex, 0),
  }
}

/**
 * Get-or-create the user's active listening session. If an active session
 * exists and matches the user's current scope/order/category/label settings,
 * it's resumed as-is. Otherwise (no session, or settings changed mid-flight)
 * a fresh snapshot is built and any existing active session is marked
 * exhausted — snapshots are immutable once created (IMPLEMENTATION-PLAN.md §3).
 */
export async function getOrCreateActiveSession(
  gmail: gmail_v1.Gmail,
  userId: ObjectId,
  scope: InboxScope,
  order: InboxOrder,
  category: InboxCategory,
  labelId?: string,
): Promise<SessionWithProgress> {
  const sessions = await sessionsCollection()
  const bookmarks = await bookmarksCollection()

  const existing = await sessions.findOne({ userId, status: 'active' })
  if (
    existing &&
    existing.scope === scope &&
    existing.order === order &&
    existing.category === category &&
    existing.labelId === labelId
  ) {
    return toProgress(existing)
  }

  if (existing) {
    await sessions.updateOne(
      { _id: existing._id },
      { $set: { status: 'exhausted', updatedAt: new Date() } },
    )
  }

  const { messageIds, totalEstimate } = await buildInboxSnapshot(
    gmail,
    scope,
    order,
    category,
    labelId,
  )
  const now = new Date()
  const newSession: ListeningSessionDoc = {
    _id: new ObjectId(),
    userId,
    status: 'active',
    scope,
    order,
    messageIds,
    cursorIndex: 0,
    totalEstimate,
    createdAt: now,
    updatedAt: now,
    category,
    ...(labelId ? { labelId } : {}),
  }
  await sessions.insertOne(newSession)

  await bookmarks.updateOne(
    { userId },
    {
      $set: {
        activeSessionId: newSession._id,
        lastProcessedMessageId: null,
        updatedAt: now,
      },
    },
    { upsert: true },
  )

  return toProgress(newSession)
}

export async function getActiveSessionProgress(
  userId: ObjectId,
): Promise<SessionWithProgress | null> {
  const sessions = await sessionsCollection()
  const session = await sessions.findOne({ userId, status: 'active' })
  return session ? toProgress(session) : null
}

/**
 * Advances the bookmark past `messageId` and logs the action taken. Uses an
 * atomic `findOneAndUpdate` ($inc) rather than a read-then-write — fine for
 * friends/family MVP scale (no cross-device locking needed), but avoids the
 * cheap-to-avoid race of two near-simultaneous advances clobbering each other.
 */
export async function advanceSession(
  userId: ObjectId,
  sessionId: ObjectId,
  messageId: string,
  action: EmailAction,
  replyText?: string,
  label?: string,
): Promise<SessionWithProgress> {
  const sessions = await sessionsCollection()
  const bookmarks = await bookmarksCollection()
  const logs = await emailActionLogsCollection()

  const updated = await sessions.findOneAndUpdate(
    { _id: sessionId, userId },
    { $inc: { cursorIndex: 1 }, $set: { updatedAt: new Date() } },
    { returnDocument: 'after' },
  )

  if (!updated) {
    throw new Error('Session not found')
  }

  if (
    updated.cursorIndex >= updated.messageIds.length &&
    updated.status === 'active'
  ) {
    await sessions.updateOne(
      { _id: sessionId },
      { $set: { status: 'exhausted', updatedAt: new Date() } },
    )
    updated.status = 'exhausted'
  }

  await Promise.all([
    bookmarks.updateOne(
      { userId },
      { $set: { lastProcessedMessageId: messageId, updatedAt: new Date() } },
      { upsert: true },
    ),
    logs.insertOne({
      _id: new ObjectId(),
      userId,
      sessionId,
      messageId,
      action,
      ...(replyText ? { replyText } : {}),
      ...(label ? { label } : {}),
      timestamp: new Date(),
    }),
  ])

  return toProgress(updated)
}

/**
 * Jumps the session's bookmark directly to a specific message (the inbox browser's
 * "Start here" action) — no Gmail side effect, no action log entry, since nothing was
 * actually done to the email, just navigation. `messageId` must belong to this session's
 * immutable snapshot; rejects otherwise so a stale/foreign ID can't corrupt `cursorIndex`.
 */
export async function jumpToMessage(
  userId: ObjectId,
  sessionId: ObjectId,
  messageId: string,
): Promise<SessionWithProgress> {
  const sessions = await sessionsCollection()

  const session = await sessions.findOne({ _id: sessionId, userId })
  if (!session) {
    throw new Error('Session not found')
  }

  const index = session.messageIds.indexOf(messageId)
  if (index === -1) {
    throw new Error("Message is not part of this session's snapshot")
  }

  const updated = await sessions.findOneAndUpdate(
    { _id: sessionId, userId },
    { $set: { cursorIndex: index, status: 'active', updatedAt: new Date() } },
    { returnDocument: 'after' },
  )
  if (!updated) {
    throw new Error('Session not found')
  }

  return toProgress(updated)
}

/**
 * Shared by every action route: resolves auto-skip (silently advancing past
 * messages matching the user's `autoSkipCategories`, bounded by remaining
 * snapshot size so an all-promotional inbox can't loop forever) then fetches
 * + parses whatever email the session now points at.
 */
export async function buildCheckpointResponse(
  gmail: gmail_v1.Gmail,
  userId: ObjectId,
  progress: SessionWithProgress,
): Promise<CheckpointPayload> {
  const users = await usersCollection()
  const user = await users.findOne({ _id: userId })
  const autoSkipCategories = user?.settings.autoSkipCategories ?? []

  let current = progress
  if (autoSkipCategories.length > 0) {
    let iterations = 0
    const maxIterations = current.session.messageIds.length
    while (current.currentMessageId && iterations < maxIterations) {
      const labelIds = await fetchMessageLabelIds(
        gmail,
        current.currentMessageId,
      )
      const categoryLabelMap: Record<string, string> = {
        CATEGORY_PROMOTIONS: 'promotions',
        CATEGORY_SOCIAL: 'social',
        CATEGORY_UPDATES: 'updates',
        CATEGORY_FORUMS: 'forums',
      }
      const messageCategories = labelIds
        .map((id) => categoryLabelMap[id])
        .filter((c): c is string => Boolean(c))
      const shouldSkip = messageCategories.some((c) =>
        autoSkipCategories.includes(c as InboxCategory),
      )
      if (!shouldSkip) break
      current = await advanceSession(
        userId,
        current.session._id,
        current.currentMessageId,
        'skip',
      )
      iterations++
    }
  }

  const totalEstimate =
    current.session.totalEstimate ?? current.session.messageIds.length
  const snapshotSize = current.session.messageIds.length

  if (!current.currentMessageId) {
    return {
      sessionId: current.session._id.toString(),
      remaining: 0,
      email: null,
      sessionExhausted: current.session.status === 'exhausted',
      totalEstimate,
      snapshotSize,
    }
  }

  const message = await fetchMessage(gmail, current.currentMessageId)
  const email = parseGmailMessage(message)

  return {
    sessionId: current.session._id.toString(),
    remaining: current.remaining,
    email,
    sessionExhausted: false,
    totalEstimate,
    snapshotSize,
  }
}
