import type { KnowledgeCard as Card } from "../types";
import { knowledgeById } from "../data/knowledge";
import Md from "./Md";

export function openCard(id: string) {
  window.dispatchEvent(new CustomEvent("kb-open", { detail: { id } }));
}

export default function KnowledgeCardView({ card, onOpen, onClose }: { card: Card; onOpen: (id: string) => void; onClose?: () => void }) {
  const related = card.related.map((id) => knowledgeById.get(id)).filter(Boolean) as Card[];
  return (
    <article className="space-y-2" aria-label={`Thẻ kiến thức: ${card.title}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap gap-1.5"><span className="chip">Bài {card.lesson}</span><span className="chip">📖 {card.source}</span></div>
          <h3 className="mt-1.5 text-base font-bold leading-snug">{card.title}</h3>
        </div>
        {onClose && <button className="btn px-2.5" onClick={onClose} aria-label="Đóng thẻ">✕</button>}
      </div>
      <p className="rounded-xl bg-surface2 p-2.5 text-sm font-medium">{card.summary}</p>
      <Md text={card.body} />
      {card.formula && (
        <div className="rounded-xl border border-line p-2.5 text-sm"><span className="chip mr-1.5">Công thức</span><code className="font-semibold">{card.formula}</code></div>
      )}
      {card.example && <div className="rounded-xl border border-dashed border-line p-2.5 text-sm"><span className="chip mr-1.5">Ví dụ</span>{card.example}</div>}
      {related.length > 0 && (
        <div className="pt-1">
          <div className="mb-1 text-xs font-semibold text-mute">Thẻ liên quan</div>
          <div className="flex flex-wrap gap-1.5">
            {related.map((r) => <button key={r.id} className="chip cursor-pointer hover:bg-surface" onClick={() => onOpen(r.id)}>{r.title}</button>)}
          </div>
        </div>
      )}
    </article>
  );
}
