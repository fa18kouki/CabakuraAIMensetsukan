import { z } from "zod";
import { router, publicProcedure } from "../trpc";

// 面接官の設定（サーバーサイドで管理）
const VAPI_ASSISTANT_CONFIG = {
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
    voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel
  },
};

// 面接履歴を保持（本番ではDBに保存）
const interviewHistory: Map<
  string,
  {
    id: string;
    startedAt: Date;
    endedAt?: Date;
    provider: "vapi" | "elevenlabs";
    messages: Array<{ role: string; content: string; timestamp: Date }>;
  }
> = new Map();

export const interviewRouter = router({
  // Vapi設定を取得
  getVapiConfig: publicProcedure.query(() => {
    return {
      publicKey: process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "",
      assistant: VAPI_ASSISTANT_CONFIG,
    };
  }),

  // ElevenLabs設定を取得
  getElevenLabsConfig: publicProcedure.query(() => {
    return {
      agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "",
    };
  }),

  // 利用可能なプロバイダーを取得
  getAvailableProviders: publicProcedure.query(() => {
    const providers: Array<{ id: "vapi" | "elevenlabs"; name: string; available: boolean }> = [
      {
        id: "vapi",
        name: "Vapi",
        available: !!process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY,
      },
      {
        id: "elevenlabs",
        name: "ElevenLabs",
        available: !!process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID,
      },
    ];
    return providers;
  }),

  // 面接セッションを開始
  startSession: publicProcedure
    .input(z.object({ provider: z.enum(["vapi", "elevenlabs"]) }))
    .mutation(({ input }) => {
      const id = crypto.randomUUID();
      interviewHistory.set(id, {
        id,
        startedAt: new Date(),
        provider: input.provider,
        messages: [],
      });
      return { sessionId: id, startedAt: new Date() };
    }),

  // 面接セッションを終了
  endSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(({ input }) => {
      const session = interviewHistory.get(input.sessionId);
      if (session) {
        session.endedAt = new Date();
        return { success: true, duration: session.endedAt.getTime() - session.startedAt.getTime() };
      }
      return { success: false, duration: 0 };
    }),

  // メッセージを保存
  saveMessage: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .mutation(({ input }) => {
      const session = interviewHistory.get(input.sessionId);
      if (session) {
        session.messages.push({
          role: input.role,
          content: input.content,
          timestamp: new Date(),
        });
        return { success: true, messageCount: session.messages.length };
      }
      return { success: false, messageCount: 0 };
    }),

  // セッション履歴を取得
  getSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      return interviewHistory.get(input.sessionId) || null;
    }),
});
