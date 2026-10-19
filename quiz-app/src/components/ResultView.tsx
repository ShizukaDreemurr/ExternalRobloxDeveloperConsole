import { useMemo, useState } from "react";
import type { ResultData } from "../lib/session";
import { formatClock } from "../lib/scoring";
import { LETTERS } from "./QuestionCard";
import { knowledgeById } from "../data/knowledge";
import { openCard } from "./KnowledgeCard";
import SidePanel from "./SidePanel";

interface Props { result: ResultData; onRetry: () => void; onReviewWrong: () => void; onHome: () => void }

export default function ResultView({ result, onRetry, onReviewWrong, onHome }: Props) {
  const { rows, correct, partial, total, score, sec, session } = result;
  const [filter, setFilter] = useState<"all" | "bad">("all");
  const topics = useMemo(() => {
    const m = new Map<string, { c: number; t: number }>();
    rows.forEach((r) => { const t = r.q.tags[0] ?? "Khác"; const e = m.get(t) ?? { c: 0, t: 0 }; e.t++; if (r.verdict === "correct") e.c++; m.set(t, e); });
    return [...m.entries()].map(([name, v]) => ({ name, ...v, pct: v.c / v.t })).sort((a, b) => a.pct - b.pct || b.t - a.t);
  }, [rows]);
  const weak = topics.filter((t) => t.pct < 0.7);
  const bad = rows.filter((r) => r.verdict !== "correct");
  const shown = filter === "bad" ? bad : rows;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <section className="card text-center" aria-live="polite">
          <p className="text-sm text-mute">{session.title} · {session.mode === "exam" ? "Thi thử" : "Luyện tập"}{result.timeUp ? " · hết giờ" : ""}</p>
          <p className="my-1 text-5xl font-extrabold tabular-nums">{score.toFixed(2).replace(/\.?0+$/, "")}<span className="text-2xl text-mute">/10</span></p>
          <p className="text-sm">Đúng <b>{correct}</b>/{total} câu{partial > 0 && <> · đúng một phần <b>{partial}</b></>} · thời gian <b>{formatClock(sec)}</b></p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button className="btn btn-primary" onClick={onRetry}>↻ Làm lại</button>
            {bad.length > 0 && <button className="btn" onClick={onReviewWrong}>Ôn {bad.length} câu chưa đúng</button>}
            <button className="btn" onClick={onHome}>⌂ Trang chủ</button>
          </div>
        </section>

        <section className="card">
          <h2 className="mb-2 text-sm font-bold">Phân tích theo chủ đề</h2>
          <ul className="space-y-1.5">
            {topics.map((t) => (
              <li key={t.name} className="flex items-center gap-2 text-sm">
                <span className="w-44 shrink-0 truncate" title={t.name}>{t.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface2"><div className={`h-full ${t.pct >= 0.7 ? "bg-ok" : "bg-bad"}`} style={{ width: `${t.pct * 100}%` }} /></div>
                <span className="w-12 shrink-0 text-right tabular-nums text-mute">{t.c}/{t.t}</span>
              </li>
            ))}
          </ul>
          {weak.length > 0 ? <p className="mt-2 rounded-xl bg-badbg p-2.5 text-sm text-bad">⚠ Chủ đề yếu cần ôn: <b>{weak.map((w) => w.name).join(" · ")}</b></p>
            : <p className="mt-2 rounded-xl bg-okbg p-2.5 text-sm text-ok">✓ Không có chủ đề nào dưới 70%.</p>}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Chi tiết từng câu</h2>
            <div className="flex gap-1">
              <button className={`btn !min-h-0 !py-1 ${filter === "all" ? "btn-primary" : ""}`} onClick={() => setFilter("all")}>Tất cả</button>
              <button className={`btn !min-h-0 !py-1 ${filter === "bad" ? "btn-primary" : ""}`} onClick={() => setFilter("bad")}>Chưa đúng ({bad.length})</button>
            </div>
          </div>
          {shown.map((r) => {
            const lab = (keys: string[]) => (keys.length ? r.order.filter((k) => keys.includes(k)).map((k) => LETTERS[r.order.indexOf(k)]).join(", ") : "(bỏ trống)");
            const ok = r.verdict === "correct";
            return (
              <article key={r.q.id} className="card space-y-1.5 text-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`chip ${ok ? "!border-ok !text-ok" : "!border-bad !text-bad"}`}>{ok ? "✓ Đúng" : r.verdict === "partial" ? "◐ Một phần" : r.verdict === "blank" ? "– Bỏ trống" : "✗ Sai"}</span>
                  <span className="chip">Quiz {r.q.quiz} · Câu {r.q.number}</span>
                  {r.q.type === "multi" && <span className="chip">Nhiều đáp án</span>}
                  {r.hints > 0 && <span className="chip">💡 {r.hints} gợi ý</span>}
                  {r.q.confidence === "verify" && <span className="chip !border-hint !text-hint" title="Đáp án đang được đối chiếu với bài giảng">⚠ đáp án đang đối chiếu</span>}
                </div>
                <p className="font-semibold">{r.q.prompt}</p>
                <p>Bạn chọn: <b>{lab(r.picked)}</b> · Đáp án đúng: <b className="text-ok">{lab(r.q.answer)}</b></p>
                <ul className="space-y-0.5 text-xs">
                  {r.order.map((k) => {
                    const o = r.q.options.find((x) => x.key === k)!;
                    const right = r.q.answer.includes(k);
                    return <li key={k} className={right ? "text-ok" : "text-mute"}>{right ? "✓" : "✗"} <b>{LETTERS[r.order.indexOf(k)]}.</b> {o.text} — {r.q.notes[r.q.options.indexOf(o)]}</li>;
                  })}
                </ul>
                <p className="rounded-xl bg-surface2 p-2.5"><b>Giải thích:</b> {r.q.explanation}</p>
                <div className="flex flex-wrap gap-1.5">
                  {r.q.knowledgeIds.map((id) => <button key={id} className="chip cursor-pointer hover:bg-surface" onClick={() => openCard(id)}>📖 {knowledgeById.get(id)?.title}</button>)}
                </div>
              </article>
            );
          })}
        </section>
      </div>
      <SidePanel />
    </div>
  );
}
