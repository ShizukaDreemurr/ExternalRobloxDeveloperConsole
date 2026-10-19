import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OptKey } from "../types";
import { gradeAnswer, formatClock, toTen, type Verdict } from "../lib/scoring";
import { markAnswer, type Attempt, type Progress } from "../lib/progress";
import type { ResultData, ResultRow, Session } from "../lib/session";
import QuestionCard, { LETTERS } from "./QuestionCard";
import HintLadder from "./HintLadder";
import StepTutor from "./StepTutor";
import SidePanel from "./SidePanel";
import ProgressBar from "./ProgressBar";

interface Props {
  session: Session;
  onProgress: (fn: (p: Progress) => Progress) => void;
  onFinish: (r: ResultData, a: Attempt) => void;
  onExit: () => void;
}

export default function SessionView({ session, onProgress, onFinish, onExit }: Props) {
  const { items, mode } = session;
  const exam = mode === "exam";
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<Record<string, OptKey[]>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [hints, setHints] = useState<Record<string, number>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const doneRef = useRef(false);

  const item = items[idx];
  const q = item.q;
  const pk = picked[q.id] ?? [];
  const isChecked = !!checked[q.id];
  const verdict: Verdict | undefined = isChecked ? gradeAnswer(q, pk) : undefined;
  const labelOf = useCallback((k: OptKey) => LETTERS[item.order.indexOf(k)], [item]);

  const finish = useCallback((timeUp = false) => {
    if (doneRef.current) return;
    doneRef.current = true;
    const sec = Math.round((Date.now() - startRef.current) / 1000);
    const rows: ResultRow[] = items.map((it) => {
      const p = picked[it.q.id] ?? [];
      return { q: it.q, order: it.order, picked: p, verdict: gradeAnswer(it.q, p), hints: hints[it.q.id] ?? 0 };
    });
    // thi thử: câu bỏ trống cũng coi là chưa nắm → vào hàng ôn
    if (exam) onProgress((prev) => rows.reduce((acc, r) => markAnswer(acc, r.q, r.verdict === "blank" ? "wrong" : r.verdict), prev));
    const correct = rows.filter((r) => r.verdict === "correct").length;
    const partial = rows.filter((r) => r.verdict === "partial").length;
    const topics: Attempt["topics"] = {};
    rows.forEach((r) => {
      const t = r.q.tags[0] ?? "Khác";
      topics[t] = topics[t] ?? { c: 0, t: 0 };
      topics[t].t += 1;
      if (r.verdict === "correct") topics[t].c += 1;
    });
    const score = toTen(correct, rows.length);
    const attempt: Attempt = { at: Date.now(), title: session.title, mode, correct, total: rows.length, score, sec, topics };
    onFinish({ session, rows, correct, partial, total: rows.length, score, sec, timeUp }, attempt);
  }, [items, picked, hints, exam, onProgress, onFinish, session, mode]);

  // đồng hồ thi thử
  useEffect(() => {
    if (!exam) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [exam]);
  const remaining = (session.durationSec ?? 0) - elapsed;
  useEffect(() => {
    if (exam && remaining <= 0) finish(true);
  }, [exam, remaining, finish]);

  const toggle = (k: OptKey) => {
    if (isChecked) return;
    setPicked((s) => {
      const cur = s[q.id] ?? [];
      const next = q.type === "single" ? [k] : cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k];
      return { ...s, [q.id]: next };
    });
  };

  const check = useCallback(() => {
    if (exam || checked[q.id]) return;
    setChecked((c) => ({ ...c, [q.id]: true }));
    onProgress((p) => markAnswer(p, q, gradeAnswer(q, picked[q.id] ?? [])));
  }, [exam, checked, q, picked, onProgress]);

  const go = useCallback((n: number) => setIdx(Math.min(items.length - 1, Math.max(0, n))), [items.length]);
  const last = idx === items.length - 1;
  const next = useCallback(() => { if (last) { if (!exam) finish(); } else go(idx + 1); }, [last, exam, finish, go, idx]);

  const revealHint = () => { if (!exam) setHints((h) => ({ ...h, [q.id]: Math.min(3, (h[q.id] ?? 0) + 1) })); };

  // phím tắt
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (["a", "b", "c", "d"].includes(key)) { const k = item.order[key.charCodeAt(0) - 97]; if (k) toggle(k); }
      else if (key === "enter") {
        if (t && t.tagName === "BUTTON" && !t.getAttribute("role")) return; // nút thường tự xử lý; nút phương án dùng Enter làm “kiểm tra/qua câu”
        e.preventDefault();
        if (!exam && !isChecked && pk.length > 0) check(); else if (exam || isChecked) next();
      }
      else if (key === "h") revealHint();
      else if (key === "t" && !exam) window.dispatchEvent(new Event("kb-tutor"));
      else if (key === "/") { e.preventDefault(); window.dispatchEvent(new Event("kb-focus")); }
      else if (key === "arrowleft") go(idx - 1);
      else if (key === "arrowright") go(idx + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const answered = items.filter((it) => (picked[it.q.id] ?? []).length > 0).length;
  const tutor = useMemo(() => exam ? undefined : (
    <StepTutor key={q.id} q={q} order={item.order} labelOf={labelOf}
      onApply={(keys) => { if (!isChecked) setPicked((s) => ({ ...s, [q.id]: keys })); }}
      onReveal={check} />
  ), [exam, q, item.order, labelOf, isChecked, check]);

  const confirmFinish = () => {
    const missing = items.length - answered;
    if (!exam || missing === 0 || window.confirm(`Còn ${missing} câu chưa trả lời. Vẫn nộp bài?`)) finish();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-3">
        <div className="card space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-bold">{session.title} <span className="chip ml-1">{exam ? "Thi thử" : mode === "wrong" ? "Ôn câu sai" : "Luyện tập"}</span></div>
            <div className="flex items-center gap-2">
              {exam && <span role="timer" aria-label="Thời gian còn lại" className={`rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums ${remaining < 60 ? "bg-badbg text-bad" : "bg-surface2"}`}>⏱ {formatClock(remaining)}</span>}
              <button className="btn !min-h-0 !py-1" onClick={() => { if (window.confirm("Thoát? Tiến độ của lượt này sẽ không được lưu.")) onExit(); }}>Thoát</button>
            </div>
          </div>
          <ProgressBar value={answered} max={items.length} label="Số câu đã trả lời" />
          <div className="flex flex-wrap gap-1" aria-label="Danh sách câu">
            {items.map((it, i) => {
              const v = checked[it.q.id] ? gradeAnswer(it.q, picked[it.q.id] ?? []) : undefined;
              const has = (picked[it.q.id] ?? []).length > 0;
              const st = v === "correct" ? "bg-okbg text-ok border-ok" : v ? "bg-badbg text-bad border-bad" : has ? "bg-surface2 border-brand" : "border-line";
              return (
                <button key={it.q.id} onClick={() => go(i)} aria-current={i === idx}
                  aria-label={`Câu ${i + 1}${flags[it.q.id] ? ", đã đánh dấu" : ""}${v ? (v === "correct" ? ", đúng" : ", sai") : has ? ", đã trả lời" : ""}`}
                  className={`relative grid h-8 w-8 place-items-center rounded-lg border text-xs font-bold ${st} ${i === idx ? "ring-2 ring-brand" : ""}`}>
                  {i + 1}{flags[it.q.id] && <span className="absolute -right-1 -top-1 text-[10px]">🚩</span>}
                </button>
              );
            })}
          </div>
        </div>

        <QuestionCard q={q} order={item.order} picked={pk} onToggle={toggle} reveal={isChecked} verdict={verdict} index={idx} total={items.length}
          flagged={!!flags[q.id]} onFlag={() => setFlags((f) => ({ ...f, [q.id]: !f[q.id] }))} hintsUsed={hints[q.id] ?? 0} showVerify />

        {!exam && !isChecked && (
          <HintLadder hints={q.hints} level={hints[q.id] ?? 0} onReveal={revealHint} />
        )}
        {exam && <p className="rounded-xl bg-surface2 p-2.5 text-xs text-mute">🔒 Thi thử: gợi ý và “Học từng bước” bị khóa. Đáp án chỉ hiện sau khi nộp bài.</p>}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button className="btn" onClick={() => go(idx - 1)} disabled={idx === 0}>← Câu trước</button>
          <div className="flex gap-2">
            {!exam && !isChecked && <button className="btn btn-primary" onClick={check} disabled={pk.length === 0}>Kiểm tra <kbd className="chip">Enter</kbd></button>}
            {!exam && !isChecked && <button className="btn" onClick={() => window.dispatchEvent(new Event("kb-tutor"))}>🧭 Học từng bước <kbd className="chip">T</kbd></button>}
            {(exam || isChecked) && !last && <button className="btn btn-primary" onClick={next}>Câu tiếp →</button>}
            {(exam ? true : isChecked && last) && <button className="btn btn-primary" onClick={confirmFinish}>{exam ? "Nộp bài" : "Xem kết quả"}</button>}
          </div>
        </div>
        <p className="text-xs text-mute">Phím tắt: A–D chọn · Enter kiểm tra/qua câu · H gợi ý · T học từng bước · / tra cứu · ←/→ chuyển câu</p>
      </div>

      <SidePanel tutor={tutor} suggestions={q.tags.slice(1).concat(q.tags[0])} locked={exam && !session.allowDocs}
        lockedReason="Thi thử đang tắt “cho phép tài liệu”. Bật công tắc này trước khi bắt đầu nếu muốn tra cứu." />
    </div>
  );
}
