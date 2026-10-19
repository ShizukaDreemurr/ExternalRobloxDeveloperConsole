import { useMemo, useState } from "react";
import type { OptKey, Question } from "../types";
import { knowledgeById } from "../data/knowledge";
import { openCard } from "./KnowledgeCard";
import Calculator from "./Calculator";

const KEYWORDS = /(KHÔNG|chủ yếu|tối ưu nhất|phù hợp nhất|nghiêm trọng nhất|nhiều đáp án|cốt lõi)/g;

function Emphasis({ text }: { text: string }) {
  const parts = text.split(KEYWORDS);
  return <>{parts.map((p, i) => (i % 2 === 1 ? <mark key={i} className="kw">{p}</mark> : <span key={i}>{p}</span>))}</>;
}

interface Props {
  q: Question;
  order: OptKey[];
  labelOf: (k: OptKey) => string;
  onApply: (keys: OptKey[]) => void;
  onReveal: () => void;
}

/** 5 bước: đề hỏi gì → kiến thức nền → áp dụng → loại trừ → chốt. Không lộ đáp án cho tới bước 5. */
export default function StepTutor({ q, order, labelOf, onApply, onReveal }: Props) {
  const [step, setStep] = useState(0);
  const [tf, setTf] = useState<boolean | null>(null);
  const [marks, setMarks] = useState<Partial<Record<OptKey, "keep" | "drop">>>({});
  const cards = q.knowledgeIds.map((id) => knowledgeById.get(id)).filter(Boolean);
  const text = (k: OptKey) => q.options.find((o) => o.key === k)!.text;

  // câu hỏi Đúng/Sai phụ, chọn xác định theo id
  const probe = useMemo(() => {
    const seed = [...q.id].reduce((a, c) => a + c.charCodeAt(0), 0);
    const key = order[seed % order.length];
    return { key, truth: q.answer.includes(key) };
  }, [q.id, q.answer, order]);

  const steps = ["Đề hỏi gì?", "Kiến thức nền", "Áp dụng", "Loại trừ", "Chốt"];
  const allMarked = order.every((k) => marks[k]);
  const chosen = order.filter((k) => marks[k] === "keep");

  return (
    <div className="space-y-3" aria-label="Học từng bước">
      <ol className="flex flex-wrap gap-1" aria-label="Các bước">
        {steps.map((s, i) => (
          <li key={s}>
            <button onClick={() => setStep(i)} aria-current={i === step}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${i === step ? "bg-brand text-brandfg" : i < step ? "bg-okbg text-ok" : "bg-surface2 text-mute"}`}>
              {i + 1}. {s}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Hãy đọc kỹ đề — các từ khóa dễ bẫy được gạch dưới:</p>
          <p className="rounded-xl bg-surface2 p-3"><Emphasis text={q.prompt} /></p>
          <p className="text-mute">Dạng câu: <b>{q.type === "multi" ? "Nhiều đáp án — phải chọn đủ và không thừa." : "Một đáp án."}</b> Thuộc: <b>Bài {q.quiz}</b> · chủ đề <b>{q.tags[0]}</b>.</p>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Kiến thức cần nhớ cho câu này:</p>
          {cards.map((c) => c && (
            <div key={c.id} className="rounded-xl border border-line p-3">
              <div className="flex items-center justify-between gap-2"><b>{c.title}</b><span className="chip shrink-0">{c.source}</span></div>
              <p className="mt-1 text-mute">{c.summary}</p>
              {c.formula && <p className="mt-1"><span className="chip mr-1">Công thức</span><code className="font-semibold">{c.formula}</code></p>}
              <button className="btn mt-2" onClick={() => openCard(c.id)}>Xem thẻ đầy đủ</button>
            </div>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3 text-sm">
          {q.calc && <Calculator id={q.calc} />}
          <div className="rounded-xl border border-line p-3">
            <p className="font-semibold">Câu phụ Đúng/Sai</p>
            <p className="my-1.5">Với câu hỏi này, phương án “<b>{text(probe.key)}</b>” là một đáp án đúng.</p>
            <div className="flex gap-2">
              <button className="btn" onClick={() => setTf(true)}>Đúng</button>
              <button className="btn" onClick={() => setTf(false)}>Sai</button>
            </div>
            {tf !== null && (
              <p role="status" className={`mt-2 rounded-lg p-2 ${tf === probe.truth ? "bg-okbg text-ok" : "bg-badbg text-bad"}`}>
                {tf === probe.truth ? "✓ Chính xác. " : "✗ Chưa đúng. "}{q.notes[q.options.findIndex((o) => o.key === probe.key)]}
              </p>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Đánh dấu từng phương án: Giữ hay Loại?</p>
          {order.map((k) => {
            const m = marks[k];
            const truth = q.answer.includes(k);
            const ok = m && (m === "keep") === truth;
            return (
              <div key={k} className="rounded-xl border border-line p-2.5">
                <div className="flex items-start gap-2"><b className="w-5 shrink-0">{labelOf(k)}.</b><span className="flex-1">{text(k)}</span></div>
                <div className="mt-1.5 flex gap-1.5">
                  <button className={`btn ${m === "keep" ? "btn-primary" : ""}`} onClick={() => setMarks({ ...marks, [k]: "keep" })}>Giữ</button>
                  <button className={`btn ${m === "drop" ? "btn-primary" : ""}`} onClick={() => setMarks({ ...marks, [k]: "drop" })}>Loại</button>
                </div>
                {m && (
                  <p role="status" className={`mt-1.5 rounded-lg p-2 ${ok ? "bg-okbg text-ok" : "bg-badbg text-bad"}`}>
                    {ok ? "✓ Hợp lý. " : "✗ Xem lại. "}{q.notes[q.options.findIndex((o) => o.key === k)]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Chốt đáp án</p>
          {allMarked ? (
            <p>Bạn đang giữ: <b>{chosen.length ? chosen.map(labelOf).join(", ") : "(chưa giữ phương án nào)"}</b></p>
          ) : <p className="text-mute">Quay lại bước 4 để đánh dấu đủ các phương án, hoặc tự chọn trực tiếp ở câu hỏi.</p>}
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" disabled={!allMarked || chosen.length === 0} onClick={() => onApply(chosen)}>Dùng lựa chọn này cho câu hỏi</button>
            <button className="btn" onClick={onReveal}>Xem đáp án</button>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-1">
        <button className="btn" disabled={step === 0} onClick={() => setStep(step - 1)}>← Quay lại</button>
        <button className="btn btn-primary" disabled={step === steps.length - 1} onClick={() => setStep(step + 1)}>Tiếp →</button>
      </div>
    </div>
  );
}
