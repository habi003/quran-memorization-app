import { Flame, Sparkles, Trophy, type LucideIcon } from 'lucide-react'
import { surahCompleteBadgeKey } from './gamification'

export interface BadgeCatalogEntry {
  label: string
  description: string
  icon: LucideIcon
}

// App copy, not data — matches the frontend-constant pattern used for
// AVATAR_ICONS (avatarIcons.ts). Only the badges reachable this milestone;
// first_lesson/perfect_day/unit_1_complete are added once the reading track
// (milestone 6) exists.
export const BADGE_CATALOG: Record<string, BadgeCatalogEntry> = {
  first_ayah: {
    label: 'First Ayah',
    description: 'Memorized your very first ayah!',
    icon: Sparkles,
  },
  streak_3: {
    label: '3-Day Streak',
    description: 'Practiced 3 days in a row.',
    icon: Flame,
  },
  streak_7: {
    label: '7-Day Streak',
    description: 'Practiced 7 days in a row.',
    icon: Flame,
  },
  streak_30: {
    label: '30-Day Streak',
    description: 'Practiced 30 days in a row.',
    icon: Flame,
  },
}

const SURAH_COMPLETE_PATTERN = /^surah_complete_(\d+)$/

// Resolves fixed catalog keys directly; parameterized surah_complete_<n>
// keys (one per mastered surah, not pre-enumerated) are built on the fly.
export function getBadgeEntry(badgeKey: string, surahName?: string): BadgeCatalogEntry | null {
  const fixed = BADGE_CATALOG[badgeKey]
  if (fixed) return fixed

  const match = SURAH_COMPLETE_PATTERN.exec(badgeKey)
  if (match) {
    return {
      label: surahName ? `${surahName} Complete` : 'Surah Complete',
      description: 'Mastered every ayah of this surah.',
      icon: Trophy,
    }
  }

  return null
}

export { surahCompleteBadgeKey }
