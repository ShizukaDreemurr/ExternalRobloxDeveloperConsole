import type { LessonId, Question } from "../types";
import type { Verdict } from "./scoring";
import { loadJSON, saveJSON, safeRemove } from "./storage";

export interface Attempt {
  at: number; title: string; mode: string; correct: number; total: number; score: number; sec: number;
  topics: Record<string, { c: number; t: number }>;
}
export interface Progress {
  v: 1;
  attempts: Attempt[];
  /** id câu → số lần đúng liên tiếp kể từ lần sai gần nhất (rời hàng khi ≥ 2) */
  wrong: Record<string, number>;
  best: Record<string, number>;
  seen: Record<string, string[]>;
}

const KEY = "bus1052.progress.v1";
export const emptyProgress = (): Progress => ({ v: 1, attempts: [], wrong: {}, best: {}, seen: {} });

export function loadProgress(): Progress {
  const p = loadJSON<Progress>(KEY, emptyProgress());
  return p && p.v === 1 ? { ...emptyProgress(), ...p } : emptyProgress();
}
export const saveProgress = (p: Progress) => saveJSON(KEY, p);
export const clearProgress = () => safeRemove(KEY);

export function markAnswer(p: Progress, q: Question, verdict: Verdict): Progress {
  if (verdict === "blank") return p;
  const wrong = { ...p.wrong };
  if (verdict === "correct") {
    if (q.id in wrong) {
      wrong[q.id] += 1;
      if (wrong[q.id] >= 2) delete wrong[q.id];
    }
  } else wrong[q.id] = 0;
  const lesson = String(q.quiz);
  const seen = { ...p.seen, [lesson]: [...new Set([...(p.seen[lesson] ?? []), q.id])] };
  return { ...p, wrong, seen };
}

export function addAttempt(p: Progress, a: Attempt, lesson?: LessonId): Progress {
  const attempts = [a, ...p.attempts].slice(0, 20);
  const best = { ...p.best };
  if (lesson != null) best[String(lesson)] = Math.max(best[String(lesson)] ?? 0, a.score);
  return { ...p, attempts, best };
}
