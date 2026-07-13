import { Award, BookMarked, Crown, Flame, Gem, Medal, Sparkles, Star, Trophy, type LucideIcon } from 'lucide-react'
import { milestoneSurahBadgeKey, surahCompleteBadgeKey } from './gamification'

export interface BadgeCatalogEntry {
  label: string
  description: string
  icon: LucideIcon
}

// App copy, not data — matches the frontend-constant pattern used for
// AVATAR_ICONS (avatarIcons.ts). Only badges reachable this milestone;
// first_lesson/perfect_day/unit_1_complete are added once the reading track
// (milestone 6) exists.
export const BADGE_CATALOG: Record<string, BadgeCatalogEntry> = {
  first_ayah: {
    label: 'First Ayah',
    description: 'Memorized your very first ayah!',
    icon: Sparkles,
  },
  streak_3: { label: '3-Day Streak', description: 'Practiced 3 days in a row.', icon: Flame },
  streak_7: { label: '7-Day Streak', description: 'Practiced 7 days in a row.', icon: Flame },
  streak_14: { label: '14-Day Streak', description: 'Practiced 14 days in a row.', icon: Flame },
  streak_30: { label: '30-Day Streak', description: 'Practiced 30 days in a row.', icon: Flame },
  streak_60: { label: '60-Day Streak', description: 'Practiced 60 days in a row.', icon: Flame },
  streak_100: { label: '100-Day Streak', description: 'Practiced 100 days in a row.', icon: Flame },
  streak_180: { label: '180-Day Streak', description: 'Practiced 180 days in a row.', icon: Flame },
  streak_365: { label: '365-Day Streak', description: 'Practiced a whole year in a row!', icon: Flame },

  [milestoneSurahBadgeKey(3)]: { label: 'Surah Starter', description: 'Mastered 3 surahs.', icon: BookMarked },
  [milestoneSurahBadgeKey(5)]: { label: 'Ayah Achiever', description: 'Mastered 5 surahs.', icon: Star },
  [milestoneSurahBadgeKey(10)]: { label: 'Quran Explorer', description: 'Mastered 10 surahs.', icon: Medal },
  [milestoneSurahBadgeKey(25)]: { label: 'Dedicated Reciter', description: 'Mastered 25 surahs.', icon: Award },
  [milestoneSurahBadgeKey(50)]: { label: 'Quran Companion', description: 'Mastered 50 surahs.', icon: Trophy },
  [milestoneSurahBadgeKey(75)]: { label: 'Hafiz in Training', description: 'Mastered 75 surahs.', icon: Crown },
  [milestoneSurahBadgeKey(100)]: { label: 'Master Memorizer', description: 'Mastered 100 surahs.', icon: Gem },
  [milestoneSurahBadgeKey(114)]: {
    label: 'Hafiz al-Quran',
    description: 'Mastered every surah in the Quran!',
    icon: Sparkles,
  },
}

// Titles tied to surah-count milestones only (not streak) — one clean
// progression a kid can follow, rather than two overlapping tracks.
export const TITLE_CATALOG: Record<string, string> = {
  [milestoneSurahBadgeKey(3)]: 'Surah Starter',
  [milestoneSurahBadgeKey(5)]: 'Ayah Achiever',
  [milestoneSurahBadgeKey(10)]: 'Quran Explorer',
  [milestoneSurahBadgeKey(25)]: 'Dedicated Reciter',
  [milestoneSurahBadgeKey(50)]: 'Quran Companion',
  [milestoneSurahBadgeKey(75)]: 'Hafiz in Training',
  [milestoneSurahBadgeKey(100)]: 'Master Memorizer',
  [milestoneSurahBadgeKey(114)]: 'Hafiz al-Quran',
}

const MILESTONE_SURAHS_PATTERN = /^milestone_surahs_(\d+)$/

export interface TitleInfo {
  badgeKey: string
  title: string
  description: string
}

// Highest-tier claimed title, if any — titles are tied to surah-count
// milestones only, so "highest" is just the largest threshold among the
// kid's claimed milestone_surahs_<n> badges. Shared by KidHome and
// ParentDashboard so "current title" means the same thing everywhere
// (per-page duplicated logic is exactly how these things drift apart).
export function getCurrentTitle(claimedBadgeKeys: Iterable<string>): TitleInfo | null {
  let best: { badgeKey: string; count: number } | null = null
  for (const badgeKey of claimedBadgeKeys) {
    if (!TITLE_CATALOG[badgeKey]) continue
    const count = Number(MILESTONE_SURAHS_PATTERN.exec(badgeKey)?.[1] ?? 0)
    if (!best || count > best.count) best = { badgeKey, count }
  }
  if (!best) return null
  return { badgeKey: best.badgeKey, title: TITLE_CATALOG[best.badgeKey], description: BADGE_CATALOG[best.badgeKey]?.description ?? '' }
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
