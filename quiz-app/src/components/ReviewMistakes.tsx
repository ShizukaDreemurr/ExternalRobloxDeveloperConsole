import { questions } from "../data/questions";
import type { Progress } from "../lib/progress";

export default function ReviewMistakes({ progress, onStart }: { progress: Progress; onStart: () => void }) {
  const list = questions.filter((q) => q.id in progress.wrong);
  if (list.length === 0) return null;
  return (
    <section className="card space-y-2" aria-label="Câu sai chờ ôn">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">Câu sai chờ ôn ({list.length})</h2>
        <button className="btn btn-primary !min-h-0 !py-1" onClick={onStart}>Ôn ngay</button>
      </div>
      <p className="text-xs text-mute">Trả lời đúng 2 lần liên tiếp thì câu rời khỏi hàng.</p>
      <ul className="max-h-44 space-y-1 overflow-y-auto text-sm">
        {list.slice(0, 30).map((q) => (
          <li key={q.id} className="flex items-start gap-2">
            <span className="chip shrink-0">Q{q.quiz}.{q.number}</span>
            <span className="flex-1 truncate" title={q.prompt}>{q.prompt}</span>
            <span className="shrink-0 text-xs text-mute">{progress.wrong[q.id]}/2</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
