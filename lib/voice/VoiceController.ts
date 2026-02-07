"use client";

import { STTRecorder } from "./STTRecorder";
import { AudioSessionManager } from "@/lib/audio/AudioSessionManager";
import type { SessionState } from "@/lib/types";

const sttRecorder = new STTRecorder();

export interface VoiceControllerCallbacks {
  onListeningStart?: () => void;
  onListeningEnd?: () => void;
  onThinking?: () => void;
  onAnswerStart?: () => void;
  onAnswerEnd?: () => void;
  onError?: (message: string) => void;
  onTypedQuestionFallback?: () => void;
}

export async function runVoiceQaLoop(
  session: SessionState | null,
  getQuestionText: () => Promise<string | null>,
  callbacks: VoiceControllerCallbacks = {}
): Promise<void> {
  const {
    onListeningStart,
    onListeningEnd,
    onThinking,
    onAnswerStart,
    onAnswerEnd,
    onError,
  } = callbacks;

  const question = await getQuestionText();
  if (!question?.trim()) {
    onError?.("No question");
    return;
  }

  onThinking?.();
  const poi = session?.pois.find((p) => p.poiId === session.activePoiId) ?? session?.pois[0];
  if (!poi || !session) {
    onError?.("No context");
    onAnswerEnd?.();
    return;
  }

  try {
    const res = await fetch("/api/qa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session.sessionId,
        poiId: poi.poiId,
        questionText: question,
        context: {
          currentPoiScript: poi.script ?? poi.scripts?.friendly ?? poi.scripts?.historian ?? poi.scripts?.funny ?? "",
          tourIntro: session.tourPlan.intro,
          theme: session.tourPlan.theme,
        },
      }),
    });
    const data = await res.json();
    const answerText = data.answerText ?? "I don't have an answer for that.";
    onAnswerStart?.();
    AudioSessionManager.pauseForMic();
    await AudioSessionManager.playAnswer(answerText);
  } catch (e) {
    onError?.(e instanceof Error ? e.message : "Request failed");
  }
  onAnswerEnd?.();
}

export function startRecording(callbacks: VoiceControllerCallbacks = {}): void {
  const {
    onListeningStart,
    onListeningEnd,
    onThinking,
    onAnswerStart,
    onAnswerEnd,
    onError,
    onTypedQuestionFallback,
  } = callbacks;

  AudioSessionManager.pauseForMic();
  onListeningStart?.();

  sttRecorder.setCallbacks({
    onStart: () => onListeningStart?.(),
    onStop: () => onListeningEnd?.(),
    onTranscript: async (transcript) => {
      onListeningEnd?.();
      if (!transcript?.trim()) {
        onTypedQuestionFallback?.();
        return;
      }
      const session = typeof window !== "undefined"
        ? (await import("@/lib/data/SessionStore")).loadTour()
        : null;
      await runVoiceQaLoop(session, () => Promise.resolve(transcript), {
        onThinking,
        onAnswerStart,
        onAnswerEnd,
        onError,
      });
    },
    onError: (err) => {
      onListeningEnd?.();
      onError?.(err);
      onTypedQuestionFallback?.();
    },
  });
  sttRecorder.start();
}

export function stopRecording(): void {
  sttRecorder.stop();
}
