import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import OpenAI from "openai";
import {
  type Candidate,
  createEmptyProfile,
  isProfileComplete,
  REQUIRED_FIELDS,
  FIELD_LABELS,
} from "@/types/candidate";

// OpenRouter クライアント（Gemini使用）- 遅延初期化
let openrouter: OpenAI | null = null;

function getOpenRouterClient(): OpenAI {
  if (!openrouter) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not set");
    }
    openrouter = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    });
  }
  return openrouter;
}

// AI設定
const AI_MODEL = "google/gemini-2.0-flash-001";
const AI_TEMPERATURE = 0.7;
const AI_MAX_TOKENS = 500;

// 必須項目のリストをプロンプトに含める
const REQUIRED_FIELDS_FOR_PROMPT = REQUIRED_FIELDS.map(
  (field) => `- ${FIELD_LABELS[field]}`
).join("\n");

const SYSTEM_PROMPT = `あなたはキャバクラの面接官「美咲」です。
候補者に対して丁寧かつフレンドリーに接してください。

【重要】以下の情報をすべて聞き出すまで面接を続けてください：
${REQUIRED_FIELDS_FOR_PROMPT}

聞き出し方のルール：
1. 一度に複数の質問をしない。1つずつ順番に聞く
2. 回答があったら、その内容を確認してから次の質問に移る
3. 曖昧な回答には具体的に聞き直す（例：「週に何日くらい働けますか？」「時間帯は何時から何時まで希望ですか？」）
4. すべての必須項目を聞き終えたら、追加で「長所・アピールポイント」「志望動機」「質問があるか」を聞く
5. 最後に「本日はありがとうございました。後日、結果をご連絡いたします」と締める

面接官としての注意点：
- 常に明るく、優しい口調で話す
- 候補者の緊張をほぐすような声かけをする
- 回答に対して適切なリアクションをする（「素敵ですね」「なるほど」など）
- 不適切な質問はしない
- 日本語で会話する
- 回答は簡潔に、自然な会話のように話す
- 長すぎる説明は避ける`;

const FIRST_MESSAGE =
  "こんにちは！本日は面接にお越しいただきありがとうございます。私はAI面接官の美咲です。リラックスしてお話しくださいね。まずは、お名前を教えていただけますか？";

// チャットセッションデータを保持（本番ではDBに保存）
const chatSessions: Map<string, Candidate> = new Map();

export const chatRouter = router({
  // チャットセッションを開始
  startSession: publicProcedure.mutation(() => {
    const id = crypto.randomUUID();
    const candidate: Candidate = {
      id,
      sessionId: id,
      profile: createEmptyProfile(),
      messages: [
        {
          role: "assistant",
          content: FIRST_MESSAGE,
          timestamp: new Date(),
        },
      ],
      status: "interviewing",
      provider: "vapi", // chatの場合は便宜上vapiとする
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    chatSessions.set(id, candidate);
    return {
      sessionId: id,
      firstMessage: FIRST_MESSAGE,
    };
  }),

  // メッセージを送信して返答を取得
  sendMessage: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const session = chatSessions.get(input.sessionId);
      if (!session) {
        return { success: false, reply: "", error: "Session not found" };
      }

      // ユーザーメッセージを追加
      session.messages.push({
        role: "user",
        content: input.message,
        timestamp: new Date(),
      });

      try {
        // OpenRouter API (Gemini) を呼び出し
        const client = getOpenRouterClient();
        const response = await client.chat.completions.create({
          model: AI_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...session.messages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
          ],
          temperature: AI_TEMPERATURE,
          max_tokens: AI_MAX_TOKENS,
        });

        const reply = response.choices[0]?.message?.content || "申し訳ありません、回答できませんでした。";

        // AIの返答を追加
        session.messages.push({
          role: "assistant",
          content: reply,
          timestamp: new Date(),
        });

        session.updatedAt = new Date();

        return {
          success: true,
          reply,
          isComplete: isProfileComplete(session.profile),
        };
      } catch (error) {
        console.error("OpenRouter API error:", error);
        return {
          success: false,
          reply: "",
          error: "AIとの通信に失敗しました",
        };
      }
    }),

  // セッションを終了
  endSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(({ input }) => {
      const session = chatSessions.get(input.sessionId);
      if (session) {
        session.status = isProfileComplete(session.profile) ? "completed" : "incomplete";
        session.updatedAt = new Date();
        return { success: true };
      }
      return { success: false };
    }),

  // セッション情報を取得
  getSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      return chatSessions.get(input.sessionId) || null;
    }),

  // すべてのチャットセッションを取得（管理者用）
  getAllSessions: publicProcedure.query(() => {
    return Array.from(chatSessions.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }),
});
