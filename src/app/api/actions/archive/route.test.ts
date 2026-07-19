import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ObjectId } from 'mongodb'

const {
  mockRequireUser,
  mockGetGmailClientForUser,
  mockArchiveMessage,
  mockAdvanceSession,
  mockBuildCheckpointResponse,
  mockIncrementTrialActionUsage,
} = vi.hoisted(() => ({
  mockRequireUser: vi.fn(),
  mockGetGmailClientForUser: vi.fn(),
  mockArchiveMessage: vi.fn(),
  mockAdvanceSession: vi.fn(),
  mockBuildCheckpointResponse: vi.fn(),
  mockIncrementTrialActionUsage: vi.fn(),
}))

vi.mock('@/lib/auth/requireUser', () => ({
  requireUser: mockRequireUser,
}))

vi.mock('@/lib/gmail/client', () => ({
  getGmailClientForUser: mockGetGmailClientForUser,
}))

vi.mock('@/lib/gmail/actions', () => ({
  archiveMessage: mockArchiveMessage,
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
  return new Request('http://localhost/api/actions/archive', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/actions/archive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockRequireUser.mockResolvedValue(null)

    const response = await POST(
      makeRequest({ sessionId: sessionId.toString(), messageId: 'msg-1' }),
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: 'Unauthorized',
      code: 'UNAUTHORIZED',
    })
    expect(mockGetGmailClientForUser).not.toHaveBeenCalled()
  })

  it('returns 400 when sessionId or messageId are missing', async () => {
    mockRequireUser.mockResolvedValue({ userId, email: 'a@example.com' })

    const response = await POST(
      makeRequest({ sessionId: sessionId.toString() }),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'sessionId and messageId are required',
      code: 'SESSION_MESSAGE_REQUIRED',
    })
  })

  it('returns 400 when fields have the wrong type', async () => {
    mockRequireUser.mockResolvedValue({ userId, email: 'a@example.com' })

    const response = await POST(
      makeRequest({ sessionId: sessionId.toString(), messageId: 123 }),
    )

    expect(response.status).toBe(400)
  })

  it('archives the message, increments trial usage, and advances the session with "archive"', async () => {
    mockRequireUser.mockResolvedValue({ userId, email: 'a@example.com' })
    const gmail = { fake: 'gmail-client' }
    mockGetGmailClientForUser.mockResolvedValue({
      gmail,
      user: { email: 'a@example.com' },
    })
    mockArchiveMessage.mockResolvedValue(undefined)
    mockIncrementTrialActionUsage.mockResolvedValue(undefined)
    const progress = { session: { _id: sessionId }, currentMessageId: null }
    mockAdvanceSession.mockResolvedValue(progress)
    const checkpointPayload = { done: true }
    mockBuildCheckpointResponse.mockResolvedValue(checkpointPayload)

    const response = await POST(
      makeRequest({ sessionId: sessionId.toString(), messageId: 'msg-1' }),
    )

    expect(mockGetGmailClientForUser).toHaveBeenCalledWith(userId.toString())
    expect(mockArchiveMessage).toHaveBeenCalledWith(gmail, 'msg-1')
    expect(mockIncrementTrialActionUsage).toHaveBeenCalledWith(userId)
    expect(mockAdvanceSession).toHaveBeenCalledWith(
      userId,
      expect.any(ObjectId),
      'msg-1',
      'archive',
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

  it('advances the session with "delete" when body.delete is true', async () => {
    mockRequireUser.mockResolvedValue({ userId, email: 'a@example.com' })
    const gmail = { fake: 'gmail-client' }
    mockGetGmailClientForUser.mockResolvedValue({
      gmail,
      user: { email: 'a@example.com' },
    })
    mockArchiveMessage.mockResolvedValue(undefined)
    mockIncrementTrialActionUsage.mockResolvedValue(undefined)
    const progress = { session: { _id: sessionId }, currentMessageId: 'msg-2' }
    mockAdvanceSession.mockResolvedValue(progress)
    mockBuildCheckpointResponse.mockResolvedValue({ done: false })

    await POST(
      makeRequest({
        sessionId: sessionId.toString(),
        messageId: 'msg-1',
        delete: true,
      }),
    )

    expect(mockAdvanceSession).toHaveBeenCalledWith(
      userId,
      expect.any(ObjectId),
      'msg-1',
      'delete',
    )
  })
})
