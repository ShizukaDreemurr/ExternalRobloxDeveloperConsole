import type { OptKey, Question } from "../types";
import type { Verdict } from "../lib/scoring";

interface Props {
  q: Question;
  order: OptKey[];
  picked: OptKey[];
  onToggle: (k: OptKey) => void;
  /** hiện đáp án + giải thích từng phương án */
  reveal: boolean;
  verdict?: Verdict;
  index: number;
  total: number;
  flagged: boolean;
  onFlag: () => void;
  hintsUsed: number;
  showVerify?: boolean;
}

export const LETTERS = ["A", "B", "C", "D"] as const;

const VERDICT_TXT: Record<Verdict, { icon: string; text: string; cls: string }> = {
  correct: { icon: "✓", text: "Chính xác!", cls: "bg-okbg text-ok" },
  partial: { icon: "◐", text: "Đúng một phần — bạn chọn chưa đủ đáp án.", cls: "bg-hintbg text-hint" },
  wrong: { icon: "✗", text: "Chưa đúng.", cls: "bg-badbg text-bad" },
  blank: { icon: "–", text: "Chưa trả lời.", cls: "bg-surface2 text-mute" },
};

export default function QuestionCard({ q, order, picked, onToggle, reveal, verdict, index, total, flagged, onFlag, hintsUsed, showVerify }: Props) {
  const multi = q.type === "multi";
  const optIdx = (k: OptKey) => q.options.findIndex((o) => o.key === k);
  return (
    <section className="card space-y-3" aria-labelledby="q-prompt">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="chip">Quiz {String(q.quiz).padStart(2, "0")} · Câu {q.number}</span>
          <span className={`chip ${multi ? "!border-brand !text-brand" : ""}`}>{multi ? "☑ Nhiều đáp án" : "◉ 1 đáp án"}</span>
        </div>
        <button className="btn !min-h-0 !px-2.5 !py-1 text-xs" onClick={onFlag} aria-pressed={flagged}>{flagged ? "🚩 Đã đánh dấu" : "⚑ Đánh dấu xem lại"}</button>
      </div>
      <h2 id="q-prompt" className="text-base font-bold leading-snug sm:text-lg">
        <span className="mr-1 text-mute">{index + 1}/{total}.</span>{q.prompt}
      </h2>
      <div role={multi ? "group" : "radiogroup"} aria-label={multi ? "Chọn một hoặc nhiều đáp án" : "Chọn một đáp án"} className="space-y-2">
        {order.map((k, pos) => {
          const opt = q.options[optIdx(k)];
          const isPicked = picked.includes(k);
          const isRight = q.answer.includes(k);
          let cls = "border-line bg-surface hover:bg-surface2";
          let mark: string | null = null;
          if (reveal) {
            if (isRight) { cls = "border-ok bg-okbg"; mark = isPicked ? "✓ Bạn chọn đúng" : "✓ Đáp án đúng"; }
            else if (isPicked) { cls = "border-bad bg-badbg"; mark = "✗ Bạn chọn sai"; }
            else cls = "border-line bg-surface";
          } else if (isPicked) cls = "border-brand bg-surface2 ring-2 ring-brand";
          return (
            <div key={k}>
              <button
                role={multi ? "checkbox" : "radio"} aria-checked={isPicked}
                onClick={() => !reveal && onToggle(k)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition ${cls} ${reveal ? "cursor-default" : ""}`}
              >
                <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center border text-xs font-bold ${multi ? "rounded-md" : "rounded-full"} ${isPicked ? "border-brand bg-brand text-brandfg" : "border-line text-mute"}`}>
                  {LETTERS[pos]}
                </span>
                <span className="flex-1">{opt.text}</span>
                {mark && <span className="shrink-0 text-xs font-bold">{mark}</span>}
              </button>
              {reveal && (
                <p className={`ml-9 mt-1 text-xs ${isRight ? "text-ok" : "text-mute"}`}>
                  {isRight ? "✓ " : "✗ "}{q.notes[optIdx(k)]}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div aria-live="polite" className="min-h-0">
        {reveal && verdict && (
          <div className="space-y-2">
            <div className={`rounded-xl p-3 text-sm font-semibold ${VERDICT_TXT[verdict].cls}`}>
              {VERDICT_TXT[verdict].icon} {VERDICT_TXT[verdict].text}
              {verdict === "correct" && <span className="ml-1 font-normal">{hintsUsed > 0 ? `(đúng có gợi ý · ${hintsUsed} bậc)` : "(đúng, không dùng gợi ý)"}</span>}
            </div>
            <div className="rounded-xl bg-surface2 p-3 text-sm"><b>Giải thích:</b> {q.explanation}</div>
            {showVerify && q.confidence === "verify" && (
              <p className="text-xs text-hint">⚠ Đáp án đang được đối chiếu với bài giảng — hãy tự kiểm tra lại bằng thẻ kiến thức liên kết.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
