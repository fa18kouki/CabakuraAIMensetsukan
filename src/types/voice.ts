export type VoiceProvider = "vapi" | "elevenlabs";

export type SpeakerStatus = "idle" | "user-speaking" | "ai-speaking" | "ai-thinking";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface VoiceHookReturn {
  isConnected: boolean;
  isCallActive: boolean;
  speakerStatus: SpeakerStatus;
  messages: Message[];
  currentTranscript: string;
  volumeLevel: number;
  startCall: () => Promise<void> | void;
  endCall: () => Promise<void> | void;
  toggleCall: () => Promise<void> | void;
}
