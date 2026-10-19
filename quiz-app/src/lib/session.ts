import type { LessonId, OptKey, Question } from "../types";
import type { Verdict } from "./scoring";
import { shuffle } from "./shuffle";

export interface Item { q: Question; order: OptKey[] }
export type Mode = "practice" | "exam" | "wrong";
export interface Session {
  title: string; mode: Mode; items: Item[]; allowDocs: boolean; durationSec?: number; lesson?: LessonId;
}
export interface ResultRow { q: Question; order: OptKey[]; picked: OptKey[]; verdict: Verdict; hints: number }
export interface ResultData { session: Session; rows: ResultRow[]; correct: number; partial: number; total: number; score: number; sec: number; timeUp: boolean }

export function makeItems(qs: Question[], shuffleQ: boolean, shuffleO: boolean): Item[] {
  const list = shuffleQ ? shuffle(qs) : [...qs];
  return list.map((q) => {
    const keys = q.options.map((o) => o.key);
    return { q, order: shuffleO ? shuffle(keys) : keys };
  });
}

export const EXAM_SECONDS = 15 * 60;
