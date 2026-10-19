import Fuse from "fuse.js";
import type { KnowledgeCard } from "../types";
import { knowledge } from "../data/knowledge";
import { glossary } from "../data/glossary";
import { normalizeVi } from "./normalizeVi";

interface Doc {
  card: KnowledgeCard;
  title: string; keywords: string; summary: string; body: string;
}

export interface SearchHit {
  card: KnowledgeCard;
  score: number; // càng nhỏ càng khớp
  snippet: string;
}

const docs: Doc[] = knowledge.map((card) => ({
  card,
  title: normalizeVi(card.title),
  keywords: normalizeVi(card.keywords.join(" | ")),
  summary: normalizeVi(card.summary),
  body: normalizeVi(`${card.body} ${card.formula ?? ""} ${card.example ?? ""}`),
}));

const fuse = new Fuse(docs, {
  includeScore: true,
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
  keys: [
    { name: "title", weight: 0.4 },
    { name: "keywords", weight: 0.4 },
    { name: "summary", weight: 0.15 },
    { name: "body", weight: 0.05 },
  ],
});

const glossaryN = glossary.map((g) => g.terms.map(normalizeVi));

/** Mở rộng truy vấn bằng các từ đồng nghĩa/viết tắt trong glossary. */
export function expandQuery(q: string): string[] {
  const n = normalizeVi(q).trim();
  const out = new Set<string>([n]);
  for (const group of glossaryN) {
    for (const term of group) {
      const isShort = term.length <= 4;
      const hit = isShort ? n.split(/\s+/).includes(term) || n === term : n.includes(term) || (n.length >= 4 && term.includes(n));
      if (hit) group.forEach((t) => out.add(t));
    }
  }
  return [...out];
}

function makeSnippet(card: KnowledgeCard, variants: string[]): string {
  const text = card.body.replace(/\*\*|\n[-\d.]+\s/g, " ").replace(/\n/g, " ");
  const tn = normalizeVi(text);
  for (const v of variants) {
    const i = tn.indexOf(v);
    if (i >= 0 && v.length >= 2) {
      const s = Math.max(0, i - 40);
      return (s > 0 ? "…" : "") + text.slice(s, s + 150) + "…";
    }
  }
  return card.summary;
}

export function searchKnowledge(query: string, lesson?: number | null, limit = 8): SearchHit[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const variants = expandQuery(q);
  const best = new Map<string, { doc: Doc; score: number }>();
  variants.forEach((v, idx) => {
    for (const r of fuse.search(v)) {
      // truy vấn gốc ưu tiên hơn biến thể mở rộng
      const score = (r.score ?? 1) + (idx === 0 ? 0 : 0.02);
      const cur = best.get(r.item.card.id);
      if (!cur || score < cur.score) best.set(r.item.card.id, { doc: r.item, score });
    }
  });
  // thưởng cho khớp trực tiếp trong tiêu đề/từ khóa
  const nq = variants[0];
  for (const b of best.values()) {
    if (b.doc.title.includes(nq)) b.score -= 0.3;
    else if (b.doc.keywords.includes(nq)) b.score -= 0.2;
  }
  const ranked = [...best.values()]
    .filter((b) => lesson == null || b.doc.card.lesson === lesson)
    .sort((a, b) => a.score - b.score);
  // cắt bớt kết quả “mờ” so với kết quả tốt nhất
  const cutoff = ranked.length ? Math.max(0.12, ranked[0].score + 0.16) : 0;
  return ranked
    .filter((b) => b.score <= cutoff)
    .slice(0, limit)
    .map((b) => ({ card: b.doc.card, score: b.score, snippet: makeSnippet(b.doc.card, variants) }));
}

/** Tách văn bản thành các đoạn, đánh dấu phần khớp truy vấn (không phân biệt dấu). */
export function highlightParts(text: string, query: string): { text: string; hit: boolean }[] {
  const variants = expandQuery(query).filter((v) => v.length >= 2);
  if (variants.length === 0) return [{ text, hit: false }];
  const tn = normalizeVi(text);
  const mark = new Array(text.length).fill(false);
  for (const v of variants) {
    let from = 0;
    for (;;) {
      const i = tn.indexOf(v, from);
      if (i < 0) break;
      for (let k = i; k < i + v.length; k++) mark[k] = true;
      from = i + v.length;
    }
  }
  const parts: { text: string; hit: boolean }[] = [];
  let cur = "";
  let curHit = mark[0] ?? false;
  for (let i = 0; i < text.length; i++) {
    if (mark[i] !== curHit) { parts.push({ text: cur, hit: curHit }); cur = ""; curHit = mark[i]; }
    cur += text[i];
  }
  if (cur) parts.push({ text: cur, hit: curHit });
  return parts;
}
