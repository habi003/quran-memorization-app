interface ProgressDotsProps {
  total: number
  filled: number
}

export function ProgressDots({ total, filled }: ProgressDotsProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const isFilled = i < filled
        const isActive = i === filled
        return (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
              isFilled
                ? 'scale-110 bg-gradient-to-br from-emerald-500 to-emerald-600'
                : isActive
                  ? 'bg-slate-300 ring-2 ring-emerald-300 ring-offset-1'
                  : 'bg-slate-200'
            }`}
          />
        )
      })}
    </div>
  )
}
