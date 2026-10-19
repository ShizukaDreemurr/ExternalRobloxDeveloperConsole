import { useState } from "react";
import { questions } from "../data/questions";
import type { LessonId, Question } from "../types";
import type { Progress } from "../lib/progress";
import { formatClock } from "../lib/scoring";
import { shuffle } from "../lib/shuffle";
import QuizPicker from "./QuizPicker";
import ReviewMistakes from "./ReviewMistakes";
import SidePanel from "./SidePanel";

export type StartMode = "practice" | "exam" | "wrong" | "flash";
export interface StartSpec {
  mode: StartMode; title: string; qs: Question[]; lesson?: LessonId;
  shuffleQ: boolean; shuffleO: boolean; allowDocs: boolean;
}

const MODES: { id: StartMode; label: string; desc: string }[] = [
  { id: "practice", label: "Luyện tập", desc: "Gợi ý 3 bậc, học từng bước, tra cứu; phản hồi ngay sau mỗi câu." },
  { id: "exam", label: "Thi thử", desc: "Khóa gợi ý & tutor, đồng hồ 1 phút/câu, chấm khi nộp bài." },
  { id: "wrong", label: "Ôn câu sai", desc: "Chỉ các câu từng làm sai; đúng 2 lần liên tiếp thì rời hàng." },
  { id: "flash", label: "Flashcard", desc: "Mặt trước là câu hỏi, mặt sau là đáp án + giải thích." },
];

interface Props { progress: Progress; onStart: (s: StartSpec) => void; onClear: () => void }

export default function Home({ progress, onStart, onClear }: Props) {
  const [mode, setMode] = useState<StartMode>("practice");
  const [shuffleQ, setShuffleQ] = useState(false);
  const [shuffleO, setShuffleO] = useState(false);
  const [allowDocs, setAllowDocs] = useState(false);
  const [mixN, setMixN] = useState(20);

  const pool = (lesson?: LessonId) => questions.filter((q) => (lesson == null || q.quiz === lesson) && (mode !== "wrong" || q.id in progress.wrong));
  const common = { shuffleQ, shuffleO, allowDocs };
  const startLesson = (l: LessonId) => onStart({ mode, title: `Quiz ${String(l).padStart(2, "0")}`, qs: pool(l), lesson: l, ...common });
  const mixPool = pool();
  const mixCount = Math.min(mixN, mixPool.length);
  const startMix = () => onStart({ mode, title: `Trộn tất cả (${mixCount} câu)`, qs: shuffle(mixPool).slice(0, mixCount), ...common, shuffleQ: true });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <section className="card space-y-3">
          <h2 className="text-sm font-bold">1. Chọn chế độ</h2>
          <div role="radiogroup" aria-label="Chế độ" className="grid gap-2 sm:grid-cols-2">
            {MODES.map((m) => (
              <button key={m.id} role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)}
                className={`rounded-xl border p-3 text-left text-sm transition ${mode === m.id ? "border-brand bg-surface2 ring-2 ring-brand" : "border-line hover:bg-surface2"}`}>
                <div className="font-bold">{m.label}</div><div className="text-xs text-mute">{m.desc}</div>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={shuffleQ} onChange={(e) => setShuffleQ(e.target.checked)} /> Xáo thứ tự câu</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={shuffleO} onChange={(e) => setShuffleO(e.target.checked)} /> Xáo phương án</label>
            {mode === "exam" && <label className="flex items-center gap-2"><input type="checkbox" checked={allowDocs} onChange={(e) => setAllowDocs(e.target.checked)} /> Cho phép tài liệu (tra cứu) khi thi</label>}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold">2. Chọn quiz</h2>
          <QuizPicker progress={progress} onPick={startLesson} wrongMode={mode === "wrong"} />
        </section>

        <section className="card flex flex-wrap items-end gap-3">
          <div>
            <h2 className="text-sm font-bold">Trộn tất cả 6 quiz</h2>
            <p className="text-xs text-mute">Lấy ngẫu nhiên N câu từ {mode === "wrong" ? "hàng câu sai" : "90 câu"}.</p>
          </div>
          <label className="text-xs text-mute">Số câu
            <input type="number" min={5} max={90} value={mixN} onChange={(e) => setMixN(Math.max(5, Math.min(90, Number(e.target.value) || 5)))}
              className="ml-2 w-20 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink" />
          </label>
          <button className="btn btn-primary" disabled={mixPool.length === 0} onClick={startMix}>Bắt đầu trộn ({mixCount})</button>
        </section>

        <ReviewMistakes progress={progress} onStart={() => { setMode("wrong"); onStart({ mode: "wrong", title: "Ôn câu sai", qs: questions.filter((q) => q.id in progress.wrong), ...common }); }} />

        <section className="card space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Lịch sử (20 lần gần nhất)</h2>
            <button className="btn !min-h-0 !py-1 text-xs" onClick={() => { if (window.confirm("Xóa toàn bộ tiến độ, điểm và hàng câu sai?")) onClear(); }}>Xóa tiến độ</button>
          </div>
          {progress.attempts.length === 0 ? <p className="text-sm text-mute">Chưa có lượt làm bài nào.</p> : (
            <ul className="space-y-1 text-sm">
              {progress.attempts.map((a) => (
                <li key={a.at} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface2 px-2.5 py-1.5">
                  <span>{a.title} <span className="chip ml-1">{a.mode === "exam" ? "Thi thử" : a.mode === "wrong" ? "Ôn sai" : "Luyện tập"}</span></span>
                  <span className="text-mute">{new Date(a.at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {a.correct}/{a.total} · {formatClock(a.sec)} · <b className="text-ink">{a.score}/10</b></span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <SidePanel />
    </div>
  );
}
