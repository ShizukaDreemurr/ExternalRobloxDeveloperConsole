import type { CalcId, OptKey } from "../types";
export interface QMeta {
  answer: OptKey[];
  confidence?: "high" | "verify";
  hints: [string, string, string];
  explanation: string;
  notes: [string, string, string, string];
  knowledgeIds: string[];
  tags: string[];
  calc?: CalcId;
}
