'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'error'

/** Controls a single <audio> element; playback and mic capture are never concurrent (IMPLEMENTATION-PLAN.md §7.2), so this hook only ever owns the "speaking" half. */
export function useAudioPlayback() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rateRef = useRef(1)
  const [status, setStatus] = useState<PlaybackStatus>('idle')

  useEffect(() => {
    const audio = new Audio()
    audio.playbackRate = rateRef.current
    audioRef.current = audio
    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

  /** Applies immediately to whatever's currently loaded/playing, and to every future `speak()` call. */
  const setRate = useCallback((rate: number) => {
    rateRef.current = rate
    if (audioRef.current) audioRef.current.playbackRate = rate
  }, [])

  /** Fetches TTS audio for `text` and plays it, resolving once playback ends. */
  const speak = useCallback(
    async (text: string, voiceTone?: string): Promise<void> => {
      const audio = audioRef.current
      if (!audio) throw new Error('Audio element not ready')

      setStatus('loading')
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceTone }),
      })
      if (!res.ok) {
        setStatus('error')
        throw new Error('TTS request failed')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      try {
        await new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            audio.removeEventListener('ended', onEnded)
            audio.removeEventListener('error', onError)
          }
          const onEnded = () => {
            cleanup()
            resolve()
          }
          const onError = () => {
            cleanup()
            reject(new Error('Audio playback failed'))
          }
          audio.addEventListener('ended', onEnded)
          audio.addEventListener('error', onError)
          audio.src = url
          audio.playbackRate = rateRef.current
          setStatus('playing')
          audio.play().catch(reject)
        })
        setStatus('idle')
      } catch (err) {
        setStatus('error')
        throw err
      } finally {
        URL.revokeObjectURL(url)
      }
    },
    [],
  )

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
    setStatus('idle')
  }, [])

  return { speak, stop, status, setRate }
}
