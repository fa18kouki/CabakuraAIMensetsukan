"use client";

import { trpc } from "@/trpc/client";
import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const startSessionMutation = trpc.chat.startSession.useMutation();
  const sendMessageMutation = trpc.chat.sendMessage.useMutation();

  // セッション開始
  useEffect(() => {
    if (!sessionId) {
      startSessionMutation.mutate(undefined, {
        onSuccess: (data) => {
          setSessionId(data.sessionId);
          setMessages([{ role: "assistant", content: data.firstMessage }]);
        },
      });
    }
  }, [sessionId, startSessionMutation]);

  // 自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    sendMessageMutation.mutate(
      { sessionId, message: userMessage },
      {
        onSuccess: (data) => {
          if (data.success && data.reply) {
            setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
          }
        },
        onSettled: () => {
          setIsLoading(false);
        },
      }
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* ヘッダー */}
      <header className="border-b border-gray-800 p-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <a href="/" className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                チャット面接
              </h1>
              <p className="text-gray-500 text-xs">テキストで面接を受ける</p>
            </div>
          </div>
          <a
            href="/admin"
            className="text-gray-500 hover:text-gray-300 text-sm"
          >
            管理者
          </a>
        </div>
      </header>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-green-600 text-white rounded-br-none"
                    : "bg-purple-600/80 text-white rounded-bl-none"
                }`}
              >
                <p className="text-xs opacity-70 mb-1">
                  {msg.role === "user" ? "あなた" : "面接官 美咲"}
                </p>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-purple-600/50 rounded-2xl rounded-bl-none px-4 py-3">
                <p className="text-xs opacity-70 mb-1">面接官 美咲</p>
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 入力エリア */}
      <div className="border-t border-gray-800 p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="メッセージを入力..."
              disabled={isLoading || !sessionId}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !sessionId}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-full px-6 py-3 font-medium transition-colors"
            >
              送信
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
