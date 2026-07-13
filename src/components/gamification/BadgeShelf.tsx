import { BADGE_CATALOG, getBadgeEntry } from '../../lib/badgeCatalog'
import type { Badge } from '../../types/database'
import type { Theme } from '../../lib/themes'

interface BadgeShelfProps {
  badges: Badge[]
  theme: Theme
}

const FIXED_BADGE_KEYS = ['first_ayah', 'streak_3', 'streak_7', 'streak_30']

// Colored icon for earned badges, grey silhouette + hint for locked ones,
// per spec §7. Surah-mastery badges aren't pre-enumerated (114 locked tiles
// would overwhelm the shelf) — only earned ones are shown, as a separate row.
export function BadgeShelf({ badges, theme }: BadgeShelfProps) {
  const earnedKeys = new Set(badges.map((b) => b.badge_key))
  const surahBadges = badges.filter((b) => b.badge_key.startsWith('surah_complete_'))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        {FIXED_BADGE_KEYS.map((key) => {
          const entry = BADGE_CATALOG[key]
          const Icon = entry.icon
          const earned = earnedKeys.has(key)
          return (
            <div key={key} className="flex flex-col items-center gap-1" title={entry.description}>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  earned ? `text-white ${theme.accentBg}` : 'bg-slate-200 text-slate-400'
                }`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <span className={`text-center text-[11px] leading-tight ${earned ? theme.bodyText : 'text-slate-300'}`}>
                {entry.label}
              </span>
            </div>
          )
        })}
      </div>

      {surahBadges.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className={`text-xs font-semibold ${theme.bodyText}`}>Surahs mastered</h3>
          <div className="flex flex-wrap gap-2">
            {surahBadges.map((b) => {
              const entry = getBadgeEntry(b.badge_key)
              if (!entry) return null
              const Icon = entry.icon
              return (
                <span
                  key={b.badge_key}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white ${theme.accentBg}`}
                >
                  <Icon className="h-3 w-3" />
                  {entry.label}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
