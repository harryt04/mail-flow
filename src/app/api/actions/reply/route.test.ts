import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ObjectId } from 'mongodb'

const {
  mockRequireUser,
  mockGetGmailClientForUser,
  mockFetchMessage,
  mockParseGmailMessage,
  mockSendReply,
  mockAdvanceSession,
  mockBuildCheckpointResponse,
  mockIncrementTrialActionUsage,
} = vi.hoisted(() => ({
  mockRequireUser: vi.fn(),
  mockGetGmailClientForUser: vi.fn(),
  mockFetchMessage: vi.fn(),
  mockParseGmailMessage: vi.fn(),
  mockSendReply: vi.fn(),
  mockAdvanceSession: vi.fn(),
  mockBuildCheckpointResponse: vi.fn(),
  mockIncrementTrialActionUsage: vi.fn(),
}))

vi.mock('@/lib/auth/requireUser', () => ({
  requireUser: mockRequireUser,
}))

vi.mock('@/lib/gmail/client', () => ({
  getGmailClientForUser: mockGetGmailClientForUser,
  fetchMessage: mockFetchMessage,
}))

vi.mock('@/lib/gmail/parse', () => ({
  parseGmailMessage: mockParseGmailMessage,
}))

vi.mock('@/lib/gmail/actions', () => ({
  sendReply: mockSendReply,
}))

vi.mock('@/lib/bookmark/session', () => ({
  advanceSession: mockAdvanceSession,
  buildCheckpointResponse: mockBuildCheckpointResponse,
}))

vi.mock('@/lib/auth/openaiKey', () => ({
  incrementTrialActionUsage: mockIncrementTrialActionUsage,
}))

import { POST } from './route'

const userId = new ObjectId()
const sessionId = new ObjectId()

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/actions/reply', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/actions/reply', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockRequireUser.mockResolvedValue(null)

    const response = await POST(
      makeRequest({
        sessionId: sessionId.toString(),
        messageId: 'msg-1',
        replyText: 'Thanks!',
      }),
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: 'Unauthorized',
      code: 'UNAUTHORIZED',
    })
    expect(mockGetGmailClientForUser).not.toHaveBeenCalled()
  })

  it('returns 400 when sessionId/messageId/replyText are missing', async () => {
    mockRequireUser.mockResolvedValue({ userId, email: 'a@example.com' })

    const response = await POST(
      makeRequest({ sessionId: sessionId.toString(), messageId: 'msg-1' }),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'sessionId, messageId, and replyText are required',
      code: 'REPLY_FIELDS_REQUIRED',
    })
  })

  it('returns 400 when replyText is empty/whitespace', async () => {
    mockRequireUser.mockResolvedValue({ userId, email: 'a@example.com' })

    const response = await POST(
      makeRequest({
        sessionId: sessionId.toString(),
        messageId: 'msg-1',
        replyText: '   ',
      }),
    )

    expect(response.status).toBe(400)
  })

  it('sends the reply, increments trial usage, and advances the session with "reply"', async () => {
    mockRequireUser.mockResolvedValue({ userId, email: 'me@example.com' })
    const gmail = { fake: 'gmail-client' }
    mockGetGmailClientForUser.mockResolvedValue({
      gmail,
      user: { email: 'me@example.com' },
    })
    const rawMessage = { id: 'msg-1' }
    mockFetchMessage.mockResolvedValue(rawMessage)
    const parsed = {
      threadId: 'thread-1',
      senderEmail: 'sender@example.com',
      subject: 'Hello',
    }
    mockParseGmailMessage.mockReturnValue(parsed)
    mockSendReply.mockResolvedValue(undefined)
    mockIncrementTrialActionUsage.mockResolvedValue(undefined)
    const progress = { session: { _id: sessionId }, currentMessageId: null }
    mockAdvanceSession.mockResolvedValue(progress)
    const checkpointPayload = { done: true }
    mockBuildCheckpointResponse.mockResolvedValue(checkpointPayload)

    const response = await POST(
      makeRequest({
        sessionId: sessionId.toString(),
        messageId: 'msg-1',
        replyText: 'Thanks!',
      }),
    )

    expect(mockGetGmailClientForUser).toHaveBeenCalledWith(userId.toString())
    expect(mockFetchMessage).toHaveBeenCalledWith(gmail, 'msg-1')
    expect(mockParseGmailMessage).toHaveBeenCalledWith(rawMessage)
    expect(mockSendReply).toHaveBeenCalledWith({
      gmail,
      threadId: 'thread-1',
      originalMessageId: 'msg-1',
      toEmail: 'sender@example.com',
      fromEmail: 'me@example.com',
      subject: 'Hello',
      bodyText: 'Thanks!',
    })
    expect(mockIncrementTrialActionUsage).toHaveBeenCalledWith(userId)
    expect(mockAdvanceSession).toHaveBeenCalledWith(
      userId,
      expect.any(ObjectId),
      'msg-1',
      'reply',
      'Thanks!',
    )
    expect(mockAdvanceSession.mock.calls[0][1].toString()).toBe(
      sessionId.toString(),
    )
    expect(mockBuildCheckpointResponse).toHaveBeenCalledWith(
      gmail,
      userId,
      progress,
    )
    expect(await response.json()).toEqual(checkpointPayload)
  })
})
