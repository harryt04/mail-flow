import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You clean up a dictated email reply. The input is a raw speech-to-text transcript — it may contain filler words, false starts, or run-on sentences. Rewrite it as a short, plausible email reply:
- Fix grammar and punctuation.
- Remove filler words ("um", "uh", "like") and false starts.
- Preserve the sender's intent, tone, and meaning exactly — do not add new information or change what they're saying.
- Keep it concise; don't pad it out or add pleasantries the speaker didn't say.
- Output only the cleaned reply text, nothing else — no preamble, no quotes, no explanation.`;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function cleanupReply(rawTranscript: string): Promise<string> {
  const response = await getClient().messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: rawTranscript }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude did not return a text response");
  }
  return textBlock.text.trim();
}
