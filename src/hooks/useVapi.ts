"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Vapi from "@vapi-ai/web";

export type SpeakerStatus = "idle" | "user-speaking" | "ai-speaking" | "ai-thinking";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UseVapiOptions {
  publicKey: string;
  assistantId?: string;
  assistantConfig?: {
    name: string;
    firstMessage: string;
    model: {
      provider: string;
      model: string;
      systemPrompt: string;
    };
    voice: {
      provider: string;
      voiceId: string;
    };
  };
}

export function useVapi({ publicKey, assistantId, assistantConfig }: UseVapiOptions) {
  const vapiRef = useRef<Vapi | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [speakerStatus, setSpeakerStatus] = useState<SpeakerStatus>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [volumeLevel, setVolumeLevel] = useState(0);

  useEffect(() => {
    if (!publicKey) return;

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      setIsCallActive(true);
      setSpeakerStatus("ai-thinking");
    });

    vapi.on("call-end", () => {
      setIsCallActive(false);
      setSpeakerStatus("idle");
      setCurrentTranscript("");
    });

    vapi.on("speech-start", () => {
      setSpeakerStatus("ai-speaking");
    });

    vapi.on("speech-end", () => {
      setSpeakerStatus("idle");
    });

    vapi.on("message", (message) => {
      if (message.type === "transcript") {
        if (message.transcriptType === "partial") {
          setCurrentTranscript(message.transcript);
          if (message.role === "user") {
            setSpeakerStatus("user-speaking");
          }
        } else if (message.transcriptType === "final") {
          if (message.transcript.trim()) {
            setMessages((prev) => [
              ...prev,
              {
                role: message.role as "user" | "assistant",
                content: message.transcript,
                timestamp: new Date(),
              },
            ]);
          }
          setCurrentTranscript("");
          if (message.role === "user") {
            setSpeakerStatus("ai-thinking");
          }
        }
      }
    });

    vapi.on("volume-level", (level) => {
      setVolumeLevel(level);
    });

    vapi.on("error", (error) => {
      console.error("Vapi error:", error);
    });

    setIsConnected(true);

    return () => {
      vapi.stop();
      vapiRef.current = null;
    };
  }, [publicKey]);

  const startCall = useCallback(async () => {
    if (!vapiRef.current) return;

    try {
      if (assistantId) {
        await vapiRef.current.start(assistantId);
      } else if (assistantConfig) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await vapiRef.current.start({
          name: assistantConfig.name,
          firstMessage: assistantConfig.firstMessage,
          model: {
            provider: assistantConfig.model.provider,
            model: assistantConfig.model.model,
            messages: [
              {
                role: "system",
                content: assistantConfig.model.systemPrompt,
              },
            ],
          },
          voice: {
            provider: assistantConfig.voice.provider,
            voiceId: assistantConfig.voice.voiceId,
          },
        } as any);
      }
    } catch (error) {
      console.error("Failed to start call:", error);
    }
  }, [assistantId, assistantConfig]);

  const endCall = useCallback(() => {
    if (!vapiRef.current) return;
    vapiRef.current.stop();
  }, []);

  const toggleCall = useCallback(() => {
    if (isCallActive) {
      endCall();
    } else {
      startCall();
    }
  }, [isCallActive, startCall, endCall]);

  return {
    isConnected,
    isCallActive,
    speakerStatus,
    messages,
    currentTranscript,
    volumeLevel,
    startCall,
    endCall,
    toggleCall,
  };
}
