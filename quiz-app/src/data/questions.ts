import type { Question, LessonId } from "../types";
import base from "./questions.base.json";
import { m06 } from "./m06";
import { m07 } from "./m07";
import { m08 } from "./m08";
import { m09 } from "./m09";
import { m10 } from "./m10";
import { m11 } from "./m11";

const metaAll = { ...m06, ...m07, ...m08, ...m09, ...m10, ...m11 };

export const questions: Question[] = (base as any[]).map((b) => {
  const m = metaAll[b.id];
  if (!m) throw new Error(`Thiếu metadata cho ${b.id}`);
  return {
    id: b.id, quiz: b.quiz as LessonId, number: b.number, type: b.type, prompt: b.prompt, options: b.options,
    answer: m.answer, confidence: m.confidence ?? "high", hints: m.hints, explanation: m.explanation,
    notes: m.notes, knowledgeIds: m.knowledgeIds, tags: m.tags, calc: m.calc,
  } as Question;
});

export const LESSONS: { id: LessonId; title: string }[] = [
  { id: 6, title: "Quản trị nhân sự" },
  { id: 7, title: "Kế toán & dòng tiền" },
  { id: 8, title: "Quản trị chi phí & chỉ số tài chính" },
  { id: 9, title: "Quản trị chuỗi cung ứng" },
  { id: 10, title: "Lãnh đạo hiệu quả & hiệu suất" },
  { id: 11, title: "Kiểm soát doanh nghiệp" },
];
