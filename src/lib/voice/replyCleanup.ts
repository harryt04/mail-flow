import OpenAI from 'openai'

const SYSTEM_PROMPT = `You clean up a dictated email reply. The input is a raw speech-to-text transcript — it may contain filler words, false starts, or run-on sentences. Rewrite it as a short, plausible email reply:
- Fix grammar and punctuation.
- Remove filler words ("um", "uh", "like") and false starts.
- Preserve the sender's intent, tone, and meaning exactly — do not add new information or change what they're saying.
- Keep it concise; don't pad it out or add pleasantries the speaker didn't say.
- Output only the cleaned reply text, nothing else — no preamble, no quotes, no explanation.`

export async function cleanupReply(
  rawTranscript: string,
  apiKey: string,
): Promise<string> {
  const client = new OpenAI({ apiKey })
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: rawTranscript },
    ],
    max_tokens: 512,
  })

  const textContent = response.choices[0]?.message?.content
  if (!textContent) {
    throw new Error('OpenAI did not return a text response')
  }
  return textContent.trim()
}
