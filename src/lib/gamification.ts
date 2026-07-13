import { supabase } from './supabase'
import { getMasteredSurahNumbers } from './memorization'
import type { Badge, StarsReason } from '../types/database'

export const STAR_AMOUNTS = {
  ayah_complete: 5,
  surah_complete: 25,
} as const

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365] as const
export const STREAK_BONUS_AMOUNTS: Record<number, number> = {
  3: 10,
  7: 20,
  14: 30,
  30: 50,
  60: 75,
  100: 150,
  180: 250,
  365: 500,
}

export const SURAH_MILESTONES = [3, 5, 10, 25, 50, 75, 100, 114] as const
export const SURAH_MILESTONE_BONUS: Record<number, number> = {
  3: 30,
  5: 50,
  10: 100,
  25: 250,
  50: 500,
  75: 750,
  100: 1000,
  114: 1500,
}

export function surahCompleteBadgeKey(surahNumber: number): string {
  return `surah_complete_${surahNumber}`
}

// Deliberately a different prefix from surahCompleteBadgeKey — "mastered
// surah N specifically" and "mastered N surahs total" are different facts.
export function milestoneSurahBadgeKey(count: number): string {
  return `milestone_surahs_${count}`
}

const BONUS_STARS_BY_BADGE: Record<string, number> = (() => {
  const map: Record<string, number> = {}
  for (const t of STREAK_MILESTONES) map[`streak_${t}`] = STREAK_BONUS_AMOUNTS[t]
  for (const c of SURAH_MILESTONES) map[milestoneSurahBadgeKey(c)] = SURAH_MILESTONE_BONUS[c]
  return map
})()

// first_ayah and surah_complete_<n> are badge-only — their stars, if any,
// are already paid immediately as base ayah_complete/surah_complete stars
// at completion time, not tied to the badge/claim itself.
export function bonusStarsForBadge(badgeKey: string): number {
  return BONUS_STARS_BY_BADGE[badgeKey] ?? 0
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
    .limit(400) // must stay past the largest STREAK_MILESTONES tier (365)
  if (error) throw error
  return streakFromDates((data ?? []).map((r) => r.date as string))
}

// Grants a badge instantly, already claimed — used only by the parent
// backfill path below, which is an admin action outside Kid Mode and was
// never meant to go through the tap-to-claim gate.
async function awardBadgeIfNew(kidId: string, badgeKey: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('badges')
    .upsert(
      { kid_id: kidId, badge_key: badgeKey, claimed_at: new Date().toISOString() },
      { onConflict: 'kid_id,badge_key', ignoreDuplicates: true },
    )
    .select()
  if (error) throw error
  return (data?.length ?? 0) > 0
}

// Records that a milestone's condition has been met, but leaves it
// unclaimed (claimed_at null) until the kid taps it in the Badge Shelf — the
// unique(kid_id,badge_key) constraint makes repeat calls harmless.
async function recordPendingBadge(kidId: string, badgeKey: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('badges')
    .upsert(
      { kid_id: kidId, badge_key: badgeKey, claimed_at: null },
      { onConflict: 'kid_id,badge_key', ignoreDuplicates: true },
    )
    .select()
  if (error) throw error
  return (data?.length ?? 0) > 0
}

async function recordSurahCountMilestones(kidId: string, masteredCount: number): Promise<void> {
  for (const threshold of SURAH_MILESTONES) {
    if (masteredCount >= threshold) await recordPendingBadge(kidId, milestoneSurahBadgeKey(threshold))
  }
}

export async function getBadges(kidId: string): Promise<Badge[]> {
  const { data, error } = await supabase.from('badges').select('*').eq('kid_id', kidId)
  if (error) throw error
  return (data ?? []) as Badge[]
}

// Conditional UPDATE (only touches an unclaimed row) so a double-tap or a
// second tab/device racing the same claim can't double-award bonus stars —
// the .is('claimed_at', null) guard is the race-safety mechanism here, the
// same role the unique constraint plays for the record/award functions above.
export async function claimBadge(
  kidId: string,
  badgeKey: string,
): Promise<{ claimed: boolean; starsAwarded: number }> {
  const { data, error } = await supabase
    .from('badges')
    .update({ claimed_at: new Date().toISOString() })
    .eq('kid_id', kidId)
    .eq('badge_key', badgeKey)
    .is('claimed_at', null)
    .select()
  if (error) throw error

  const claimed = (data?.length ?? 0) > 0
  if (!claimed) return { claimed: false, starsAwarded: 0 }

  const starsAwarded = bonusStarsForBadge(badgeKey)
  if (starsAwarded > 0) {
    await awardStars(kidId, starsAwarded, badgeKey.startsWith('streak_') ? 'streak_bonus' : 'milestone_bonus')
  }
  return { claimed: true, starsAwarded }
}

export interface AyahCompleteResult {
  starsAwarded: number
  streak: number
}

// Called from the real practice flow after an ayah is memorized. Never
// throws into the caller's critical path — see KidHome's try/catch, which
// treats this as bonus content the same way loadReviewSurahs does.
export async function processAyahComplete(kidId: string): Promise<AyahCompleteResult> {
  await awardStars(kidId, STAR_AMOUNTS.ayah_complete, 'ayah_complete')
  const streak = await computeStreak(kidId)

  await recordPendingBadge(kidId, 'first_ayah')
  for (const threshold of STREAK_MILESTONES) {
    if (streak >= threshold) await recordPendingBadge(kidId, `streak_${threshold}`)
  }

  return { starsAwarded: STAR_AMOUNTS.ayah_complete, streak }
}

export interface SurahCompleteResult {
  starsAwarded: number
  masteredCount: number
}

// Called only from the real mastery path (KidHome, right after
// markAssignmentMastered) — not the parent backfill path below. The
// per-specific-surah badge is granted instantly (no claim gate) — there's no
// kid-facing "surahs mastered" shelf to claim it through, it's just a
// historical record; only the surah-count *milestones* (3/5/10/... surahs
// total) go through the claim flow, since those are the ones shown in the
// Badge Shelf.
export async function processSurahComplete(kidId: string, surahNumber: number): Promise<SurahCompleteResult> {
  await awardStars(kidId, STAR_AMOUNTS.surah_complete, 'surah_complete')
  await awardBadgeIfNew(kidId, surahCompleteBadgeKey(surahNumber))

  const masteredCount = (await getMasteredSurahNumbers(kidId)).length
  await recordSurahCountMilestones(kidId, masteredCount)

  return { starsAwarded: STAR_AMOUNTS.surah_complete, masteredCount }
}

// Badge only, no stars — used from the parent "mark already completed"
// backfill path. Awarding stars there would be hollow (nothing was actually
// practiced through the app), and since that function is safe to call
// repeatedly, minting stars on every re-confirm would be a real duplicate
// bug, not just a philosophical concern. The per-surah badge is granted
// instantly (see processSurahComplete's comment above), but surah-count
// milestones crossed by the backfill are recorded as *pending* so a kid with
// a large pre-app repertoire still gets to discover and claim those titles
// in Kid Mode.
export async function checkAndAwardSurahCompleteBadge(kidId: string, surahNumber: number): Promise<boolean> {
  const claimed = await awardBadgeIfNew(kidId, surahCompleteBadgeKey(surahNumber))
  const masteredCount = (await getMasteredSurahNumbers(kidId)).length
  await recordSurahCountMilestones(kidId, masteredCount)
  return claimed
}
