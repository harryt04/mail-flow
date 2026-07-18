import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mintSttToken } from './stt'

vi.mock('@deepgram/sdk', () => ({
  DeepgramClient: vi.fn(function () {
    return {
      manage: {
        v1: {
          projects: {
            keys: {
              create: vi.fn().mockResolvedValue({ key: 'test-token-123' }),
            },
          },
        },
      },
    }
  }),
}))

describe('stt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DEEPGRAM_PROJECT_ID = 'test-project'
    process.env.DEEPGRAM_API_KEY = 'test-api-key'
  })

  it('mints an STT token via Deepgram Management API', async () => {
    const result = await mintSttToken()
    expect(result.key).toBe('test-token-123')
    expect(result.expiresInSeconds).toBe(60)
  })

  it('throws when DEEPGRAM_PROJECT_ID is missing', async () => {
    delete process.env.DEEPGRAM_PROJECT_ID
    await expect(mintSttToken()).rejects.toThrow('Missing DEEPGRAM_PROJECT_ID')
  })
})
