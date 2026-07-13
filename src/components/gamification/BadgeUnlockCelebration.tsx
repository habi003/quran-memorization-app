import { useEffect } from 'react'
import { getBadgeEntry } from '../../lib/badgeCatalog'
import { playBadgeUnlock } from '../../lib/sounds'

interface BadgeUnlockCelebrationProps {
  badgeKey: string
  onDismiss: () => void
}

// Rarer, bigger moment than the small frequent star pops, so this is a
// tap-to-dismiss overlay (same modal pattern as SurahReview/WelcomeNamePrompt)
// rather than an auto-timeout toast.
export function BadgeUnlockCelebration({ badgeKey, onDismiss }: BadgeUnlockCelebrationProps) {
  const entry = getBadgeEntry(badgeKey)

  useEffect(() => {
    playBadgeUnlock()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badgeKey])

  if (!entry) return null
  const Icon = entry.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onDismiss}>
      <div
        className="animate-badge-pop flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white">
          <Icon className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800">Badge unlocked!</h2>
        <p className="text-base font-medium text-slate-700">{entry.label}</p>
        <p className="text-sm text-slate-500">{entry.description}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-1 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-emerald-600 hover:to-emerald-700"
        >
          Awesome!
        </button>
      </div>
    </div>
  )
}
