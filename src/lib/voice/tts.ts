import OpenAI from "openai";

export interface TtsSynthesizeOptions {
  voiceTone?: string;
}

export interface TtsProvider {
  synthesize(text: string, opts?: TtsSynthesizeOptions): Promise<ReadableStream<Uint8Array>>;
}

const BASE_INSTRUCTIONS =
  "Speak in a calm, unhurried, warm tone — like reading a friend's email aloud, not announcing it. No urgency, no cheerfulness performance.";

function buildInstructions(voiceTone?: string): string {
  return voiceTone ? `${BASE_INSTRUCTIONS} Additional tone guidance: ${voiceTone}` : BASE_INSTRUCTIONS;
}

class OpenAiTtsProvider implements TtsProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async synthesize(
    text: string,
    opts?: TtsSynthesizeOptions
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await this.client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
      instructions: buildInstructions(opts?.voiceTone),
      response_format: "mp3",
    });

    if (!response.body) {
      throw new Error("OpenAI TTS returned no audio stream");
    }
    return response.body;
  }
}

let provider: TtsProvider | null = null;

/** Swappable behind this factory per TTS-STT-ANALYSIS.md — a provider change is a one-line swap here. */
export function getTtsProvider(): TtsProvider {
  if (!provider) {
    provider = new OpenAiTtsProvider();
  }
  return provider;
}
