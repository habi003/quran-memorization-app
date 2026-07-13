import { BADGE_CATALOG } from '../../lib/badgeCatalog'
import { STREAK_MILESTONES, SURAH_MILESTONES, milestoneSurahBadgeKey } from '../../lib/gamification'
import type { Badge } from '../../types/database'
import type { Theme } from '../../lib/themes'
import { CircularProgress } from './CircularProgress'

interface BadgeShelfProps {
  badges: Badge[]
  theme: Theme
  streak: number
  masteredCount: number
  onClaim: (badgeKey: string) => void
}

const FIXED_BADGE_KEYS = [
  'first_ayah',
  ...STREAK_MILESTONES.map((t) => `streak_${t}`),
  ...SURAH_MILESTONES.map((c) => milestoneSurahBadgeKey(c)),
]

const STREAK_KEY_PATTERN = /^streak_(\d+)$/
const SURAH_MILESTONE_KEY_PATTERN = /^milestone_surahs_(\d+)$/

// Locked slots show live progress toward the next tier (streak days or
// mastered-surah count) rather than a flat "not yet" circle. Binary badges
// (first_ayah) have no meaningful fraction, so they just render an empty ring.
function getProgress(key: string, streak: number, masteredCount: number): { value: number; max: number } {
  const streakMatch = STREAK_KEY_PATTERN.exec(key)
  if (streakMatch) return { value: streak, max: Number(streakMatch[1]) }
  const surahMatch = SURAH_MILESTONE_KEY_PATTERN.exec(key)
  if (surahMatch) return { value: masteredCount, max: Number(surahMatch[1]) }
  return { value: 0, max: 1 }
}

// Three states per badge: earned (claimed_at set, solid), pending
// (condition met but not yet tapped — glowing "Tap to unlock!"), locked
// (condition not met — grey progress ring toward the next tier). Per-surah
// mastery badges (surah_complete_<n>) aren't shown here at all — with a kid
// potentially mastering 40-50+ surahs over time, a growing list of
// individual surah pills stops being a useful "shelf" — milestone counts
// (5/10/25/50... surahs) are the meaningful progress signal instead.
// Newest-claimed first, so the badge a kid just earned is the first thing
// they see next time they open the shelf — pending/locked ones keep their
// natural difficulty order after that (they have no "unlocked" moment yet).
function orderByRecency(keys: string[], badgeByKey: Map<string, Badge>): string[] {
  const earned = keys
    .filter((k) => badgeByKey.get(k)?.claimed_at)
    .sort((a, b) => badgeByKey.get(b)!.claimed_at!.localeCompare(badgeByKey.get(a)!.claimed_at!))
  const rest = keys.filter((k) => !badgeByKey.get(k)?.claimed_at)
  return [...earned, ...rest]
}

export function BadgeShelf({ badges, theme, streak, masteredCount, onClaim }: BadgeShelfProps) {
  const badgeByKey = new Map(badges.map((b) => [b.badge_key, b]))
  const orderedKeys = orderByRecency(FIXED_BADGE_KEYS, badgeByKey)

  return (
    <div className="grid grid-cols-5 gap-x-1.5 gap-y-2">
      {orderedKeys.map((key) => {
        const entry = BADGE_CATALOG[key]
        const Icon = entry.icon
        const badge = badgeByKey.get(key)
        const earned = Boolean(badge?.claimed_at)
        const pending = Boolean(badge && !badge.claimed_at)
        const progress = getProgress(key, streak, masteredCount)

        return (
          <button
            key={key}
            type="button"
            disabled={!pending}
            onClick={() => pending && onClaim(key)}
            title={entry.description}
            className={`flex flex-col items-center gap-0.5 ${pending ? 'active:scale-90' : ''}`}
          >
            {earned ? (
              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-white ${theme.accentBg}`}>
                <Icon className="h-4 w-4" />
              </div>
            ) : pending ? (
              <div className="animate-pop flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white ring-2 ring-amber-200">
                <Icon className="h-4 w-4" />
              </div>
            ) : (
              <CircularProgress value={progress.value} max={progress.max} size={36} strokeWidth={3}>
                <Icon className="h-3.5 w-3.5 text-slate-300" />
              </CircularProgress>
            )}
            <span
              className={`text-center text-[9px] leading-tight ${
                earned ? theme.bodyText : pending ? 'font-semibold text-amber-600' : 'text-slate-300'
              }`}
            >
              {pending ? 'Unlock!' : entry.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
