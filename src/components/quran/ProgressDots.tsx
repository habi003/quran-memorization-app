interface ProgressDotsProps {
  total: number
  filled: number
  // When provided, dots become tappable (used by SurahReview to let a kid
  // jump straight to a given ayah) — other callers (daily-target dots,
  // repeat-step counter) omit this and stay purely decorative.
  onSelect?: (index: number) => void
}

export function ProgressDots({ total, filled, onSelect }: ProgressDotsProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const isFilled = i < filled
        const isActive = i === filled
        const dotClassName = `h-2.5 w-2.5 rounded-full transition-all duration-300 ${
          isFilled
            ? 'scale-110 bg-gradient-to-br from-emerald-500 to-emerald-600'
            : isActive
              ? 'bg-slate-300 ring-2 ring-emerald-300 ring-offset-1'
              : 'bg-slate-200'
        }`

        if (!onSelect) return <span key={i} className={dotClassName} />

        return (
          <button
            key={i}
            type="button"
            aria-label={`Start from ayah ${i + 1}`}
            onClick={() => onSelect(i)}
            className="flex h-6 w-6 items-center justify-center rounded-full transition active:scale-90"
          >
            <span className={dotClassName} />
          </button>
        )
      })}
    </div>
  )
}
