import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ObjectId } from 'mongodb'

const {
  mockRequireUser,
  mockGetGmailClientForUser,
  mockMoveMessageToLabel,
  mockAdvanceSession,
  mockBuildCheckpointResponse,
  mockIncrementTrialActionUsage,
} = vi.hoisted(() => ({
  mockRequireUser: vi.fn(),
  mockGetGmailClientForUser: vi.fn(),
  mockMoveMessageToLabel: vi.fn(),
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
  moveMessageToLabel: mockMoveMessageToLabel,
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
  return new Request('http://localhost/api/actions/move', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/actions/move', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockRequireUser.mockResolvedValue(null)

    const response = await POST(
      makeRequest({
        sessionId: sessionId.toString(),
        messageId: 'msg-1',
        labelId: 'Label_1',
        labelName: 'Receipts',
      }),
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: 'Unauthorized',
      code: 'UNAUTHORIZED',
    })
    expect(mockGetGmailClientForUser).not.toHaveBeenCalled()
  })

  it('returns 400 when required fields are missing', async () => {
    mockRequireUser.mockResolvedValue({ userId, email: 'a@example.com' })

    const response = await POST(
      makeRequest({ sessionId: sessionId.toString(), messageId: 'msg-1' }),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'sessionId, messageId, labelId, and labelName are required',
      code: 'MOVE_FIELDS_REQUIRED',
    })
  })

  it('returns 400 when a field has the wrong type', async () => {
    mockRequireUser.mockResolvedValue({ userId, email: 'a@example.com' })

    const response = await POST(
      makeRequest({
        sessionId: sessionId.toString(),
        messageId: 'msg-1',
        labelId: 'Label_1',
        labelName: 42,
      }),
    )

    expect(response.status).toBe(400)
  })

  it('moves the message, increments trial usage, and advances the session with "move"', async () => {
    mockRequireUser.mockResolvedValue({ userId, email: 'a@example.com' })
    const gmail = { fake: 'gmail-client' }
    mockGetGmailClientForUser.mockResolvedValue({
      gmail,
      user: { email: 'a@example.com' },
    })
    mockMoveMessageToLabel.mockResolvedValue(undefined)
    mockIncrementTrialActionUsage.mockResolvedValue(undefined)
    const progress = { session: { _id: sessionId }, currentMessageId: null }
    mockAdvanceSession.mockResolvedValue(progress)
    const checkpointPayload = { done: true }
    mockBuildCheckpointResponse.mockResolvedValue(checkpointPayload)

    const response = await POST(
      makeRequest({
        sessionId: sessionId.toString(),
        messageId: 'msg-1',
        labelId: 'Label_1',
        labelName: 'Receipts',
      }),
    )

    expect(mockGetGmailClientForUser).toHaveBeenCalledWith(userId.toString())
    expect(mockMoveMessageToLabel).toHaveBeenCalledWith(
      gmail,
      'msg-1',
      'Label_1',
    )
    expect(mockIncrementTrialActionUsage).toHaveBeenCalledWith(userId)
    expect(mockAdvanceSession).toHaveBeenCalledWith(
      userId,
      expect.any(ObjectId),
      'msg-1',
      'move',
      undefined,
      'Receipts',
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
