import type { OptKey, Question } from "../types";

export type Verdict = "correct" | "partial" | "wrong" | "blank";

/** Chọn đủ và không thừa → đúng. Chọn không sai nhưng thiếu → đúng một phần (không tính điểm). */
export function gradeAnswer(q: Pick<Question, "answer">, picked: OptKey[]): Verdict {
  if (picked.length === 0) return "blank";
  const ans = new Set(q.answer);
  const right = picked.filter((k) => ans.has(k)).length;
  const wrong = picked.length - right;
  if (wrong === 0 && right === ans.size) return "correct";
  if (wrong === 0 && right > 0) return "partial";
  return "wrong";
}

export function toTen(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 1000) / 100;
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
