"use client";

import { useVapi, SpeakerStatus } from "@/hooks/useVapi";
import { trpc } from "@/trpc/client";
import { useEffect, useRef, useState } from "react";

function MicButton({
  isActive,
  status,
  volumeLevel,
  onClick,
  disabled,
}: {
  isActive: boolean;
  status: SpeakerStatus;
  volumeLevel: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  const getStatusColor = () => {
    if (disabled) return "bg-gray-700";
    switch (status) {
      case "user-speaking":
        return "bg-green-500 shadow-green-500/50";
      case "ai-speaking":
        return "bg-purple-500 shadow-purple-500/50";
      case "ai-thinking":
        return "bg-yellow-500 shadow-yellow-500/50 animate-pulse";
      default:
        return isActive ? "bg-blue-500 shadow-blue-500/50" : "bg-gray-600";
    }
  };

  const getStatusText = () => {
    if (disabled) return "読み込み中...";
    switch (status) {
      case "user-speaking":
        return "あなたが話しています";
      case "ai-speaking":
        return "面接官が話しています";
      case "ai-thinking":
        return "考え中...";
      default:
        return isActive ? "待機中" : "タップして開始";
    }
  };

  const scale = isActive ? 1 + volumeLevel * 0.3 : 1;

  return (
    <div className="flex flex-col items-center gap-6">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`relative w-32 h-32 rounded-full transition-all duration-200 shadow-lg ${getStatusColor()} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        style={{ transform: `scale(${scale})` }}
      >
        {isActive && !disabled && (
          <>
            <span
              className={`absolute inset-0 rounded-full animate-ping opacity-30 ${getStatusColor()}`}
            />
            <span
              className={`absolute inset-[-8px] rounded-full border-4 ${
                status === "user-speaking"
                  ? "border-green-400"
                  : status === "ai-speaking"
                  ? "border-purple-400"
                  : status === "ai-thinking"
                  ? "border-yellow-400"
                  : "border-blue-400"
              } opacity-50`}
            />
          </>
        )}

        <svg
          className="w-12 h-12 mx-auto text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93V7h2v1c0 2.76 2.24 5 5 5s5-2.24 5-5V7h2v1c0 4.08-3.06 7.44-7 7.93V19h3v2H9v-2h3v-3.07z" />
        </svg>
      </button>

      <div className="text-center">
        <p
          className={`text-lg font-medium ${
            disabled
              ? "text-gray-500"
              : status === "user-speaking"
              ? "text-green-400"
              : status === "ai-speaking"
              ? "text-purple-400"
              : status === "ai-thinking"
              ? "text-yellow-400"
              : "text-gray-400"
          }`}
        >
          {getStatusText()}
        </p>
        {!isActive && !disabled && (
          <p className="text-sm text-gray-500 mt-1">
            マイクをタップして面接を開始
          </p>
        )}
      </div>
    </div>
  );
}

function TranscriptDisplay({
  messages,
  currentTranscript,
  speakerStatus,
}: {
  messages: { role: string; content: string; timestamp: Date }[];
  currentTranscript: string;
  speakerStatus: SpeakerStatus;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentTranscript]);

  return (
    <div
      ref={scrollRef}
      className="w-full max-w-2xl h-80 overflow-y-auto bg-gray-900/50 rounded-2xl p-4 space-y-3"
    >
      {messages.length === 0 && !currentTranscript && (
        <p className="text-gray-500 text-center py-8">
          会話がここに表示されます
        </p>
      )}

      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2 ${
              msg.role === "user"
                ? "bg-green-600 text-white rounded-br-none"
                : "bg-purple-600 text-white rounded-bl-none"
            }`}
          >
            <p className="text-xs opacity-70 mb-1">
              {msg.role === "user" ? "あなた" : "面接官"}
            </p>
            <p>{msg.content}</p>
          </div>
        </div>
      ))}

      {currentTranscript && (
        <div
          className={`flex ${
            speakerStatus === "user-speaking" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2 opacity-70 ${
              speakerStatus === "user-speaking"
                ? "bg-green-600/50 text-white rounded-br-none"
                : "bg-purple-600/50 text-white rounded-bl-none"
            }`}
          >
            <p className="text-xs opacity-70 mb-1">
              {speakerStatus === "user-speaking" ? "あなた" : "面接官"} (話し中...)
            </p>
            <p>{currentTranscript}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VoiceInterview() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  // tRPCでサーバーから設定を取得
  const { data: config, isLoading: configLoading } = trpc.interview.getConfig.useQuery();
  const startSessionMutation = trpc.interview.startSession.useMutation();
  const endSessionMutation = trpc.interview.endSession.useMutation();
  const saveMessageMutation = trpc.interview.saveMessage.useMutation();

  const {
    isCallActive,
    speakerStatus,
    messages,
    currentTranscript,
    volumeLevel,
    toggleCall,
  } = useVapi({
    publicKey: config?.publicKey || "",
    assistantConfig: config?.assistant,
    onMessageFinalized: (role, content) => {
      // メッセージが確定したらサーバーに保存
      if (sessionId) {
        saveMessageMutation.mutate({
          sessionId,
          role: role as "user" | "assistant",
          content,
        });
      }
    },
  });

  // 通話開始時にセッションを作成
  useEffect(() => {
    if (isCallActive && !sessionId) {
      startSessionMutation.mutate(undefined, {
        onSuccess: (data) => {
          setSessionId(data.sessionId);
        },
      });
    } else if (!isCallActive && sessionId) {
      endSessionMutation.mutate({ sessionId });
      setSessionId(null);
    }
  }, [isCallActive, sessionId, startSessionMutation, endSessionMutation]);

  const isReady = !configLoading && config?.publicKey;

  if (!configLoading && !config?.publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-8">
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">設定が必要です</h2>
          <p className="text-gray-300 mb-4">
            Vapi APIキーが設定されていません。
          </p>
          <code className="bg-black/50 px-3 py-1 rounded text-sm">
            NEXT_PUBLIC_VAPI_PUBLIC_KEY
          </code>
          <p className="text-gray-400 mt-4 text-sm">
            .env.local ファイルにAPIキーを設定してください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          キャバクラ AI 面接
        </h1>
        <p className="text-gray-400 mt-2">AI面接官があなたをお待ちしています</p>
      </header>

      <main className="flex flex-col items-center gap-8 flex-1 justify-center w-full">
        <MicButton
          isActive={isCallActive}
          status={speakerStatus}
          volumeLevel={volumeLevel}
          onClick={toggleCall}
          disabled={!isReady}
        />

        <TranscriptDisplay
          messages={messages}
          currentTranscript={currentTranscript}
          speakerStatus={speakerStatus}
        />
      </main>

      <footer className="text-center text-gray-500 text-sm">
        {isCallActive ? (
          <button
            onClick={toggleCall}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
          >
            面接を終了する
          </button>
        ) : (
          <p>マイクボタンをタップして面接を開始してください</p>
        )}
      </footer>
    </div>
  );
}
