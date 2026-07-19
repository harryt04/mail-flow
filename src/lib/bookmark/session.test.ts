import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import type { gmail_v1 } from 'googleapis'
import { buildCheckpointResponse } from './session'
import type { ListeningSessionDoc, SessionWithProgress } from '@/lib/types'

vi.mock('@/lib/db/collections', () => ({
  sessionsCollection: vi.fn(),
  bookmarksCollection: vi.fn(),
  emailActionLogsCollection: vi.fn(),
  usersCollection: vi.fn(),
}))

vi.mock('@/lib/gmail/client', () => ({
  fetchMessage: vi.fn(),
  fetchMessageLabelIds: vi.fn(),
}))

vi.mock('@/lib/gmail/parse', () => ({
  parseGmailMessage: vi.fn(),
}))

import {
  sessionsCollection,
  bookmarksCollection,
  emailActionLogsCollection,
  usersCollection,
} from '@/lib/db/collections'
import { fetchMessage, fetchMessageLabelIds } from '@/lib/gmail/client'
import { parseGmailMessage } from '@/lib/gmail/parse'

function createMockSession(
  overrides: Partial<ListeningSessionDoc> = {},
): ListeningSessionDoc {
  return {
    _id: new ObjectId(),
    userId: new ObjectId(),
    status: 'active',
    scope: 'all',
    order: 'oldest',
    messageIds: ['msg-1', 'msg-2', 'msg-3'],
    cursorIndex: 0,
    totalEstimate: 3,
    category: 'primary',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createProgress(session: ListeningSessionDoc): SessionWithProgress {
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

describe('buildCheckpointResponse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not fetch message labels when autoSkipCategories is empty', async () => {
    const mockGmail = {} as unknown as gmail_v1.Gmail
    const userId = new ObjectId()
    const session = createMockSession({ userId })
    const progress = createProgress(session)

    const usersCollectionMock = {
      findOne: vi.fn().mockResolvedValue({
        _id: userId,
        settings: { autoSkipCategories: [] },
      }),
    }
    vi.mocked(usersCollection).mockResolvedValue(
      usersCollectionMock as unknown as typeof usersCollection,
    )

    const parsedEmail = {
      messageId: 'msg-1',
      threadId: 'thread-1',
      sender: 'Jane Doe',
      senderEmail: 'jane@example.com',
      subject: 'Test',
      paragraphs: ['Test email'],
    }
    vi.mocked(fetchMessage).mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof fetchMessage>>,
    )
    vi.mocked(parseGmailMessage).mockReturnValue(parsedEmail)

    const result = await buildCheckpointResponse(mockGmail, userId, progress)

    expect(vi.mocked(fetchMessageLabelIds)).not.toHaveBeenCalled()
    expect(vi.mocked(fetchMessage)).toHaveBeenCalledWith(mockGmail, 'msg-1')
    expect(result.email).toEqual(parsedEmail)
  })

  it('advances past a message matching an auto-skip category', async () => {
    const mockGmail = {} as unknown as gmail_v1.Gmail
    const userId = new ObjectId()
    const sessionId = new ObjectId()
    const session = createMockSession({ _id: sessionId, userId })
    const progress = createProgress(session)

    const usersCollectionMock = {
      findOne: vi.fn().mockResolvedValue({
        _id: userId,
        settings: { autoSkipCategories: ['promotions'] },
      }),
    }
    vi.mocked(usersCollection).mockResolvedValue(
      usersCollectionMock as unknown as typeof usersCollection,
    )

    // First message (msg-1) has promotions label and should be skipped
    vi.mocked(fetchMessageLabelIds)
      .mockResolvedValueOnce(['CATEGORY_PROMOTIONS'])
      .mockResolvedValueOnce(['INBOX']) // msg-2 is not promotional

    // Mock advanceSession by providing updated session
    const updatedSession = createMockSession({
      _id: sessionId,
      userId,
      cursorIndex: 1,
    })

    const sessionsCollectionMock = {
      findOne: vi.fn().mockResolvedValue(updatedSession),
      findOneAndUpdate: vi.fn().mockResolvedValue(updatedSession),
      updateOne: vi.fn().mockResolvedValue({}),
    }
    vi.mocked(sessionsCollection).mockResolvedValue(
      sessionsCollectionMock as unknown as typeof sessionsCollection,
    )

    const bookmarksCollectionMock = {
      updateOne: vi.fn().mockResolvedValue({}),
    }
    vi.mocked(bookmarksCollection).mockResolvedValue(
      bookmarksCollectionMock as unknown as typeof bookmarksCollection,
    )

    const logsCollectionMock = {
      insertOne: vi.fn().mockResolvedValue({}),
    }
    vi.mocked(emailActionLogsCollection).mockResolvedValue(
      logsCollectionMock as unknown as typeof emailActionLogsCollection,
    )

    const parsedEmail = {
      messageId: 'msg-2',
      threadId: 'thread-2',
      sender: 'John Smith',
      senderEmail: 'john@example.com',
      subject: 'Work',
      paragraphs: ['Work email'],
    }
    vi.mocked(fetchMessage).mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof fetchMessage>>,
    )
    vi.mocked(parseGmailMessage).mockReturnValue(parsedEmail)

    const result = await buildCheckpointResponse(mockGmail, userId, progress)

    // Should have called fetchMessageLabelIds for msg-1
    expect(vi.mocked(fetchMessageLabelIds)).toHaveBeenCalledWith(
      mockGmail,
      'msg-1',
    )
    // Should have advanced the session (called findOneAndUpdate to increment cursor)
    expect(sessionsCollectionMock.findOneAndUpdate).toHaveBeenCalled()
    // Final email should be from msg-2, not msg-1
    expect(vi.mocked(fetchMessage)).toHaveBeenCalledWith(mockGmail, 'msg-2')
    expect(result.email).toEqual(parsedEmail)
  })

  it('terminates auto-skip loop when all remaining messages match skip categories', async () => {
    const mockGmail = {} as unknown as gmail_v1.Gmail
    const userId = new ObjectId()
    const sessionId = new ObjectId()
    const session = createMockSession({
      _id: sessionId,
      userId,
      messageIds: ['msg-1', 'msg-2'],
      cursorIndex: 0,
    })
    const progress = createProgress(session)

    const usersCollectionMock = {
      findOne: vi.fn().mockResolvedValue({
        _id: userId,
        settings: { autoSkipCategories: ['promotions', 'social'] },
      }),
    }
    vi.mocked(usersCollection).mockResolvedValue(
      usersCollectionMock as unknown as typeof usersCollection,
    )

    // Both messages are promotional, so loop will keep advancing
    vi.mocked(fetchMessageLabelIds)
      .mockResolvedValueOnce(['CATEGORY_PROMOTIONS'])
      .mockResolvedValueOnce(['CATEGORY_SOCIAL'])

    // After advancing msg-1, session points to msg-2
    const updatedSessionAfterFirst = createMockSession({
      _id: sessionId,
      userId,
      messageIds: ['msg-1', 'msg-2'],
      cursorIndex: 1,
    })

    // After advancing msg-2, session is exhausted
    const exhaustedSession = createMockSession({
      _id: sessionId,
      userId,
      messageIds: ['msg-1', 'msg-2'],
      cursorIndex: 2,
      status: 'exhausted',
    })

    const sessionsCollectionMock = {
      findOne: vi.fn().mockResolvedValue(exhaustedSession),
      findOneAndUpdate: vi
        .fn()
        .mockResolvedValueOnce(updatedSessionAfterFirst)
        .mockResolvedValueOnce(exhaustedSession),
      updateOne: vi.fn().mockResolvedValue({}),
    }
    vi.mocked(sessionsCollection).mockResolvedValue(
      sessionsCollectionMock as unknown as typeof sessionsCollection,
    )

    const bookmarksCollectionMock = {
      updateOne: vi.fn().mockResolvedValue({}),
    }
    vi.mocked(bookmarksCollection).mockResolvedValue(
      bookmarksCollectionMock as unknown as typeof bookmarksCollection,
    )

    const logsCollectionMock = {
      insertOne: vi.fn().mockResolvedValue({}),
    }
    vi.mocked(emailActionLogsCollection).mockResolvedValue(
      logsCollectionMock as unknown as typeof emailActionLogsCollection,
    )

    vi.mocked(fetchMessage).mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof fetchMessage>>,
    )
    vi.mocked(parseGmailMessage).mockReturnValue({
      messageId: '',
      threadId: '',
      sender: '',
      senderEmail: '',
      subject: '',
      paragraphs: [],
    })

    const result = await buildCheckpointResponse(mockGmail, userId, progress)

    // Session should be exhausted with no email
    expect(result.sessionExhausted).toBe(true)
    expect(result.email).toBeNull()
    expect(result.remaining).toBe(0)
  })

  it('returns email: null and sessionExhausted: true when current message is null', async () => {
    const mockGmail = {} as unknown as gmail_v1.Gmail
    const userId = new ObjectId()
    const session = createMockSession({
      userId,
      messageIds: ['msg-1'],
      cursorIndex: 1, // Points past the end
      status: 'exhausted', // Session is exhausted
    })
    const progress = createProgress(session)

    const usersCollectionMock = {
      findOne: vi.fn().mockResolvedValue({
        _id: userId,
        settings: { autoSkipCategories: [] },
      }),
    }
    vi.mocked(usersCollection).mockResolvedValue(
      usersCollectionMock as unknown as typeof usersCollection,
    )

    const result = await buildCheckpointResponse(mockGmail, userId, progress)

    expect(result.email).toBeNull()
    expect(result.sessionExhausted).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('respects the iteration limit to prevent infinite loops', async () => {
    const mockGmail = {} as unknown as gmail_v1.Gmail
    const userId = new ObjectId()
    const sessionId = new ObjectId()
    const session = createMockSession({
      _id: sessionId,
      userId,
      messageIds: ['msg-1', 'msg-2', 'msg-3'],
      cursorIndex: 0,
    })
    const progress = createProgress(session)

    const usersCollectionMock = {
      findOne: vi.fn().mockResolvedValue({
        _id: userId,
        settings: { autoSkipCategories: ['promotions'] },
      }),
    }
    vi.mocked(usersCollection).mockResolvedValue(
      usersCollectionMock as unknown as typeof usersCollection,
    )

    // All messages return promotions label
    vi.mocked(fetchMessageLabelIds).mockResolvedValue(['CATEGORY_PROMOTIONS'])

    // Mock sessions to always increment cursor but stay active
    const sessionsCollectionMock = {
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      updateOne: vi.fn(),
    }

    // Set up mock to track cursor progression
    let currentCursor = 0
    sessionsCollectionMock.findOneAndUpdate.mockImplementation(async () => {
      currentCursor++
      return createMockSession({
        _id: sessionId,
        userId,
        messageIds: ['msg-1', 'msg-2', 'msg-3'],
        cursorIndex: currentCursor,
      })
    })

    vi.mocked(sessionsCollection).mockResolvedValue(
      sessionsCollectionMock as unknown as typeof sessionsCollection,
    )

    const bookmarksCollectionMock = {
      updateOne: vi.fn().mockResolvedValue({}),
    }
    vi.mocked(bookmarksCollection).mockResolvedValue(
      bookmarksCollectionMock as unknown as typeof bookmarksCollection,
    )

    const logsCollectionMock = {
      insertOne: vi.fn().mockResolvedValue({}),
    }
    vi.mocked(emailActionLogsCollection).mockResolvedValue(
      logsCollectionMock as unknown as typeof emailActionLogsCollection,
    )

    const parsedEmail = {
      messageId: 'msg-1',
      threadId: 'thread-1',
      sender: 'Test',
      senderEmail: 'test@example.com',
      subject: 'Test',
      paragraphs: ['Test'],
    }
    vi.mocked(fetchMessage).mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof fetchMessage>>,
    )
    vi.mocked(parseGmailMessage).mockReturnValue(parsedEmail)

    const result = await buildCheckpointResponse(mockGmail, userId, progress)

    // Loop should terminate after checking remaining.length iterations (3 in this case)
    // We expect at most session.messageIds.length calls to fetchMessageLabelIds
    expect(
      vi.mocked(fetchMessageLabelIds).mock.calls.length,
    ).toBeLessThanOrEqual(session.messageIds.length)
    // Result should still have an email or be exhausted, not hang
    expect(result).toBeDefined()
  })
})
