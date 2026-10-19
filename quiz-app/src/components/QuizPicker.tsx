import { LESSONS, questions } from "../data/questions";
import type { LessonId } from "../types";
import type { Progress } from "../lib/progress";
import ProgressBar from "./ProgressBar";

export default function QuizPicker({ progress, onPick, wrongMode }: { progress: Progress; onPick: (l: LessonId) => void; wrongMode: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="list">
      {LESSONS.map((l) => {
        const qs = questions.filter((q) => q.quiz === l.id);
        const seen = (progress.seen[String(l.id)] ?? []).length;
        const wrong = qs.filter((q) => q.id in progress.wrong).length;
        const best = progress.best[String(l.id)];
        const disabled = wrongMode && wrong === 0;
        return (
          <button key={l.id} role="listitem" disabled={disabled} onClick={() => onPick(l.id)}
            className="card space-y-2 text-left transition hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-50">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-mute">Quiz {String(l.id).padStart(2, "0")} · Bài {l.id}</div>
                <div className="font-bold leading-snug">{l.title}</div>
              </div>
              <span className="chip shrink-0">{qs.length} câu</span>
            </div>
            <ProgressBar value={seen} max={qs.length} label={`Đã làm ${seen} trên ${qs.length} câu của Quiz ${l.id}`} />
            <div className="flex flex-wrap gap-1.5 text-xs text-mute">
              <span>Đã làm {Math.round((seen / qs.length) * 100)}%</span>
              <span>· Điểm cao nhất: <b className="text-ink">{best != null ? `${best}/10` : "—"}</b></span>
              <span className={wrong ? "font-semibold text-bad" : ""}>· Chờ ôn: {wrong} câu</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
