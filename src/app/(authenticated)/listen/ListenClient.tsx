'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { IconPlay, IconPause } from '@/components/ui/icons'
import { ManualControls } from '@/components/listening/ManualControls'
import {
  StatusIndicator,
  type ListeningState,
} from '@/components/listening/StatusIndicator'
import { useAudioPlayback } from '@/hooks/useAudioPlayback'
import { useVoiceSession, preWarmAudio } from '@/hooks/useVoiceSession'
import { matchCommand } from '@/lib/voice/commandMatcher'
import { findMatchingLabels } from '@/lib/voice/labelMatcher'
import {
  PLAYBACK_SPEEDS,
  type CheckpointPayload,
  type ParsedEmail,
  type PlaybackSpeed,
} from '@/lib/types'
import type { GmailLabel } from '@/lib/gmail/labels'

type Phase = 'loading' | 'ready' | 'error' | 'done'

const MAX_RETRIES = 3
const RETRY_PROMPT =
  'Didn\'t catch that. Say "Skip", "Archive", "Reply", or "Move".'

// How much to read before pausing to check in — short paragraphs (a signature
// line, a lone "a link to example.com") get merged with their neighbors so
// the agent doesn't stop after a single word or link.
const MIN_CHUNK_SENTENCES = 3
const MIN_CHUNK_WORDS = 50

function countSentences(text: string): number {
  return (text.match(/[.!?]+(\s|$)/g) ?? []).length
}

function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

class CancelledError extends Error {}

async function postJson(
  url: string,
  body?: unknown,
): Promise<CheckpointPayload> {
  const res = await fetch(url, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new Error(payload.error ?? `Request to ${url} failed`)
  }
  return res.json()
}

interface ListenClientProps {
  initialPlaybackSpeed?: PlaybackSpeed
}

export function ListenClient({ initialPlaybackSpeed = 1 }: ListenClientProps) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [playbackSpeed, setPlaybackSpeed] =
    useState<PlaybackSpeed>(initialPlaybackSpeed)
  const [checkpoint, setCheckpoint] = useState<CheckpointPayload | null>(null)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [uiState, setUiState] = useState<ListeningState>('idle')
  const [uiLabel, setUiLabel] = useState('Ready')
  const [promptText, setPromptText] = useState<string | null>(null)
  const [paragraphIndex, setParagraphIndex] = useState<number | null>(null)
  const [showContinue, setShowContinue] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replyStage, setReplyStage] = useState<
    'idle' | 'dictating' | 'cleaning' | 'confirming'
  >('idle')
  const [labels, setLabels] = useState<GmailLabel[]>([])
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveConfirmLabel, setMoveConfirmLabel] = useState<GmailLabel | null>(
    null,
  )
  const [newFolderMode, setNewFolderMode] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingLabel, setCreatingLabel] = useState(false)
  const [newFolderError, setNewFolderError] = useState<string | null>(null)

  const audio = useAudioPlayback()
  const voice = useVoiceSession()
  const generationRef = useRef(0)

  useEffect(() => {
    postJson('/api/session')
      .then((payload) => {
        setCheckpoint(payload)
        setPhase(payload.email ? 'ready' : 'done')
      })
      .catch((err) => {
        setError(err.message)
        setPhase('error')
      })
  }, [])

  useEffect(() => {
    void preWarmAudio()
  }, [])

  useEffect(() => {
    return () => {
      generationRef.current += 1
      voice.cancel()
      audio.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    audio.setRate(initialPlaybackSpeed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetch('/api/labels')
      .then((res) => (res.ok ? res.json() : { labels: [] }))
      .then((data: { labels?: GmailLabel[] }) => setLabels(data.labels ?? []))
      .catch(() => setLabels([]))
  }, [])

  const isCurrent = (gen: number) => generationRef.current === gen

  /** Cycles to the next playback speed — applies instantly (local), persists in the background for next time. */
  function handleSpeedChange() {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed)
    const next = PLAYBACK_SPEEDS[(currentIndex + 1) % PLAYBACK_SPEEDS.length]
    setPlaybackSpeed(next)
    audio.setRate(next)
    void fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playbackSpeed: next }),
    })
  }

  async function speakAndShow(
    text: string,
    gen: number,
    label = 'Speaking',
    state: ListeningState = 'speaking',
  ) {
    setUiState(state)
    setUiLabel(label)
    setPromptText(text)
    await audio.speak(text)
    if (!isCurrent(gen)) throw new CancelledError()
  }

  async function listenAndShow(
    gen: number,
    opts?: Parameters<typeof voice.listen>[0],
  ): Promise<string> {
    setUiState('listening')
    setUiLabel('Listening')
    try {
      const transcript = await voice.listen(opts)
      if (!isCurrent(gen)) throw new CancelledError()
      return transcript
    } catch (err) {
      // A stale generation means some other handler (Pause, Continue, Skip, …)
      // already called voice.cancel() out from under us — that's an expected
      // cancellation, not a real failure, so it shouldn't surface as an error.
      if (!isCurrent(gen)) throw new CancelledError()
      throw err
    }
  }

  /** Surfaces a fatal loop error and makes sure the UI stops implying we're still listening/speaking. */
  function showFatalError(err: unknown) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    setError(message)
    setUiState('error')
    setUiLabel('Not listening')
    setPromptText(message)
  }

  /** Performs a terminal checkpoint action (skip/archive/snooze), speaks a short confirmation, then resumes the loop on whatever email comes next. */
  async function runAction(
    url: string,
    email: ParsedEmail,
    sessionId: string,
    gen: number,
    confirmationText: string,
    extraBody?: Record<string, unknown>,
  ) {
    setUiState('thinking')
    setUiLabel('Working on it')
    const payload = await postJson(url, {
      sessionId,
      messageId: email.messageId,
      ...extraBody,
    })
    if (!isCurrent(gen)) return

    setCheckpoint(payload)
    setShowContinue(false)
    setParagraphIndex(null)

    await speakAndShow(confirmationText, gen, confirmationText, 'confirmed')
    if (!isCurrent(gen)) return

    if (!payload.email) {
      setPhase('done')
      setUiState('idle')
      setUiLabel('Ready')
      setPromptText(null)
      return
    }

    // Fire-and-forget: the caller (e.g. handleManualAction) only needs to wait for the
    // confirmation to finish speaking, not for the rest of the session — awaiting this would
    // hold `busy` (and thus the manual buttons) locked until the whole session ends.
    void runEmailLoop(payload.email, payload.sessionId, gen)
  }

  /**
   * Voice-triggered "move to <folder>" — fuzzy-matches the spoken folder name against the
   * user's real Gmail labels, always speaks a confirmation before applying (labels are open
   * vocabulary, unlike the fixed command set, so misrecognition risk is higher). Returns true
   * once the checkpoint loop should stop (either the move happened, or retries were exhausted
   * and the manual buttons take over); false means fall back into the normal retry prompt.
   */
  async function runMoveVoiceFlow(
    rawArgument: string,
    email: ParsedEmail,
    sessionId: string,
    gen: number,
  ): Promise<boolean> {
    const matches = findMatchingLabels(rawArgument, labels)

    if (matches.length === 0) {
      await speakAndShow(
        "You don't have a Gmail label like that yet. Add it in Gmail, then try again.",
        gen,
        'No matching folder',
        'error',
      )
      return false
    }
    if (matches.length > 1) {
      await speakAndShow(
        'More than one folder matches that — try being more specific.',
        gen,
        'Ambiguous folder',
        'error',
      )
      return false
    }

    const label = matches[0]
    await speakAndShow(
      `Move to ${label.name}? Say "yes" to confirm, or "redo" to cancel.`,
      gen,
      `Move to ${label.name}?`,
    )
    if (!isCurrent(gen)) return true

    let retries = 0
    for (;;) {
      if (!isCurrent(gen)) return true
      const transcript = await listenAndShow(gen)
      const match = matchCommand(transcript)

      if (match?.command === 'confirm') {
        await runAction(
          '/api/actions/move',
          email,
          sessionId,
          gen,
          `Moved to ${label.name}.`,
          {
            labelId: label.id,
            labelName: label.name,
          },
        )
        return true
      }
      if (match?.command === 'redo') {
        return false
      }

      retries += 1
      if (retries > MAX_RETRIES) {
        setUiState('error')
        setUiLabel('Use the buttons below')
        setPromptText('Having trouble hearing you — use the buttons below.')
        return true
      }
      setUiState('error')
      setUiLabel("Didn't catch that")
      await speakAndShow(
        'Say "yes" to confirm the move, or "redo" to cancel.',
        gen,
        "Didn't catch that",
      )
    }
  }

  /** Sends via Gmail and resumes the checkpoint loop on whatever email comes next. */
  async function sendReplyAndResume(text: string, gen: number) {
    if (!checkpoint?.email) return
    setUiState('thinking')
    setUiLabel('Sending')
    const payload = await postJson('/api/actions/reply', {
      sessionId: checkpoint.sessionId,
      messageId: checkpoint.email.messageId,
      replyText: text,
    })
    if (!isCurrent(gen)) return

    setCheckpoint(payload)
    setReplyOpen(false)
    setReplyStage('idle')
    setReplyText('')
    setParagraphIndex(null)
    setShowContinue(false)

    await speakAndShow('Sending your reply.', gen, 'Sent', 'confirmed')
    if (!isCurrent(gen)) return

    if (!payload.email) {
      setPhase('done')
      setUiState('idle')
      setUiLabel('Ready')
      setPromptText(null)
      return
    }

    // Fire-and-forget for the same reason as runAction above — don't hold `busy`/handleSendReplyManual
    // locked for the rest of the session.
    void runEmailLoop(payload.email, payload.sessionId, gen)
  }

  /** IMPLEMENTATION-PLAN.md §7.4 — dictate, clean up via Claude, read back, confirm/redo. */
  async function runDictationFlow(gen: number) {
    try {
      await speakAndShow('Go ahead.', gen, 'Speaking')
      if (!isCurrent(gen)) return

      setReplyStage('dictating')
      const transcript = await listenAndShow(gen, {
        silenceTimeoutMs: 1500,
        maxDurationMs: 60000,
      })

      if (!transcript.trim()) {
        setReplyStage('idle')
        setUiState('idle')
        setUiLabel('Ready')
        setPromptText(
          "Didn't catch anything — type your reply below, or tap Reply to try again.",
        )
        return
      }

      setReplyText(transcript)
      setReplyStage('cleaning')
      setUiState('thinking')
      setUiLabel('Cleaning up')
      const res = await fetch('/api/reply/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawTranscript: transcript }),
      })
      if (!res.ok) throw new Error('Could not clean up your reply')
      const { cleanedText } = (await res.json()) as { cleanedText: string }
      if (!isCurrent(gen)) return

      setReplyText(cleanedText)
      setReplyStage('confirming')
      await speakAndShow(`Here's your reply: ${cleanedText} Send it?`, gen)
      if (!isCurrent(gen)) return

      let retries = 0
      for (;;) {
        if (!isCurrent(gen)) return
        const confirmTranscript = await listenAndShow(gen)
        const match = matchCommand(confirmTranscript)

        if (match?.command === 'confirm') {
          await sendReplyAndResume(cleanedText, gen)
          return
        }
        if (match?.command === 'redo') {
          setReplyStage('idle')
          setReplyText('')
          await runDictationFlow(gen)
          return
        }

        retries += 1
        if (retries > MAX_RETRIES) {
          setUiState('error')
          setUiLabel('Use the buttons below')
          setPromptText(
            'Having trouble hearing you — use Send or Cancel below.',
          )
          return
        }
        setUiState('error')
        setUiLabel("Didn't catch that")
        await speakAndShow(
          'Didn\'t catch that. Say "Send", or "Redo".',
          gen,
          "Didn't catch that",
        )
      }
    } catch (err) {
      if (err instanceof CancelledError) return
      showFatalError(err)
    }
  }

  function enterReplyMode() {
    generationRef.current += 1
    const gen = generationRef.current
    voice.cancel()
    audio.stop()
    setShowContinue(false)
    setReplyStage('idle')
    setReplyText('')
    setUiState('idle')
    setUiLabel('Ready')
    setPromptText(null)
    setReplyOpen(true)
    void runDictationFlow(gen)
  }

  function handleCancelReply() {
    generationRef.current += 1
    const gen = generationRef.current
    voice.cancel()
    audio.stop()
    setReplyOpen(false)
    setReplyStage('idle')
    setReplyText('')
    setError(null)
    if (checkpoint?.email) {
      void runParagraphsFrom(
        checkpoint.email,
        checkpoint.sessionId,
        paragraphIndex ?? 0,
        gen,
      )
    }
  }

  /** Manual (tap-driven) move — opens the folder picker instead of the ManualControls row. */
  function enterMoveMode() {
    generationRef.current += 1
    voice.cancel()
    audio.stop()
    setShowContinue(false)
    setMoveConfirmLabel(null)
    setNewFolderMode(false)
    setNewFolderName('')
    setNewFolderError(null)
    setUiState('idle')
    setUiLabel('Ready')
    setPromptText(null)
    setMoveOpen(true)
  }

  function handleCancelMove() {
    generationRef.current += 1
    const gen = generationRef.current
    voice.cancel()
    audio.stop()
    setMoveOpen(false)
    setMoveConfirmLabel(null)
    setNewFolderMode(false)
    setNewFolderName('')
    setNewFolderError(null)
    setError(null)
    if (checkpoint?.email) {
      void runParagraphsFrom(
        checkpoint.email,
        checkpoint.sessionId,
        paragraphIndex ?? 0,
        gen,
      )
    }
  }

  async function handleConfirmMove() {
    if (!checkpoint?.email || !moveConfirmLabel || busy) return
    generationRef.current += 1
    const gen = generationRef.current
    voice.cancel()
    audio.stop()
    const label = moveConfirmLabel
    setMoveOpen(false)
    setMoveConfirmLabel(null)
    setError(null)
    setBusy(true)
    try {
      await runAction(
        '/api/actions/move',
        checkpoint.email,
        checkpoint.sessionId,
        gen,
        `Moved to ${label.name}.`,
        {
          labelId: label.id,
          labelName: label.name,
        },
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateLabel() {
    const name = newFolderName.trim()
    if (!name || creatingLabel) return
    setCreatingLabel(true)
    setNewFolderError(null)
    try {
      const res = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error ?? 'Could not create folder')
      }
      const label: GmailLabel = data.label
      setLabels((prev) => [...prev, label])
      setNewFolderMode(false)
      setNewFolderName('')
      setMoveConfirmLabel(label)
    } catch (err) {
      setNewFolderError(
        err instanceof Error ? err.message : 'Could not create folder',
      )
    } finally {
      setCreatingLabel(false)
    }
  }

  /** Speaks the intro line, checks in before reading any of the body, then hands off to the paragraph-checkpoint loop starting at paragraph 0. */
  async function runEmailLoop(
    email: ParsedEmail,
    sessionId: string,
    gen: number,
  ) {
    try {
      setParagraphIndex(null)
      setShowContinue(true)
      await speakAndShow(
        `From ${email.sender}. Subject: ${email.subject}.`,
        gen,
      )
      if (!isCurrent(gen)) return

      await speakAndShow(
        'Say "continue" to hear the message, or tell me what to do.',
        gen,
      )
      if (!isCurrent(gen)) return
      const result = await listenForCheckpointCommand(email, sessionId, gen, {
        allowContinue: true,
      })
      if (!isCurrent(gen) || result === 'handled') return

      await runParagraphsFrom(email, sessionId, 0, gen)
    } catch (err) {
      if (err instanceof CancelledError) return
      showFatalError(err)
      setPhase('error')
    }
  }

  function handleBegin() {
    if (!checkpoint?.email) return
    setStarted(true)
    setError(null)
    const gen = generationRef.current
    void runEmailLoop(checkpoint.email, checkpoint.sessionId, gen)
  }

  async function handleManualAction(
    url: string,
    confirmationText: string,
    extraBody?: Record<string, unknown>,
  ) {
    if (!checkpoint?.email || busy) return
    generationRef.current += 1
    const gen = generationRef.current
    voice.cancel()
    audio.stop()
    setError(null)
    setBusy(true)
    try {
      await runAction(
        url,
        checkpoint.email,
        checkpoint.sessionId,
        gen,
        confirmationText,
        extraBody,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  function handlePause() {
    generationRef.current += 1
    voice.cancel()
    audio.stop()
    setPaused(true)
    setUiState('paused')
    setUiLabel('Paused')
    setPromptText('Paused. Tap play to resume.')
  }

  function handleResume() {
    if (!checkpoint?.email) return
    generationRef.current += 1
    const gen = generationRef.current
    setPaused(false)
    setError(null)
    setPromptText(null)
    // Resume on the same chunk it paused on — pausing didn't confirm "continue".
    void runParagraphsFrom(
      checkpoint.email,
      checkpoint.sessionId,
      paragraphIndex ?? 0,
      gen,
    )
  }

  function handleContinueButton() {
    if (!checkpoint?.email) return
    generationRef.current += 1
    const gen = generationRef.current
    voice.cancel()
    audio.stop()
    setError(null)
    // Resume the loop from the next paragraph after whichever one is showing.
    const resumeIndex = (paragraphIndex ?? -1) + 1
    void runParagraphsFrom(
      checkpoint.email,
      checkpoint.sessionId,
      resumeIndex,
      gen,
    )
  }

  /**
   * Shared "what do you want to do" checkpoint listener — used both right after the
   * subject line (before any body is read) and after each body chunk. Handles the
   * fixed command set plus two escape hatches: two consecutive silent/no-speech
   * attempts auto-pauses the session instead of continuing to ask, and MAX_RETRIES
   * unrecognized-but-non-silent attempts falls back to the on-screen buttons.
   */
  async function listenForCheckpointCommand(
    email: ParsedEmail,
    sessionId: string,
    gen: number,
    options: { allowContinue: boolean },
  ): Promise<'continue' | 'handled'> {
    let retries = 0
    let noAnswerStreak = 0
    for (;;) {
      if (!isCurrent(gen)) throw new CancelledError()
      const transcript = await listenAndShow(gen)
      const match = matchCommand(transcript)

      if (transcript.trim()) {
        noAnswerStreak = 0
      } else {
        noAnswerStreak += 1
        if (noAnswerStreak >= 2) {
          handlePause()
          return 'handled'
        }
      }

      if (match?.command === 'continue' && options.allowContinue) {
        return 'continue'
      }
      if (match?.command === 'pause') {
        handlePause()
        return 'handled'
      }
      if (match?.command === 'skip') {
        await runAction('/api/session/next', email, sessionId, gen, 'Skipped.')
        return 'handled'
      }
      if (match?.command === 'archive') {
        const isDelete = match.phrase === 'delete'
        await runAction(
          '/api/actions/archive',
          email,
          sessionId,
          gen,
          isDelete ? 'Deleted.' : 'Archived.',
          { delete: isDelete },
        )
        return 'handled'
      }
      if (match?.command === 'reply') {
        enterReplyMode()
        return 'handled'
      }
      if (match?.command === 'move' && match.argument) {
        const handled = await runMoveVoiceFlow(
          match.argument,
          email,
          sessionId,
          gen,
        )
        if (handled) return 'handled'
        continue
      }

      retries += 1
      if (retries > MAX_RETRIES) {
        setUiState('error')
        setUiLabel('Use the buttons below')
        setPromptText('Having trouble hearing you — use the buttons below.')
        return 'handled'
      }
      setUiState('error')
      setUiLabel("Didn't catch that")
      await speakAndShow(RETRY_PROMPT, gen, "Didn't catch that")
    }
  }

  async function runParagraphsFrom(
    email: ParsedEmail,
    sessionId: string,
    startIndex: number,
    gen: number,
  ) {
    try {
      let i = startIndex
      while (i < email.paragraphs.length) {
        if (!isCurrent(gen)) return

        // Merge consecutive paragraphs into one spoken chunk until we've
        // read a meaningful amount, instead of stopping after every paragraph.
        let chunk = email.paragraphs[i]
        let sentenceCount = countSentences(chunk)
        let wordCount = countWords(chunk)
        while (
          i + 1 < email.paragraphs.length &&
          sentenceCount < MIN_CHUNK_SENTENCES &&
          wordCount < MIN_CHUNK_WORDS
        ) {
          i += 1
          chunk += ' ' + email.paragraphs[i]
          sentenceCount += countSentences(email.paragraphs[i])
          wordCount += countWords(email.paragraphs[i])
        }

        setParagraphIndex(i)
        await speakAndShow(chunk, gen)

        const hasMore = i < email.paragraphs.length - 1
        setShowContinue(hasMore)
        const prompt = hasMore
          ? 'There\'s more. Say "continue", or tell me what to do.'
          : "That's the whole message. What next?"
        await speakAndShow(prompt, gen)

        const result = await listenForCheckpointCommand(email, sessionId, gen, {
          allowContinue: hasMore,
        })
        if (!isCurrent(gen)) return
        if (result === 'handled') return
        i += 1
      }
    } catch (err) {
      if (err instanceof CancelledError) return
      showFatalError(err)
      setPhase('error')
    }
  }

  /** Manual override — sends whatever is currently in the textarea, bypassing/interrupting the voice dictation sub-flow. */
  async function handleSendReplyManual() {
    if (!checkpoint?.email || replyText.trim().length === 0 || busy) return
    generationRef.current += 1
    const gen = generationRef.current
    voice.cancel()
    audio.stop()
    setBusy(true)
    setError(null)
    try {
      await sendReplyAndResume(replyText.trim(), gen)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  if (phase === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-body text-text-secondary">Loading your inbox…</p>
      </div>
    )
  }

  if (phase === 'error' && !checkpoint?.email) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-body text-danger">{error}</p>
        <Link href="/home">
          <Button variant="secondary">Back home</Button>
        </Link>
      </div>
    )
  }

  if (phase === 'done' || !checkpoint?.email) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-h1 text-text-primary font-semibold">
          You&apos;re all caught up.
        </p>
        <p className="text-body text-text-secondary">
          Nothing left in this session — check back once new mail arrives.
        </p>
        <Link href="/home">
          <Button variant="secondary">Back home</Button>
        </Link>
      </div>
    )
  }

  const { email, remaining, totalEstimate, snapshotSize } = checkpoint
  const sessionLabel =
    totalEstimate > snapshotSize
      ? `${remaining.toLocaleString()} left in this batch of ${snapshotSize.toLocaleString()} (out of ~${totalEstimate.toLocaleString()} unread)`
      : `${remaining.toLocaleString()} left to listen to`
  const paragraphLabel =
    paragraphIndex !== null
      ? `Paragraph ${paragraphIndex + 1} of ${email.paragraphs.length}`
      : null

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-8 px-6 py-10">
      <div className="flex items-center gap-3">
        <p className="text-meta text-text-muted">{sessionLabel}</p>
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={handleSpeedChange}
          aria-label="Change playback speed"
        >
          {playbackSpeed}x
        </Button>
        {started && !paused && (
          <IconButton
            icon={<IconPause className="h-5 w-5" />}
            label="Pause session"
            variant="default"
            size="md"
            onClick={handlePause}
          />
        )}
      </div>

      {!started ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-body-lg text-text-primary text-center">
            {email.sender} — {email.subject}
          </p>
          <IconButton
            icon={<IconPlay className="h-7 w-7" />}
            label="Start listening"
            variant="primary"
            size="lg"
            onClick={handleBegin}
          />
          <span className="text-label text-text-secondary uppercase">
            Start listening
          </span>
        </div>
      ) : paused ? (
        <div className="flex flex-col items-center gap-4">
          <StatusIndicator state={uiState} label={uiLabel} />
          {promptText && (
            <p className="text-body text-text-secondary max-w-md text-center">
              {promptText}
            </p>
          )}
          <IconButton
            icon={<IconPlay className="h-7 w-7" />}
            label="Resume listening"
            variant="primary"
            size="lg"
            onClick={handleResume}
          />
          <span className="text-label text-text-secondary uppercase">
            Resume
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <StatusIndicator state={uiState} label={uiLabel} />
          {promptText && (
            <p className="text-body text-text-secondary max-w-md text-center">
              {promptText}
            </p>
          )}
        </div>
      )}

      <Card className="flex w-full flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-body-lg text-text-primary font-semibold">
              {email.sender}
            </p>
            <p className="text-body text-text-secondary">{email.subject}</p>
          </div>
          {paragraphLabel && (
            <p className="text-meta text-text-muted whitespace-nowrap">
              {paragraphLabel}
            </p>
          )}
        </div>
        <p className="text-body text-text-primary whitespace-pre-wrap">
          {paragraphIndex !== null
            ? email.paragraphs[paragraphIndex]
            : email.paragraphs[0]}
        </p>
      </Card>

      {error && <p className="text-body text-danger">{error}</p>}

      {replyOpen ? (
        <div className="flex w-full flex-col gap-3">
          {replyStage === 'dictating' && (
            <p className="text-meta text-attention text-center">
              Listening for your reply…
            </p>
          )}
          {replyStage === 'cleaning' && (
            <p className="text-meta text-text-secondary text-center">
              Cleaning up your reply…
            </p>
          )}
          <textarea
            className="rounded-card border-border bg-surface-sunken text-body text-text-primary min-h-32 w-full border p-4"
            placeholder="Type your reply, or wait for the mic to capture what you say…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={busy}
          />
          <div className="flex justify-center gap-3">
            <Button
              variant="secondary"
              onClick={handleCancelReply}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendReplyManual}
              disabled={busy || replyText.trim().length === 0}
            >
              Send
            </Button>
          </div>
        </div>
      ) : moveOpen ? (
        <div className="flex w-full flex-col gap-3">
          {!moveConfirmLabel ? (
            <>
              <p className="text-body text-text-secondary text-center">
                Move this email to which folder?
              </p>
              {newFolderMode ? (
                <div className="flex flex-col items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    className="rounded-card border-border bg-surface-sunken text-body text-text-primary w-full max-w-xs border p-3"
                    placeholder="New folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    disabled={creatingLabel}
                  />
                  {newFolderError && (
                    <p className="text-meta text-danger">{newFolderError}</p>
                  )}
                  <div className="flex justify-center gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setNewFolderMode(false)
                        setNewFolderError(null)
                      }}
                      disabled={creatingLabel}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateLabel}
                      disabled={
                        creatingLabel || newFolderName.trim().length === 0
                      }
                    >
                      {creatingLabel ? 'Creating…' : 'Create'}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {labels.length === 0 ? (
                    <p className="text-meta text-text-muted text-center">
                      No Gmail labels found yet — create one below, or add one
                      in Gmail and come back here.
                    </p>
                  ) : (
                    <div className="flex flex-wrap justify-center gap-2">
                      {labels.map((label) => (
                        <Button
                          key={label.id}
                          variant="secondary"
                          onClick={() => setMoveConfirmLabel(label)}
                        >
                          {label.name}
                        </Button>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setNewFolderMode(true)}
                    >
                      New Folder
                    </Button>
                  </div>
                  <div className="flex justify-center">
                    <Button variant="secondary" onClick={handleCancelMove}>
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <p className="text-body text-text-primary text-center">
                Move to {moveConfirmLabel.name}?
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setMoveConfirmLabel(null)}
                  disabled={busy}
                >
                  Back
                </Button>
                <Button onClick={handleConfirmMove} disabled={busy}>
                  Confirm
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <ManualControls
          onSkip={() => handleManualAction('/api/session/next', 'Skipped.')}
          onArchive={() =>
            handleManualAction('/api/actions/archive', 'Archived.')
          }
          onReply={enterReplyMode}
          onMove={enterMoveMode}
          onContinue={handleContinueButton}
          showContinue={showContinue}
          disabled={busy || paused}
        />
      )}
    </div>
  )
}
