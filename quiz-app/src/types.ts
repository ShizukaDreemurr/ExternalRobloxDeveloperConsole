export type LessonId = 6 | 7 | 8 | 9 | 10 | 11;
export type OptKey = "A" | "B" | "C" | "D";
export type CalcId = "sddp" | "hoavon" | "tyleno" | "nhanh" | "trailai" | "vcsh" | "dtthuan" | "lngop" | "thue";

export interface Question {
  id: string;
  quiz: LessonId;
  number: number;
  type: "single" | "multi";
  prompt: string;
  options: { key: OptKey; text: string }[];
  answer: OptKey[];
  confidence: "high" | "verify";
  hints: [string, string, string];
  explanation: string;
  /** ghi chú theo từng phương án (thứ tự A,B,C,D): vì sao đúng / vì sao sai */
  notes: [string, string, string, string];
  knowledgeIds: string[];
  tags: string[];
  calc?: CalcId;
}

export interface KnowledgeCard {
  id: string;
  lesson: LessonId;
  title: string;
  summary: string;
  body: string;
  formula?: string;
  example?: string;
  keywords: string[];
  source: string;
  related: string[];
}

export interface GlossaryGroup { terms: string[] }
