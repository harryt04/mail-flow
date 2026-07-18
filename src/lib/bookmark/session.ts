import { ObjectId } from "mongodb";
import type { gmail_v1 } from "googleapis";
import {
  sessionsCollection,
  bookmarksCollection,
  emailActionLogsCollection,
} from "@/lib/db/collections";
import { buildInboxSnapshot } from "@/lib/gmail/list";
import { fetchMessage } from "@/lib/gmail/client";
import { parseGmailMessage } from "@/lib/gmail/parse";
import type {
  ListeningSessionDoc,
  InboxScope,
  InboxOrder,
  EmailAction,
  CheckpointPayload,
} from "@/lib/types";

export interface SessionWithProgress {
  session: ListeningSessionDoc;
  currentMessageId: string | null;
  remaining: number;
}

function toProgress(session: ListeningSessionDoc): SessionWithProgress {
  const currentMessageId =
    session.cursorIndex < session.messageIds.length
      ? session.messageIds[session.cursorIndex]
      : null;
  return {
    session,
    currentMessageId,
    remaining: Math.max(session.messageIds.length - session.cursorIndex, 0),
  };
}

/**
 * Get-or-create the user's active listening session. If an active session
 * exists and matches the user's current scope/order settings, it's resumed
 * as-is. Otherwise (no session, or settings changed mid-flight) a fresh
 * snapshot is built and any existing active session is marked exhausted —
 * snapshots are immutable once created (IMPLEMENTATION-PLAN.md §3).
 */
export async function getOrCreateActiveSession(
  gmail: gmail_v1.Gmail,
  userId: ObjectId,
  scope: InboxScope,
  order: InboxOrder
): Promise<SessionWithProgress> {
  const sessions = await sessionsCollection();
  const bookmarks = await bookmarksCollection();

  const existing = await sessions.findOne({ userId, status: "active" });
  if (existing && existing.scope === scope && existing.order === order) {
    return toProgress(existing);
  }

  if (existing) {
    await sessions.updateOne(
      { _id: existing._id },
      { $set: { status: "exhausted", updatedAt: new Date() } }
    );
  }

  const { messageIds, totalEstimate } = await buildInboxSnapshot(gmail, scope, order);
  const now = new Date();
  const newSession: ListeningSessionDoc = {
    _id: new ObjectId(),
    userId,
    status: "active",
    scope,
    order,
    messageIds,
    cursorIndex: 0,
    totalEstimate,
    createdAt: now,
    updatedAt: now,
  };
  await sessions.insertOne(newSession);

  await bookmarks.updateOne(
    { userId },
    {
      $set: {
        activeSessionId: newSession._id,
        lastProcessedMessageId: null,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  return toProgress(newSession);
}

export async function getActiveSessionProgress(
  userId: ObjectId
): Promise<SessionWithProgress | null> {
  const sessions = await sessionsCollection();
  const session = await sessions.findOne({ userId, status: "active" });
  return session ? toProgress(session) : null;
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
  replyText?: string
): Promise<SessionWithProgress> {
  const sessions = await sessionsCollection();
  const bookmarks = await bookmarksCollection();
  const logs = await emailActionLogsCollection();

  const updated = await sessions.findOneAndUpdate(
    { _id: sessionId, userId },
    { $inc: { cursorIndex: 1 }, $set: { updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!updated) {
    throw new Error("Session not found");
  }

  if (updated.cursorIndex >= updated.messageIds.length && updated.status === "active") {
    await sessions.updateOne(
      { _id: sessionId },
      { $set: { status: "exhausted", updatedAt: new Date() } }
    );
    updated.status = "exhausted";
  }

  await Promise.all([
    bookmarks.updateOne(
      { userId },
      { $set: { lastProcessedMessageId: messageId, updatedAt: new Date() } },
      { upsert: true }
    ),
    logs.insertOne({
      _id: new ObjectId(),
      userId,
      sessionId,
      messageId,
      action,
      ...(replyText ? { replyText } : {}),
      timestamp: new Date(),
    }),
  ]);

  return toProgress(updated);
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
  messageId: string
): Promise<SessionWithProgress> {
  const sessions = await sessionsCollection();

  const session = await sessions.findOne({ _id: sessionId, userId });
  if (!session) {
    throw new Error("Session not found");
  }

  const index = session.messageIds.indexOf(messageId);
  if (index === -1) {
    throw new Error("Message is not part of this session's snapshot");
  }

  const updated = await sessions.findOneAndUpdate(
    { _id: sessionId, userId },
    { $set: { cursorIndex: index, status: "active", updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  if (!updated) {
    throw new Error("Session not found");
  }

  return toProgress(updated);
}

/** Shared by every action route: fetches + parses whatever email the session now points at. */
export async function buildCheckpointResponse(
  gmail: gmail_v1.Gmail,
  progress: SessionWithProgress
): Promise<CheckpointPayload> {
  const totalEstimate = progress.session.totalEstimate ?? progress.session.messageIds.length;
  const snapshotSize = progress.session.messageIds.length;

  if (!progress.currentMessageId) {
    return {
      sessionId: progress.session._id.toString(),
      remaining: 0,
      email: null,
      sessionExhausted: progress.session.status === "exhausted",
      totalEstimate,
      snapshotSize,
    };
  }

  const message = await fetchMessage(gmail, progress.currentMessageId);
  const email = parseGmailMessage(message);

  return {
    sessionId: progress.session._id.toString(),
    remaining: progress.remaining,
    email,
    sessionExhausted: false,
    totalEstimate,
    snapshotSize,
  };
}
