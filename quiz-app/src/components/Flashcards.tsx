import { useEffect, useState } from "react";
import type { Question } from "../types";
import { LETTERS } from "./QuestionCard";
import SidePanel from "./SidePanel";
import { markAnswer, type Progress } from "../lib/progress";
import { openCard } from "./KnowledgeCard";
import { knowledgeById } from "../data/knowledge";

interface Props { title: string; qs: Question[]; onProgress: (fn: (p: Progress) => Progress) => void; onExit: () => void }

export default function Flashcards({ title, qs, onProgress, onExit }: Props) {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const [res, setRes] = useState<Record<string, boolean>>({});
  const q = qs[i];
  const done = Object.keys(res).length === qs.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && ["INPUT", "SELECT", "TEXTAREA"].includes(t.tagName)) return;
      if (e.key === " " || e.key === "Enter") { if (t?.tagName === "BUTTON") return; e.preventDefault(); setFlip((f) => !f); }
      else if (e.key === "ArrowRight") { setI((x) => Math.min(qs.length - 1, x + 1)); setFlip(false); }
      else if (e.key === "ArrowLeft") { setI((x) => Math.max(0, x - 1)); setFlip(false); }
      else if (e.key === "/") { e.preventDefault(); window.dispatchEvent(new Event("kb-focus")); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [qs.length]);

  const rate = (known: boolean) => {
    setRes((r) => ({ ...r, [q.id]: known }));
    onProgress((p) => markAnswer(p, q, known ? "correct" : "wrong"));
    setFlip(false);
    setI((x) => Math.min(qs.length - 1, x + 1));
  };

  const known = Object.values(res).filter(Boolean).length;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-3">
        <div className="card flex items-center justify-between gap-2">
          <div className="text-sm font-bold">{title} <span className="chip ml-1">Flashcard</span></div>
          <span className="text-sm text-mute">Thẻ {i + 1}/{qs.length} · đã nhớ {known}/{Object.keys(res).length}</span>
          <button className="btn !min-h-0 !py-1" onClick={onExit}>Thoát</button>
        </div>
        {done ? (
          <div className="card text-center">
            <p className="text-lg font-bold">Hoàn thành bộ thẻ 🎉</p>
            <p className="text-sm text-mute">Nhớ {known}/{qs.length}. Các thẻ “chưa nhớ” đã được đưa vào hàng Ôn câu sai.</p>
            <button className="btn btn-primary mt-3" onClick={onExit}>Về trang chủ</button>
          </div>
        ) : (
          <>
            <button onClick={() => setFlip(!flip)} aria-label={flip ? "Lật về mặt trước" : "Lật thẻ xem đáp án"}
              className="card min-h-[260px] w-full space-y-3 text-left transition hover:bg-surface2">
              <div className="flex gap-1.5"><span className="chip">Quiz {q.quiz} · Câu {q.number}</span><span className="chip">{flip ? "Mặt sau" : "Mặt trước"}</span><span className="chip">{q.type === "multi" ? "Nhiều đáp án" : "1 đáp án"}</span></div>
              <p className="text-base font-bold">{q.prompt}</p>
              {!flip ? (
                <ul className="space-y-1.5 text-sm">{q.options.map((o, k) => <li key={o.key} className="rounded-lg border border-line p-2"><b>{LETTERS[k]}.</b> {o.text}</li>)}</ul>
              ) : (
                <div className="space-y-2 text-sm">
                  <ul className="space-y-1">{q.options.filter((o) => q.answer.includes(o.key)).map((o) => <li key={o.key} className="rounded-lg bg-okbg p-2 font-semibold text-ok">✓ {o.key}. {o.text}</li>)}</ul>
                  <p><b>Giải thích:</b> {q.explanation}</p>
                  {q.confidence === "verify" && <p className="text-xs text-hint">⚠ Đáp án đang được đối chiếu với bài giảng.</p>}
                </div>
              )}
              <p className="text-xs text-mute">{flip ? "Nhấn để lật lại" : "Nhấn hoặc Space để lật xem đáp án"}</p>
            </button>
            {flip && (
              <div className="flex flex-wrap gap-2">
                {q.knowledgeIds.map((id) => <button key={id} className="chip cursor-pointer" onClick={() => openCard(id)}>📖 {knowledgeById.get(id)?.title}</button>)}
              </div>
            )}
            <div className="flex flex-wrap justify-between gap-2">
              <button className="btn" disabled={i === 0} onClick={() => { setI(i - 1); setFlip(false); }}>← Trước</button>
              <div className="flex gap-2">
                <button className="btn" onClick={() => rate(false)}>✗ Chưa nhớ</button>
                <button className="btn btn-primary" onClick={() => rate(true)}>✓ Đã nhớ</button>
              </div>
              <button className="btn" disabled={i === qs.length - 1} onClick={() => { setI(i + 1); setFlip(false); }}>Sau →</button>
            </div>
          </>
        )}
      </div>
      <SidePanel suggestions={q?.tags ?? []} />
    </div>
  );
}
