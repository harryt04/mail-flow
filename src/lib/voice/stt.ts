import OpenAI from 'openai'
import { toFile } from 'openai/uploads'

/**
 * Transcribes one recorded utterance clip via OpenAI's transcription API.
 * The client records locally (with its own silence detection) and sends one
 * clip per checkpoint listening window — see IMPLEMENTATION-PLAN.md §7 and
 * TTS-STT-ANALYSIS.md §3 for why batch transcription is sufficient here (the
 * UI never shows live partial captions, only a "done talking" signal).
 */
export async function transcribe(
  audioBlob: Blob,
  apiKey: string,
): Promise<string> {
  const client = new OpenAI({ apiKey })
  const file = await toFile(audioBlob, 'utterance.wav', { type: 'audio/wav' })

  const response = await client.audio.transcriptions.create({
    model: 'gpt-4o-mini-transcribe',
    file,
  })

  return response.text ?? ''
}
