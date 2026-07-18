import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTtsProvider } from './tts'

const mockSpeechCreate = vi.fn()

vi.mock('openai', () => {
  class MockOpenAI {
    audio = { speech: { create: mockSpeechCreate } }
  }
  return { default: MockOpenAI }
})

describe('TTS', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'test-key'
    mockSpeechCreate.mockResolvedValue({
      body: new ReadableStream(),
    })
  })

  it('synthesizes text via OpenAI', async () => {
    const provider = getTtsProvider()
    const result = await provider.synthesize('Hello world')
    expect(result).toBeInstanceOf(ReadableStream)
    expect(mockSpeechCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini-tts',
        input: 'Hello world',
      }),
    )
  })

  it('includes voiceTone in instructions if provided', async () => {
    const provider = getTtsProvider()
    await provider.synthesize('Test', { voiceTone: 'energetic' })
    expect(mockSpeechCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: expect.stringContaining('energetic'),
      }),
    )
  })
})
