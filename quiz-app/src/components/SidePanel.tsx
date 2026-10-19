import { useEffect, useState, type ReactNode } from "react";
import KnowledgeSearch from "./KnowledgeSearch";
import KnowledgeCardView from "./KnowledgeCard";
import { knowledgeById } from "../data/knowledge";

interface Props {
  tutor?: ReactNode;           // nội dung "Học từng bước" (chỉ có khi đang luyện tập)
  suggestions?: string[];
  locked?: boolean;
  lockedReason?: string;
}

/** Cột phải (desktop) / bottom sheet (mobile): ô tra cứu luôn hiện + thẻ kiến thức + tutor. Trạng thái nằm ở đây nên mở thẻ không làm mất câu đang làm. */
export default function SidePanel({ tutor, suggestions = [], locked = false, lockedReason }: Props) {
  const [query, setQuery] = useState("");
  const [lesson, setLesson] = useState<number | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [tab, setTab] = useState<"search" | "tutor">("search");
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    const open = (e: Event) => {
      const id = (e as CustomEvent).detail?.id as string;
      if (id && !locked) { setCardId(id); setTab("search"); setSheet(true); }
    };
    const focus = () => { setSheet(true); setTimeout(() => document.getElementById("kb-search")?.focus(), 30); };
    const showTutor = () => { if (tutor) { setTab("tutor"); setSheet(true); } };
    window.addEventListener("kb-open", open);
    window.addEventListener("kb-focus", focus);
    window.addEventListener("kb-tutor", showTutor);
    return () => { window.removeEventListener("kb-open", open); window.removeEventListener("kb-focus", focus); window.removeEventListener("kb-tutor", showTutor); };
  }, [locked, tutor]);

  const card = cardId ? knowledgeById.get(cardId) : null;
  const tabBtn = (id: "search" | "tutor", label: string) => (
    <button role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
      className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === id ? "bg-brand text-brandfg" : "text-mute hover:bg-surface2"}`}>{label}</button>
  );

  return (
    <>
      <button className="btn btn-primary fixed bottom-4 right-4 z-30 shadow-lg lg:hidden" onClick={() => setSheet(true)} aria-label="Mở tra cứu kiến thức">🔎 Tra cứu{tutor ? " / Học" : ""}</button>
      {sheet && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSheet(false)} aria-hidden />}
      <aside
        aria-label="Tra cứu kiến thức"
        className={`fixed inset-x-0 bottom-0 z-40 max-h-[82vh] overflow-y-auto rounded-t-2xl border border-line bg-bg p-4 shadow-2xl transition-transform
          ${sheet ? "translate-y-0" : "translate-y-[110%]"} lg:static lg:z-auto lg:max-h-none lg:translate-y-0 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
      >
        <div className="card space-y-3 lg:sticky lg:top-3 lg:max-h-[calc(100vh-1.5rem)] lg:overflow-y-auto">
          <div className="flex items-center justify-between lg:hidden">
            <span className="text-sm font-bold">Tra cứu & học</span>
            <button className="btn px-2.5" onClick={() => setSheet(false)} aria-label="Đóng">✕</button>
          </div>
          <KnowledgeSearch
            query={query} setQuery={(s) => { setQuery(s); setTab("search"); setCardId(null); }} lesson={lesson} setLesson={setLesson}
            suggestions={suggestions} locked={locked} lockedReason={lockedReason} onOpen={(id) => { setCardId(id); setTab("search"); }}
          />
          {tutor && <div role="tablist" className="flex gap-1 rounded-xl bg-surface2 p-1">{tabBtn("search", "📚 Thẻ kiến thức")}{tabBtn("tutor", "🧭 Học từng bước")}</div>}
          {tab === "tutor" && tutor ? tutor : card && !locked ? (
            <KnowledgeCardView card={card} onOpen={setCardId} onClose={() => setCardId(null)} />
          ) : !locked && query.trim().length < 2 ? (
            <p className="text-xs text-mute">Gõ từ khóa (có dấu hoặc không dấu) để xem thẻ kiến thức mà không rời câu hỏi. Phím tắt: <kbd className="chip">/</kbd></p>
          ) : null}
        </div>
      </aside>
    </>
  );
}
