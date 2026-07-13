import { supabase } from './supabase'
import type { Badge, StarsReason } from '../types/database'

export const STAR_AMOUNTS = {
  ayah_complete: 5,
  surah_complete: 25,
} as const

export const STREAK_BONUS_AMOUNTS: Record<number, number> = { 3: 10, 7: 20, 30: 50 }
export const STREAK_MILESTONES = [3, 7, 30] as const

export function surahCompleteBadgeKey(surahNumber: number): string {
  return `surah_complete_${surahNumber}`
}

export async function awardStars(kidId: string, amount: number, reason: StarsReason): Promise<void> {
  // Balance sync is the DB trigger's job (see the gamification_stars_trigger
  // migration) — this is just the append-only log entry.
  const { error } = await supabase.from('stars_log').insert({ kid_id: kidId, amount, reason })
  if (error) throw error
}

// Pure so ParentDashboard can batch-compute per-kid streaks from one query
// without duplicating this algorithm. Dates must be local YYYY-MM-DD strings,
// matching todayLocalDate() in memorization.ts (not UTC).
export function streakFromDates(dates: Iterable<string>): number {
  const dateSet = new Set(dates)
  let streak = 0
  const cursor = new Date()
  for (;;) {
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const d = String(cursor.getDate()).padStart(2, '0')
    const key = `${y}-${m}-${d}`
    if (!dateSet.has(key)) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export async function computeStreak(kidId: string): Promise<number> {
  const { data, error } = await supabase
    .from('practice_log')
    .select('date')
    .eq('kid_id', kidId)
    .order('date', { ascending: false })
    .limit(60)
  if (error) throw error
  return streakFromDates((data ?? []).map((r) => r.date as string))
}

// The unique(kid_id, badge_key) constraint IS the "already earned" check —
// ignoreDuplicates + a losing race returns no row, so this is naturally
// race-safe with no separate read-then-write.
async function awardBadgeIfNew(kidId: string, badgeKey: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('badges')
    .upsert({ kid_id: kidId, badge_key: badgeKey }, { onConflict: 'kid_id,badge_key', ignoreDuplicates: true })
    .select()
  if (error) throw error
  return (data?.length ?? 0) > 0
}

export async function getBadges(kidId: string): Promise<Badge[]> {
  const { data, error } = await supabase.from('badges').select('*').eq('kid_id', kidId)
  if (error) throw error
  return (data ?? []) as Badge[]
}

export interface GamificationResult {
  starsAwarded: number
  newBadgeKeys: string[]
  streak: number
}

// Called from the real practice flow after an ayah is memorized. Never
// throws into the caller's critical path — see KidHome's try/catch, which
// treats this as bonus content the same way loadReviewSurahs does.
export async function processAyahComplete(kidId: string): Promise<GamificationResult> {
  let starsAwarded = 0
  const newBadgeKeys: string[] = []

  await awardStars(kidId, STAR_AMOUNTS.ayah_complete, 'ayah_complete')
  starsAwarded += STAR_AMOUNTS.ayah_complete

  const streak = await computeStreak(kidId)

  if (await awardBadgeIfNew(kidId, 'first_ayah')) {
    newBadgeKeys.push('first_ayah')
  }

  for (const threshold of STREAK_MILESTONES) {
    if (streak >= threshold) {
      const badgeKey = `streak_${threshold}`
      if (await awardBadgeIfNew(kidId, badgeKey)) {
        newBadgeKeys.push(badgeKey)
        const bonus = STREAK_BONUS_AMOUNTS[threshold]
        await awardStars(kidId, bonus, 'streak_bonus')
        starsAwarded += bonus
      }
    }
  }

  return { starsAwarded, newBadgeKeys, streak }
}

// Called only from the real mastery path (KidHome, right after
// markAssignmentMastered) — not the parent backfill path.
export async function processSurahComplete(
  kidId: string,
  surahNumber: number,
): Promise<{ starsAwarded: number; newBadgeKeys: string[] }> {
  await awardStars(kidId, STAR_AMOUNTS.surah_complete, 'surah_complete')
  const newBadgeKeys: string[] = []
  const badgeKey = surahCompleteBadgeKey(surahNumber)
  if (await awardBadgeIfNew(kidId, badgeKey)) newBadgeKeys.push(badgeKey)
  return { starsAwarded: STAR_AMOUNTS.surah_complete, newBadgeKeys }
}

// Badge only, no stars — used from the parent "mark already completed"
// backfill path. Awarding stars there would be hollow (nothing was actually
// practiced through the app), and since that function is safe to call
// repeatedly, minting stars on every re-confirm would be a real duplicate
// bug, not just a philosophical concern. The badge is a fair record of the
// kid's real repertoire either way, and idempotent via the unique constraint.
export async function checkAndAwardSurahCompleteBadge(kidId: string, surahNumber: number): Promise<boolean> {
  return awardBadgeIfNew(kidId, surahCompleteBadgeKey(surahNumber))
}
