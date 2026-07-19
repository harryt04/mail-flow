import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanupReply } from './replyCleanup'

const mockCreate = vi.fn()

vi.mock('openai', () => ({
  default: vi.fn(function () {
    return {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }
  }),
}))

describe('cleanupReply', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the trimmed cleaned-up text from OpenAI', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '  Sounds good, see you then.  ' } }],
    })

    const result = await cleanupReply(
      'um yeah so like sounds good see you then',
      'test-api-key',
    )

    expect(result).toBe('Sounds good, see you then.')
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'um yeah so like sounds good see you then',
          }),
        ]),
      }),
    )
  })

  it('throws when OpenAI returns no text content', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: {} }] })

    await expect(cleanupReply('hello', 'test-api-key')).rejects.toThrow(
      'OpenAI did not return a text response',
    )
  })

  it('throws when OpenAI returns no choices', async () => {
    mockCreate.mockResolvedValue({ choices: [] })

    await expect(cleanupReply('hello', 'test-api-key')).rejects.toThrow(
      'OpenAI did not return a text response',
    )
  })
})
