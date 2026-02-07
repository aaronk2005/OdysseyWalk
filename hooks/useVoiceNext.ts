"use client";

import { useCallback, useRef, useState } from "react";
import { STTRecorder } from "@/lib/voice/STTRecorder";
import { AudioSessionManager } from "@/lib/audio/AudioSessionManager";

function isNextOrContinue(transcript: string): boolean {
  const t = transcript.trim().toLowerCase();
  return t === "next" || t === "continue" || t.includes("next") || t.includes("continue");
}

export function useVoiceNext(jumpNext: () => void) {
  const recorderRef = useRef<STTRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getRecorder(): STTRecorder {
    if (!recorderRef.current) {
      recorderRef.current = new STTRecorder();
    }
    return recorderRef.current;
  }

  const startVoiceNext = useCallback(() => {
    setError(null);
    setIsRecording(true);
    AudioSessionManager.pauseForMic();
    const recorder = getRecorder();
    recorder.setCallbacks({
      onStart: () => setIsRecording(true),
      onStop: () => setIsRecording(false),
      onTranscript: (transcript: string) => {
        setIsRecording(false);
        if (isNextOrContinue(transcript)) {
          jumpNext();
        }
      },
      onError: (err: string) => {
        setError(err);
        setIsRecording(false);
      },
    });
    recorder.start();
  }, [jumpNext]);

  const stopVoiceNext = useCallback(() => {
    getRecorder().stop();
    setIsRecording(false);
  }, []);

  return { startVoiceNext, stopVoiceNext, isVoiceNextRecording: isRecording, voiceNextError: error, setVoiceNextError: setError };
}
