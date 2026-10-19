interface Props { hints: [string, string, string]; level: number; onReveal: () => void; disabled?: boolean; disabledReason?: string }

const LABELS = ["Định hướng", "Khái niệm / công thức", "Loại trừ"];

export default function HintLadder({ hints, level, onReveal, disabled, disabledReason }: Props) {
  return (
    <section aria-label="Gợi ý theo bậc" className="space-y-2">
      {hints.slice(0, level).map((h, i) => (
        <div key={i} className="rounded-xl border border-line bg-hintbg p-3 text-sm text-ink">
          <span className="mr-1.5 rounded-md bg-surface px-1.5 py-0.5 text-xs font-bold text-hint">💡 Bậc {i + 1} · {LABELS[i]}</span>
          {h}
        </div>
      ))}
      <button className="btn" onClick={onReveal} disabled={disabled || level >= 3} title={disabled ? disabledReason : undefined}>
        💡 {disabled ? "Gợi ý bị khóa" : level >= 3 ? "Đã mở hết gợi ý" : `Gợi ý bậc ${level + 1} · ${LABELS[level]}`} <kbd className="chip">H</kbd>
      </button>
      {disabled && disabledReason && <p className="text-xs text-mute">{disabledReason}</p>}
    </section>
  );
}
