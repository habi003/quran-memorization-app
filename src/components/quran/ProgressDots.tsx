import { useEffect, useRef } from 'react'

interface ProgressDotsProps {
  total: number
  filled: number
  // When provided, dots become tappable (used by SurahReview to let a kid
  // jump straight to a given ayah) — other callers (daily-target dots,
  // repeat-step counter) omit this and stay purely decorative.
  onSelect?: (index: number) => void
}

// Scrolls horizontally instead of wrapping/overflowing once there are more
// dots than fit — a long surah's memorized-ayah count can run into the
// hundreds, which would otherwise spill the row past its card. The active
// dot auto-scrolls into view on every change so it's always reachable
// without the kid having to hunt for it.
export function ProgressDots({ total, filled, onSelect }: ProgressDotsProps) {
  const activeRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [filled])

  return (
    <div className="no-scrollbar flex max-w-full items-center gap-2 overflow-x-auto scroll-smooth px-1 py-1">
      {Array.from({ length: total }).map((_, i) => {
        const isFilled = i < filled
        const isActive = i === filled
        const dotClassName = `h-2.5 w-2.5 shrink-0 rounded-full transition-all duration-300 ${
          isFilled
            ? 'scale-110 bg-gradient-to-br from-emerald-500 to-emerald-600'
            : isActive
              ? 'bg-slate-300 ring-2 ring-emerald-300 ring-offset-1'
              : 'bg-slate-200'
        }`

        if (!onSelect) {
          return <span key={i} ref={isActive ? (el) => { activeRef.current = el } : undefined} className={dotClassName} />
        }

        return (
          <button
            key={i}
            ref={isActive ? (el) => { activeRef.current = el } : undefined}
            type="button"
            aria-label={`Start from ayah ${i + 1}`}
            onClick={() => onSelect(i)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition active:scale-90"
          >
            <span className={dotClassName} />
          </button>
        )
      })}
    </div>
  )
}
