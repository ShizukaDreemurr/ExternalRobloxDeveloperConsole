import { useCallback, useEffect, useRef, useState } from "react";
import { addAttempt, clearProgress, emptyProgress, loadProgress, saveProgress, type Attempt, type Progress } from "./lib/progress";
import { EXAM_SECONDS, makeItems, type ResultData, type Session } from "./lib/session";
import { safeGet, safeSet } from "./lib/storage";
import type { Question } from "./types";
import Home, { type StartSpec } from "./components/Home";
import SessionView from "./components/SessionView";
import ResultView from "./components/ResultView";
import Flashcards from "./components/Flashcards";

type Screen =
  | { kind: "home" }
  | { kind: "session"; session: Session; spec: StartSpec; run: number }
  | { kind: "result"; result: ResultData; spec: StartSpec }
  | { kind: "flash"; title: string; qs: Question[] };

export default function App() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [screen, setScreen] = useState<Screen>({ kind: "home" });
  const [theme, setTheme] = useState<"light" | "dark" | null>(() => {
    const t = safeGet("bus1052.theme");
    return t === "light" || t === "dark" ? t : null;
  });
  const ready = useRef(false);

  useEffect(() => { if (ready.current) saveProgress(progress); ready.current = true; }, [progress]);
  useEffect(() => {
    const el = document.documentElement;
    if (theme) el.setAttribute("data-theme", theme); else el.removeAttribute("data-theme");
  }, [theme]);

  const onProgress = useCallback((fn: (p: Progress) => Progress) => setProgress((p) => fn(p)), []);
  const isDark = theme ? theme === "dark" : typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
  const toggleTheme = () => { const n = isDark ? "light" : "dark"; setTheme(n); safeSet("bus1052.theme", n); };

  const start = (spec: StartSpec) => {
    if (spec.qs.length === 0) return;
    if (spec.mode === "flash") { setScreen({ kind: "flash", title: spec.title, qs: spec.shuffleQ ? [...spec.qs].sort(() => Math.random() - 0.5) : spec.qs }); return; }
    const items = makeItems(spec.qs, spec.shuffleQ, spec.shuffleO);
    const session: Session = {
      title: spec.title, mode: spec.mode, items, allowDocs: spec.allowDocs, lesson: spec.lesson,
      durationSec: spec.mode === "exam" ? Math.max(EXAM_SECONDS, items.length * 60) : undefined,
    };
    setScreen((s) => ({ kind: "session", session, spec, run: s.kind === "session" ? s.run + 1 : 1 }));
  };

  const onFinish = (result: ResultData, attempt: Attempt, spec: StartSpec) => {
    setProgress((p) => addAttempt(p, attempt, spec.lesson));
    setScreen({ kind: "result", result, spec });
  };

  const home = () => setScreen({ kind: "home" });

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 pb-24 pt-3">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <button onClick={() => { if (screen.kind === "home" || window.confirm("Về trang chủ? Lượt đang làm sẽ không được lưu.")) home(); }} className="text-left" aria-label="Về trang chủ">
          <h1 className="text-lg font-extrabold leading-tight sm:text-xl">Ôn Quiz 06 → 11 · BUS1052</h1>
          <p className="text-xs text-mute">Nhập môn Quản trị kinh doanh · FPT Polytechnic · 90 câu · tra cứu ngay khi làm bài</p>
        </button>
        <button className="btn" onClick={toggleTheme} aria-label="Đổi giao diện sáng/tối">{isDark ? "☀ Sáng" : "☾ Tối"}</button>
      </header>

      <main>
        {screen.kind === "home" && <Home progress={progress} onStart={start} onClear={() => { clearProgress(); setProgress(emptyProgress()); }} />}
        {screen.kind === "session" && (
          <SessionView key={screen.run} session={screen.session} onProgress={onProgress} onExit={home}
            onFinish={(r, a) => onFinish(r, a, screen.spec)} />
        )}
        {screen.kind === "result" && (
          <ResultView result={screen.result} onHome={home} onRetry={() => start(screen.spec)}
            onReviewWrong={() => start({
              ...screen.spec, mode: "wrong", title: `${screen.result.session.title} · câu chưa đúng`,
              qs: screen.result.rows.filter((r) => r.verdict !== "correct").map((r) => r.q), allowDocs: false,
            })} />
        )}
        {screen.kind === "flash" && <Flashcards title={screen.title} qs={screen.qs} onProgress={onProgress} onExit={home} />}
      </main>
    </div>
  );
}
