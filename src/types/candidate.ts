export interface CandidateProfile {
  // 必須項目
  name: string | null;
  age: number | null;
  experience: string | null; // 接客経験
  desiredPosition: string | null; // 希望職種
  expectedSalary: string | null; // 希望年収
  shiftPreference: string | null; // シフト希望

  // オプション項目
  strengths: string | null; // 長所・アピールポイント
  motivation: string | null; // 志望動機
  questions: string | null; // 質問事項
}

export interface Candidate {
  id: string;
  sessionId: string;
  profile: CandidateProfile;
  messages: Array<{ role: string; content: string; timestamp: Date }>;
  status: "interviewing" | "completed" | "incomplete";
  provider: "vapi" | "elevenlabs";
  createdAt: Date;
  updatedAt: Date;
}

export const REQUIRED_FIELDS: (keyof CandidateProfile)[] = [
  "name",
  "age",
  "experience",
  "desiredPosition",
  "expectedSalary",
  "shiftPreference",
];

export const FIELD_LABELS: Record<keyof CandidateProfile, string> = {
  name: "お名前",
  age: "年齢",
  experience: "接客経験",
  desiredPosition: "希望職種",
  expectedSalary: "希望年収",
  shiftPreference: "シフト希望",
  strengths: "長所・アピールポイント",
  motivation: "志望動機",
  questions: "質問事項",
};

export function isProfileComplete(profile: CandidateProfile): boolean {
  return REQUIRED_FIELDS.every((field) => profile[field] !== null);
}

export function getCompletionPercentage(profile: CandidateProfile): number {
  const filledFields = REQUIRED_FIELDS.filter((field) => profile[field] !== null).length;
  return Math.round((filledFields / REQUIRED_FIELDS.length) * 100);
}

export function createEmptyProfile(): CandidateProfile {
  return {
    name: null,
    age: null,
    experience: null,
    desiredPosition: null,
    expectedSalary: null,
    shiftPreference: null,
    strengths: null,
    motivation: null,
    questions: null,
  };
}
