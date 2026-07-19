import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { preWarmAudio, useVoiceSession } from './useVoiceSession'

/** Fake MediaStreamTrack with a stop() spy. */
function makeTrack() {
  return { stop: vi.fn() }
}

/** Fake MediaStream returned by getUserMedia. */
function makeStream() {
  const tracks = [makeTrack()]
  return { getTracks: () => tracks }
}

/** Fake AudioWorkletNode instance — captured so tests can push PCM frames via port.onmessage. */
let lastWorkletNode: {
  port: { onmessage: ((event: { data: ArrayBuffer }) => void) | null }
  connect: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
} | null = null

function installWebAudioMocks() {
  const getUserMedia = vi.fn().mockResolvedValue(makeStream())
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia },
    configurable: true,
    writable: true,
  })

  class MockAudioContext {
    sampleRate = 48000
    audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) }
    createMediaStreamSource = vi.fn().mockReturnValue({
      connect: vi.fn(),
      disconnect: vi.fn(),
    })
  }

  function MockAudioWorkletNode() {
    const node = {
      port: { onmessage: null } as {
        onmessage: ((event: { data: ArrayBuffer }) => void) | null
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }
    lastWorkletNode = node
    return node
  }

  // @ts-expect-error -- test mock, not a full AudioContext implementation
  global.AudioContext = MockAudioContext
  // @ts-expect-error -- test mock, not a full AudioWorkletNode implementation
  global.AudioWorkletNode = MockAudioWorkletNode

  return { getUserMedia }
}

/** Builds a fake PCM frame (Int16Array as ArrayBuffer) at the given normalized amplitude (0..1). */
function makeFrame(amplitude: number, length = 128): ArrayBuffer {
  const frame = new Int16Array(length)
  const sample = Math.round(amplitude * 0x8000)
  for (let i = 0; i < length; i++) {
    frame[i] = i % 2 === 0 ? sample : -sample
  }
  return frame.buffer
}

describe('useVoiceSession', () => {
  beforeEach(() => {
    installWebAudioMocks()
    global.fetch = vi.fn()
    lastWorkletNode = null
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('starts in idle state', () => {
    const { result } = renderHook(() => useVoiceSession())
    expect(result.current.state).toBe('idle')
  })

  it('transitions through connecting to listening when the mic opens', async () => {
    const { result } = renderHook(() => useVoiceSession())

    let listenPromise: Promise<string>
    act(() => {
      listenPromise = result.current.listen({
        silenceTimeoutMs: 10_000,
        maxDurationMs: 20_000,
      })
    })

    await waitFor(() => expect(result.current.state).toBe('listening'), {
      interval: 5,
    })

    // Clean up the pending promise so it doesn't leak into other tests.
    act(() => {
      result.current.cancel()
    })
    await expect(listenPromise!).rejects.toThrow('Listening cancelled')
  })

  it('captures PCM frames, resolves the transcript on silence timeout, and posts to /api/stt/transcribe', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ transcript: '  hello world  ' }),
    })

    const { result } = renderHook(() => useVoiceSession())

    let listenPromise: Promise<string>
    act(() => {
      listenPromise = result.current.listen({
        silenceTimeoutMs: 300,
        maxDurationMs: 5000,
      })
    })

    await waitFor(() => expect(result.current.state).toBe('listening'), {
      interval: 5,
    })
    expect(lastWorkletNode).not.toBeNull()

    // Simulate a loud (above-threshold) frame arriving from the worklet.
    act(() => {
      lastWorkletNode!.port.onmessage?.({ data: makeFrame(0.5) })
    })

    // Let the silence timer elapse and the transcribe response resolve.
    let transcript = ''
    await act(async () => {
      transcript = await listenPromise!
    })

    expect(transcript).toBe('hello world')
    expect(result.current.state).toBe('idle')

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/api/stt/transcribe')
    expect(init.method).toBe('POST')
    const formData = init.body as FormData
    expect(formData.get('audio')).toBeInstanceOf(Blob)
  })

  it('rejects with a permission error and sets state to error when getUserMedia fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { getUserMedia } = installWebAudioMocks()
    getUserMedia.mockRejectedValue(new Error('denied'))

    const { result } = renderHook(() => useVoiceSession())

    let listenPromise: Promise<string>
    act(() => {
      listenPromise = result.current.listen()
    })

    await act(async () => {
      await expect(listenPromise!).rejects.toThrow(
        'Microphone access is blocked',
      )
    })

    expect(result.current.state).toBe('error')
    errorSpy.mockRestore()
  })

  it('resolves with an empty string and no fetch call when no frames were captured before timeout', async () => {
    const { result } = renderHook(() => useVoiceSession())

    let listenPromise: Promise<string>
    act(() => {
      listenPromise = result.current.listen({
        silenceTimeoutMs: 300,
        maxDurationMs: 5000,
      })
    })

    await waitFor(() => expect(result.current.state).toBe('listening'), {
      interval: 5,
    })

    let transcript = ''
    await act(async () => {
      transcript = await listenPromise!
    })

    expect(transcript).toBe('')
    expect(result.current.state).toBe('idle')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('cancel() while listening rejects listen() with "Listening cancelled" and sets state to error', async () => {
    const { result } = renderHook(() => useVoiceSession())

    let listenPromise: Promise<string>
    act(() => {
      listenPromise = result.current.listen({
        silenceTimeoutMs: 10_000,
        maxDurationMs: 20_000,
      })
    })

    await waitFor(() => expect(result.current.state).toBe('listening'), {
      interval: 5,
    })

    act(() => {
      result.current.cancel()
    })

    await expect(listenPromise!).rejects.toThrow('Listening cancelled')
    expect(result.current.state).toBe('error')
  })

  it('cancel() aborts the in-flight transcribe fetch once transcription has started', async () => {
    let capturedSignal: AbortSignal | undefined
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      (_url: string, init: RequestInit) => {
        capturedSignal = init.signal ?? undefined
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const err = new DOMException('aborted', 'AbortError')
            reject(err)
          })
        })
      },
    )

    const { result } = renderHook(() => useVoiceSession())

    let listenPromise: Promise<string>
    act(() => {
      listenPromise = result.current.listen({
        silenceTimeoutMs: 300,
        maxDurationMs: 5000,
      })
    })

    await waitFor(() => expect(result.current.state).toBe('listening'), {
      interval: 5,
    })

    act(() => {
      lastWorkletNode!.port.onmessage?.({ data: makeFrame(0.5) })
    })

    await waitFor(() => expect(result.current.state).toBe('transcribing'))
    expect(capturedSignal).toBeDefined()

    act(() => {
      result.current.cancel()
    })

    await expect(listenPromise!).rejects.toThrow('Listening cancelled')
    expect(result.current.state).toBe('error')
    expect(capturedSignal?.aborted).toBe(true)
  })

  it('rejects with a service error and sets state to error when the transcribe fetch is not ok', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'boom',
    })

    const { result } = renderHook(() => useVoiceSession())

    let listenPromise: Promise<string>
    act(() => {
      listenPromise = result.current.listen({
        silenceTimeoutMs: 300,
        maxDurationMs: 5000,
      })
    })

    await waitFor(() => expect(result.current.state).toBe('listening'), {
      interval: 5,
    })

    act(() => {
      lastWorkletNode!.port.onmessage?.({ data: makeFrame(0.5) })
    })

    await act(async () => {
      await expect(listenPromise!).rejects.toThrow(
        "Couldn't reach the voice service",
      )
    })

    expect(result.current.state).toBe('error')
    errorSpy.mockRestore()
  })
})

describe('preWarmAudio', () => {
  beforeEach(() => {
    installWebAudioMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves when getUserMedia and the audio context both succeed', async () => {
    await expect(preWarmAudio()).resolves.toBeUndefined()
  })

  it('swallows getUserMedia rejection and logs a warning instead of throwing', async () => {
    const { getUserMedia } = installWebAudioMocks()
    getUserMedia.mockRejectedValue(new Error('denied'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(preWarmAudio()).resolves.toBeUndefined()
    expect(warnSpy).toHaveBeenCalledWith(
      'Audio pre-warming failed:',
      expect.any(Error),
    )
  })
})
