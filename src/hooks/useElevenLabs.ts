"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback, useState, useEffect, useRef } from "react";
import type { SpeakerStatus, Message } from "@/types/voice";

interface UseElevenLabsOptions {
  agentId: string;
  onMessageFinalized?: (role: string, content: string) => void;
}

export function useElevenLabs({ agentId, onMessageFinalized }: UseElevenLabsOptions) {
  const [speakerStatus, setSpeakerStatus] = useState<SpeakerStatus>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [volumeLevel, setVolumeLevel] = useState(0);
  const onMessageFinalizedRef = useRef(onMessageFinalized);

  useEffect(() => {
    onMessageFinalizedRef.current = onMessageFinalized;
  }, [onMessageFinalized]);

  const conversation = useConversation({
    onConnect: () => {
      setSpeakerStatus("ai-thinking");
    },
    onDisconnect: () => {
      setSpeakerStatus("idle");
      setCurrentTranscript("");
    },
    onMessage: (message) => {
      const role = message.source === "user" ? "user" : "assistant";
      const content = message.message;

      if (content.trim()) {
        setMessages((prev) => [
          ...prev,
          {
            role,
            content,
            timestamp: new Date(),
          },
        ]);
        onMessageFinalizedRef.current?.(role, content);
      }
    },
    onModeChange: (mode) => {
      if (mode.mode === "speaking") {
        setSpeakerStatus("ai-speaking");
      } else if (mode.mode === "listening") {
        setSpeakerStatus("idle");
      }
    },
    onError: (error) => {
      console.error("ElevenLabs error:", error);
    },
  });

  // Track user speaking from conversation status
  useEffect(() => {
    if (conversation.isSpeaking) {
      setSpeakerStatus("ai-speaking");
    }
  }, [conversation.isSpeaking]);

  const startCall = useCallback(async () => {
    if (!agentId) return;

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      await conversation.startSession({
        agentId,
        connectionType: "websocket",
      });
    } catch (error) {
      console.error("Failed to start ElevenLabs session:", error);
    }
  }, [agentId, conversation]);

  const endCall = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      console.error("Failed to end ElevenLabs session:", error);
    }
  }, [conversation]);

  const toggleCall = useCallback(() => {
    if (conversation.status === "connected") {
      endCall();
    } else {
      startCall();
    }
  }, [conversation.status, startCall, endCall]);

  return {
    isConnected: !!agentId,
    isCallActive: conversation.status === "connected",
    speakerStatus,
    messages,
    currentTranscript,
    volumeLevel,
    startCall,
    endCall,
    toggleCall,
  };
}
