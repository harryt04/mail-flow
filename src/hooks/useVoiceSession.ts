"use client";

import { useCallback, useRef, useState } from "react";

export type VoiceSessionState = "idle" | "connecting" | "listening" | "error";

interface ListenOptions {
  /** How long to wait after the last detected speech before treating the utterance as done. */
  silenceTimeoutMs?: number;
  /** Hard cap regardless of ongoing speech, so a rambling utterance can't hold the mic open forever. */
  maxDurationMs?: number;
}

interface DeepgramResultsMessage {
  type: "Results";
  is_final?: boolean;
  speech_final?: boolean;
  channel?: {
    alternatives?: { transcript?: string }[];
  };
}

function isResultsMessage(value: unknown): value is DeepgramResultsMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "Results"
  );
}

/**
 * Opens the mic for a single checkpoint listening window: mints a
 * short-lived Deepgram token, streams raw PCM over a WebSocket, and
 * resolves with the transcript once speech pauses (or the silence/max
 * timeout fires). Playback is never running while this is active
 * (IMPLEMENTATION-PLAN.md §7.2) — capture and playback are sequential.
 */
export function useVoiceSession() {
  const [state, setState] = useState<VoiceSessionState>("idle");
  const cancelRef = useRef<(() => void) | null>(null);

  const listen = useCallback((opts?: ListenOptions): Promise<string> => {
    const silenceTimeoutMs = opts?.silenceTimeoutMs ?? 4000;
    const maxDurationMs = opts?.maxDurationMs ?? 20000;

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      let silenceTimer: ReturnType<typeof setTimeout> | null = null;
      let maxTimer: ReturnType<typeof setTimeout> | null = null;
      let finalTranscript = "";

      let stream: MediaStream | null = null;
      let audioContext: AudioContext | null = null;
      let source: MediaStreamAudioSourceNode | null = null;
      let workletNode: AudioWorkletNode | null = null;
      let socket: WebSocket | null = null;

      function cleanup() {
        if (silenceTimer) clearTimeout(silenceTimer);
        if (maxTimer) clearTimeout(maxTimer);
        if (workletNode) workletNode.port.onmessage = null;
        source?.disconnect();
        workletNode?.disconnect();
        stream?.getTracks().forEach((t) => t.stop());
        audioContext?.close().catch(() => {});
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
        cancelRef.current = null;
      }

      function finish() {
        if (settled) return;
        settled = true;
        cleanup();
        setState("idle");
        resolve(finalTranscript.trim());
      }

      function fail(err: Error) {
        if (settled) return;
        settled = true;
        cleanup();
        setState("error");
        reject(err);
      }

      function resetSilenceTimer() {
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(finish, silenceTimeoutMs);
      }

      cancelRef.current = () => fail(new Error("Listening cancelled"));

      (async () => {
        setState("connecting");

        const tokenRes = await fetch("/api/stt/token", { method: "POST" });
        if (!tokenRes.ok) throw new Error("Could not start listening");
        const { key } = (await tokenRes.json()) as { key: string };

        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new AudioContext();
        await audioContext.audioWorklet.addModule("/audio/pcm-worklet.js");
        source = audioContext.createMediaStreamSource(stream);
        workletNode = new AudioWorkletNode(audioContext, "pcm-worklet-processor");
        source.connect(workletNode);

        const params = new URLSearchParams({
          model: "nova-3",
          language: "en",
          smart_format: "true",
          interim_results: "true",
          endpointing: "300",
          encoding: "linear16",
          sample_rate: String(audioContext.sampleRate),
          channels: "1",
        });
        socket = new WebSocket(
          `wss://api.deepgram.com/v1/listen?${params.toString()}`,
          ["token", key]
        );

        socket.addEventListener("open", () => {
          setState("listening");
          resetSilenceTimer();
          maxTimer = setTimeout(finish, maxDurationMs);
          if (workletNode) {
            workletNode.port.onmessage = (event) => {
              if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(event.data as ArrayBuffer);
              }
            };
          }
        });

        socket.addEventListener("message", (event) => {
          let parsed: unknown;
          try {
            parsed = JSON.parse(event.data as string);
          } catch {
            return;
          }
          if (!isResultsMessage(parsed)) return;

          const transcript = parsed.channel?.alternatives?.[0]?.transcript ?? "";
          if (transcript) {
            resetSilenceTimer();
            if (parsed.is_final) {
              finalTranscript = `${finalTranscript} ${transcript}`.trim();
            }
          }
          if (parsed.speech_final) {
            finish();
          }
        });

        socket.addEventListener("error", () => {
          fail(new Error("Speech recognition connection failed"));
        });
      })().catch((err) => {
        fail(err instanceof Error ? err : new Error("Could not start listening"));
      });
    });
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current?.();
  }, []);

  return { state, listen, cancel };
}
