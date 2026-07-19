import { beforeEach, describe, expect, it, vi } from 'vitest'
import { transcribe } from './stt'

const mockCreate = vi.fn()

vi.mock('openai', () => ({
  default: vi.fn(function () {
    return {
      audio: {
        transcriptions: {
          create: mockCreate,
        },
      },
    }
  }),
}))

vi.mock('openai/uploads', () => ({
  toFile: vi.fn(async (blob: Blob, name: string) => ({ blob, name })),
}))

describe('stt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('transcribes a recorded clip via OpenAI', async () => {
    mockCreate.mockResolvedValue({ text: 'archive this email' })

    const result = await transcribe(new Blob(['fake wav']), 'test-api-key')

    expect(result).toBe('archive this email')
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini-transcribe' }),
    )
  })

  it('returns an empty string when OpenAI returns no text', async () => {
    mockCreate.mockResolvedValue({ text: undefined })

    const result = await transcribe(new Blob(['fake wav']), 'test-api-key')

    expect(result).toBe('')
  })
})
