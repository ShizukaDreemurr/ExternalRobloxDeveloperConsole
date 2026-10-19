import { useMemo } from "react";
import { searchKnowledge, highlightParts } from "../lib/search";
import { LESSONS } from "../data/questions";

export function Highlight({ text, query }: { text: string; query: string }) {
  const parts = useMemo(() => highlightParts(text, query), [text, query]);
  return <>{parts.map((p, i) => (p.hit ? <mark key={i} className="hl">{p.text}</mark> : <span key={i}>{p.text}</span>))}</>;
}

interface Props {
  query: string; setQuery: (s: string) => void;
  lesson: number | null; setLesson: (n: number | null) => void;
  suggestions: string[]; locked: boolean; lockedReason?: string;
  onOpen: (id: string) => void;
}

export default function KnowledgeSearch({ query, setQuery, lesson, setLesson, suggestions, locked, lockedReason, onOpen }: Props) {
  const hits = useMemo(() => (locked ? [] : searchKnowledge(query, lesson)), [query, lesson, locked]);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="kb-search">Tra cứu kiến thức</label>
        <input
          id="kb-search" type="search" value={query} disabled={locked}
          onChange={(e) => setQuery(e.target.value)} autoComplete="off" spellCheck={false}
          placeholder={locked ? "Tra cứu đang khóa (Thi thử)" : "Tra cứu: vd. so du dam phi, roi da, kpi…  ( / )"}
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm placeholder:text-mute disabled:opacity-60"
        />
        <label className="sr-only" htmlFor="kb-lesson">Lọc theo bài</label>
        <select id="kb-lesson" disabled={locked} value={lesson ?? ""} onChange={(e) => setLesson(e.target.value ? Number(e.target.value) : null)}
          className="rounded-xl border border-line bg-surface px-2 py-2 text-sm">
          <option value="">Mọi bài</option>
          {LESSONS.map((l) => <option key={l.id} value={l.id}>Bài {l.id}</option>)}
        </select>
      </div>
      {locked && <p className="rounded-xl bg-hintbg p-2.5 text-xs text-hint">🔒 {lockedReason ?? "Tra cứu bị khóa trong chế độ Thi thử."}</p>}
      {!locked && suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-mute">Từ khóa hay dùng cho câu này:</span>
          {suggestions.map((s) => <button key={s} className="chip cursor-pointer hover:bg-surface" onClick={() => setQuery(s)}>{s}</button>)}
        </div>
      )}
      {!locked && query.trim().length >= 2 && (
        <ul className="space-y-1.5" aria-label="Kết quả tra cứu">
          {hits.length === 0 && <li className="text-sm text-mute">Không tìm thấy thẻ phù hợp. Thử từ khóa ngắn hơn hoặc bỏ bộ lọc bài.</li>}
          {hits.map((h) => (
            <li key={h.card.id}>
              <button onClick={() => onOpen(h.card.id)} className="w-full rounded-xl border border-line bg-surface p-2.5 text-left hover:bg-surface2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold"><Highlight text={h.card.title} query={query} /></span>
                  <span className="chip shrink-0">{h.card.source}</span>
                </div>
                <p className="mt-0.5 text-xs text-mute"><Highlight text={h.snippet} query={query} /></p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
