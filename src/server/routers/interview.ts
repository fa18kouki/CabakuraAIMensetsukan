import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import {
  type Candidate,
  createEmptyProfile,
  isProfileComplete,
  REQUIRED_FIELDS,
  FIELD_LABELS,
} from "@/types/candidate";

// 必須項目のリストをプロンプトに含める
const REQUIRED_FIELDS_FOR_PROMPT = REQUIRED_FIELDS.map(
  (field) => `- ${FIELD_LABELS[field]}`
).join("\n");

// 面接官の設定（サーバーサイドで管理）
const VAPI_ASSISTANT_CONFIG = {
  name: "キャバクラ面接官",
  firstMessage:
    "こんにちは！本日は面接にお越しいただきありがとうございます。私はAI面接官の美咲です。リラックスしてお話しくださいね。まずは、お名前を教えていただけますか？",
  model: {
    provider: "openai",
    model: "gpt-4o",
    systemPrompt: `あなたはキャバクラの面接官「美咲」です。
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
- 長すぎる説明は避ける`,
  },
  voice: {
    provider: "11labs",
    voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel
  },
};

// 候補者データを保持（本番ではDBに保存）
const candidates: Map<string, Candidate> = new Map();

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
      const candidate: Candidate = {
        id,
        sessionId: id,
        profile: createEmptyProfile(),
        messages: [],
        status: "interviewing",
        provider: input.provider,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      candidates.set(id, candidate);
      return { sessionId: id, startedAt: new Date() };
    }),

  // 面接セッションを終了
  endSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(({ input }) => {
      const candidate = candidates.get(input.sessionId);
      if (candidate) {
        candidate.status = isProfileComplete(candidate.profile) ? "completed" : "incomplete";
        candidate.updatedAt = new Date();
        return {
          success: true,
          duration: candidate.updatedAt.getTime() - candidate.createdAt.getTime(),
          isComplete: candidate.status === "completed",
        };
      }
      return { success: false, duration: 0, isComplete: false };
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
      const candidate = candidates.get(input.sessionId);
      if (candidate) {
        candidate.messages.push({
          role: input.role,
          content: input.content,
          timestamp: new Date(),
        });
        candidate.updatedAt = new Date();
        return { success: true, messageCount: candidate.messages.length };
      }
      return { success: false, messageCount: 0 };
    }),

  // プロフィール情報を更新
  updateProfile: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        field: z.enum([
          "name",
          "age",
          "experience",
          "desiredPosition",
          "expectedSalary",
          "shiftPreference",
          "strengths",
          "motivation",
          "questions",
        ]),
        value: z.union([z.string(), z.number()]),
      })
    )
    .mutation(({ input }) => {
      const candidate = candidates.get(input.sessionId);
      if (candidate) {
        if (input.field === "age") {
          candidate.profile.age =
            typeof input.value === "number" ? input.value : parseInt(input.value as string, 10);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (candidate.profile as any)[input.field] = input.value;
        }
        candidate.updatedAt = new Date();
        return { success: true, isComplete: isProfileComplete(candidate.profile) };
      }
      return { success: false, isComplete: false };
    }),

  // セッション/候補者情報を取得
  getSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      return candidates.get(input.sessionId) || null;
    }),

  // すべての候補者を取得（管理者用）
  getAllCandidates: publicProcedure.query(() => {
    return Array.from(candidates.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }),

  // 候補者を削除（管理者用）
  deleteCandidate: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      const deleted = candidates.delete(input.id);
      return { success: deleted };
    }),
});
