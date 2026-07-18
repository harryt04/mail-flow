import { DeepgramClient } from "@deepgram/sdk";

let managementClient: DeepgramClient | null = null;

function getManagementClient(): DeepgramClient {
  if (!managementClient) {
    managementClient = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY });
  }
  return managementClient;
}

const TOKEN_TTL_SECONDS = 60;

export interface SttToken {
  key: string;
  expiresInSeconds: number;
}

/**
 * Mints a short-lived, scoped Deepgram key via the Management API so the
 * long-lived project key never reaches the client. One key per checkpoint's
 * listening window — cheap at MVP scale (TTS-STT-ANALYSIS.md §3).
 */
export async function mintSttToken(): Promise<SttToken> {
  const projectId = process.env.DEEPGRAM_PROJECT_ID;
  if (!projectId) {
    throw new Error("Missing DEEPGRAM_PROJECT_ID environment variable");
  }

  const response = await getManagementClient().manage.v1.projects.keys.create(projectId, {
    comment: "mailflow-client-checkpoint-token",
    scopes: ["usage:write"],
    time_to_live_in_seconds: TOKEN_TTL_SECONDS,
  });

  if (!response.key) {
    throw new Error("Deepgram did not return a key");
  }

  return { key: response.key, expiresInSeconds: TOKEN_TTL_SECONDS };
}
