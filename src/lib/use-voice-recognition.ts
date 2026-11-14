"use client";

import * as React from "react";
import type { VoiceRecognitionState } from "@/types/voice-log";

// Type definitions for SpeechRecognition API
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionResultItem;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition;

const emptySubscribe = () => () => {};

export function useVoiceRecognition() {
  const isSupported = React.useSyncExternalStore(
    emptySubscribe,
    () => {
      if (typeof window === "undefined") return false;
      const SpeechRecognitionAPI: SpeechRecognitionConstructor | undefined =
        // @ts-expect-error Webkit speech recognition is standard on Chrome/Safari
        window.SpeechRecognition || window.webkitSpeechRecognition;
      return Boolean(SpeechRecognitionAPI);
    },
    () => false
  );

  const [state, setState] = React.useState<Omit<VoiceRecognitionState, "isSupported">>({
    isListening: false,
    transcript: "",
    interimTranscript: "",
    error: null,
    permissionDenied: false,
  });

  const recognitionRef = React.useRef<ISpeechRecognition | null>(null);

  const stopListening = React.useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Recognition might already be stopped
      }
    }
  }, []);

  const startListening = React.useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionAPI: SpeechRecognitionConstructor | undefined =
      // @ts-expect-error Webkit speech recognition is standard on Chrome/Safari
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setState((prev) => ({
        ...prev,
        error: "Speech recognition is not supported in this browser. You can type your meal description below.",
      }));
      return;
    }

    // Stop existing instance if running
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false; // Do not record continuously
      recognition.interimResults = true;
      recognition.lang = "en-IN"; // Primary Indian English locale, fallback-compatible

      recognition.onstart = () => {
        setState((prev) => ({
          ...prev,
          isListening: true,
          error: null,
          permissionDenied: false,
          interimTranscript: "",
        }));
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalChunk = "";
        let interimChunk = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalChunk += res[0].transcript + " ";
          } else {
            interimChunk += res[0].transcript;
          }
        }

        setState((prev) => {
          const nextTranscript = (prev.transcript + " " + finalChunk).trim().replace(/\s+/g, " ");
          return {
            ...prev,
            transcript: nextTranscript,
            interimTranscript: interimChunk,
          };
        });
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const errType = event.error;
        let userMessage: string;
        let isPermissionDenied = false;

        switch (errType) {
          case "not-allowed":
            userMessage = "Microphone access was denied. Please allow microphone permissions or type your meal below.";
            isPermissionDenied = true;
            break;
          case "no-speech":
            userMessage = "No speech was detected. Please tap the microphone and speak again.";
            break;
          case "audio-capture":
            userMessage = "No microphone was found on your device.";
            break;
          case "network":
            userMessage = "Network error during speech recognition. Please check your connection or type manually.";
            break;
          default:
            userMessage = `Speech recognition error: ${errType}`;
        }

        setState((prev) => ({
          ...prev,
          isListening: false,
          error: userMessage,
          permissionDenied: isPermissionDenied,
          interimTranscript: "",
        }));
      };

      recognition.onend = () => {
        setState((prev) => ({
          ...prev,
          isListening: false,
          interimTranscript: "",
        }));
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start speech recognition";
      setState((prev) => ({
        ...prev,
        isListening: false,
        error: msg,
      }));
    }
  }, []);

  const resetTranscript = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      transcript: "",
      interimTranscript: "",
      error: null,
    }));
  }, []);

  const setTranscript = React.useCallback((text: string) => {
    setState((prev) => ({
      ...prev,
      transcript: text,
      interimTranscript: "",
    }));
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    ...state,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
  };
}
