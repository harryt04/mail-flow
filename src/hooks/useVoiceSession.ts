'use client'

import { useCallback, useRef, useState } from 'react'

export type VoiceSessionState =
  'idle' | 'connecting' | 'listening' | 'transcribing' | 'error'

interface ListenOptions {
  /** How long to wait after the last detected speech before treating the utterance as done. */
  silenceTimeoutMs?: number
  /** Hard cap regardless of ongoing speech, so a rambling utterance can't hold the mic open forever. */
  maxDurationMs?: number
}

/** RMS (0..1) a PCM frame must reach to count as speech and reset the silence timer. */
const VOICE_RMS_THRESHOLD = 0.02

function frameRms(frame: Int16Array): number {
  let sumSquares = 0
  for (let i = 0; i < frame.length; i++) {
    const normalized = frame[i] / 0x8000
    sumSquares += normalized * normalized
  }
  return Math.sqrt(sumSquares / frame.length)
}

function concatPcmFrames(frames: Int16Array[]): Int16Array {
  const total = frames.reduce((sum, frame) => sum + frame.length, 0)
  const result = new Int16Array(total)
  let offset = 0
  for (const frame of frames) {
    result.set(frame, offset)
    offset += frame.length
  }
  return result
}

/** Wraps raw 16-bit mono PCM samples in a minimal WAV header — no encoding dependency needed. */
function encodeWav(samples: Int16Array, sampleRate: number): Blob {
  const blockAlign = 2
  const byteRate = sampleRate * blockAlign
  const dataSize = samples.length * 2
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  function writeString(offset: number, value: string) {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    view.setInt16(offset, samples[i], true)
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

/**
 * Opens the mic for a single checkpoint listening window, buffers raw PCM
 * locally with a local silence detector (RMS threshold), then sends the one
 * recorded clip to /api/stt/transcribe once the user stops talking (or the
 * silence/max timeout fires) and resolves with the returned transcript.
 * Playback is never running while this is active (IMPLEMENTATION-PLAN.md
 * §7.2) — capture and playback are sequential.
 */
export function useVoiceSession() {
  const [state, setState] = useState<VoiceSessionState>('idle')
  const cancelRef = useRef<(() => void) | null>(null)

  const listen = useCallback((opts?: ListenOptions): Promise<string> => {
    const silenceTimeoutMs = opts?.silenceTimeoutMs ?? 4000
    const maxDurationMs = opts?.maxDurationMs ?? 20000

    return new Promise<string>((resolve, reject) => {
      let settled = false
      let silenceTimer: ReturnType<typeof setTimeout> | null = null
      let maxTimer: ReturnType<typeof setTimeout> | null = null
      let abortController: AbortController | null = null
      const pcmFrames: Int16Array[] = []

      let stream: MediaStream | null = null
      let audioContext: AudioContext | null = null
      let source: MediaStreamAudioSourceNode | null = null
      let workletNode: AudioWorkletNode | null = null

      function markSettled() {
        settled = true
        cancelRef.current = null
      }

      /** Tears down mic capture. Idempotent — safe to call more than once and safe before capture ever started. */
      function stopCapture() {
        if (silenceTimer) clearTimeout(silenceTimer)
        if (maxTimer) clearTimeout(maxTimer)
        if (workletNode) workletNode.port.onmessage = null
        source?.disconnect()
        workletNode?.disconnect()
        stream?.getTracks().forEach((t) => t.stop())
        audioContext?.close().catch(() => {})
      }

      function fail(err: Error) {
        if (settled) return
        markSettled()
        stopCapture()
        setState('error')
        reject(err)
      }

      function resetSilenceTimer() {
        if (silenceTimer) clearTimeout(silenceTimer)
        silenceTimer = setTimeout(beginTranscription, silenceTimeoutMs)
      }

      /** Stops capture and sends the recorded clip for transcription. Safe to call more than once. */
      function beginTranscription() {
        if (settled) return
        stopCapture()
        setState('transcribing')

        if (pcmFrames.length === 0 || !audioContext) {
          markSettled()
          setState('idle')
          resolve('')
          return
        }

        abortController = new AbortController()
        const wavBlob = encodeWav(
          concatPcmFrames(pcmFrames),
          audioContext.sampleRate,
        )
        const formData = new FormData()
        formData.append('audio', wavBlob, 'utterance.wav')

        fetch('/api/stt/transcribe', {
          method: 'POST',
          body: formData,
          signal: abortController.signal,
        })
          .then(async (res) => {
            if (settled) return
            if (!res.ok) {
              const rawText = await res.text().catch(() => '')
              console.error(
                'STT transcribe request failed:',
                res.status,
                res.statusText,
                rawText,
              )
              markSettled()
              setState('error')
              reject(
                new Error(
                  "Couldn't reach the voice service — use the buttons below.",
                ),
              )
              return
            }
            const { transcript } = (await res.json()) as {
              transcript: string
            }
            markSettled()
            setState('idle')
            resolve((transcript ?? '').trim())
          })
          .catch((err) => {
            if (settled) return
            markSettled()
            if (err instanceof DOMException && err.name === 'AbortError') {
              setState('error')
              reject(new Error('Listening cancelled'))
              return
            }
            console.error('STT transcribe failed:', err)
            setState('error')
            reject(
              new Error(
                "Couldn't reach the voice service — use the buttons below.",
              ),
            )
          })
      }

      cancelRef.current = () => {
        if (settled) return
        abortController?.abort()
        fail(new Error('Listening cancelled'))
      }

      ;(async () => {
        setState('connecting')

        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        } catch (err) {
          console.error('getUserMedia failed:', err)
          throw new Error(
            'Microphone access is blocked — check your browser permissions.',
          )
        }

        audioContext = new AudioContext()
        try {
          await audioContext.audioWorklet.addModule('/audio/pcm-worklet.js')
        } catch (err) {
          console.error('audioWorklet.addModule failed:', err)
          throw new Error(
            "Couldn't start the microphone — try reloading the page.",
          )
        }
        source = audioContext.createMediaStreamSource(stream)
        workletNode = new AudioWorkletNode(
          audioContext,
          'pcm-worklet-processor',
        )
        source.connect(workletNode)

        setState('listening')
        resetSilenceTimer()
        maxTimer = setTimeout(beginTranscription, maxDurationMs)
        workletNode.port.onmessage = (event) => {
          const frame = new Int16Array(event.data as ArrayBuffer)
          pcmFrames.push(frame)
          if (frameRms(frame) >= VOICE_RMS_THRESHOLD) {
            resetSilenceTimer()
          }
        }
      })().catch((err) => {
        console.error('Voice session failed to start:', err)
        fail(
          err instanceof Error
            ? err
            : new Error("Couldn't start listening — use the buttons below."),
        )
      })
    })
  }, [])

  const cancel = useCallback(() => {
    cancelRef.current?.()
  }, [])

  return { state, listen, cancel }
}
