"use client";

import { useVapi, SpeakerStatus } from "@/hooks/useVapi";
import { useEffect, useRef } from "react";

const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "";

const ASSISTANT_CONFIG = {
  name: "キャバクラ面接官",
  firstMessage:
    "こんにちは！本日は面接にお越しいただきありがとうございます。私はAI面接官の美咲です。リラックスしてお話しくださいね。まずは、お名前と年齢を教えていただけますか？",
  model: {
    provider: "openai",
    model: "gpt-4o",
    systemPrompt: `あなたはキャバクラの面接官「美咲」です。
候補者に対して丁寧かつフレンドリーに接してください。

面接の流れ：
1. 自己紹介（名前、年齢）
2. 志望動機（なぜキャバクラで働きたいか）
3. 接客経験の有無
4. シフトの希望（週何日、何時から何時まで働けるか）
5. 自分の長所・アピールポイント
6. 質問があるか

面接官としての注意点：
- 常に明るく、優しい口調で話す
- 候補者の緊張をほぐすような声かけをする
- 回答に対して適切なフォローアップ質問をする
- 不適切な質問はしない
- 面接の最後には「本日はありがとうございました」と締める
- 日本語で会話する

回答は簡潔に、自然な会話のように話してください。長すぎる説明は避けてください。`,
  },
  voice: {
    provider: "11labs",
    voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel - 女性の声
  },
};

function MicButton({
  isActive,
  status,
  volumeLevel,
  onClick,
}: {
  isActive: boolean;
  status: SpeakerStatus;
  volumeLevel: number;
  onClick: () => void;
}) {
  const getStatusColor = () => {
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
        className={`relative w-32 h-32 rounded-full transition-all duration-200 shadow-lg ${getStatusColor()}`}
        style={{ transform: `scale(${scale})` }}
      >
        {/* Outer ring animation for active states */}
        {isActive && (
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

        {/* Mic Icon */}
        <svg
          className="w-12 h-12 mx-auto text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          {isActive ? (
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93V7h2v1c0 2.76 2.24 5 5 5s5-2.24 5-5V7h2v1c0 4.08-3.06 7.44-7 7.93V19h3v2H9v-2h3v-3.07z" />
          ) : (
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93V7h2v1c0 2.76 2.24 5 5 5s5-2.24 5-5V7h2v1c0 4.08-3.06 7.44-7 7.93V19h3v2H9v-2h3v-3.07z" />
          )}
        </svg>
      </button>

      <div className="text-center">
        <p
          className={`text-lg font-medium ${
            status === "user-speaking"
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
        {!isActive && (
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

      {/* Current transcript being spoken */}
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
  const {
    isConnected,
    isCallActive,
    speakerStatus,
    messages,
    currentTranscript,
    volumeLevel,
    toggleCall,
  } = useVapi({
    publicKey: VAPI_PUBLIC_KEY,
    assistantConfig: ASSISTANT_CONFIG,
  });

  if (!VAPI_PUBLIC_KEY) {
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
      {/* Header */}
      <header className="text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          キャバクラ AI 面接
        </h1>
        <p className="text-gray-400 mt-2">AI面接官があなたをお待ちしています</p>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center gap-8 flex-1 justify-center w-full">
        <MicButton
          isActive={isCallActive}
          status={speakerStatus}
          volumeLevel={volumeLevel}
          onClick={toggleCall}
        />

        <TranscriptDisplay
          messages={messages}
          currentTranscript={currentTranscript}
          speakerStatus={speakerStatus}
        />
      </main>

      {/* Footer */}
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
