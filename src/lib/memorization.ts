import { supabase } from './supabase'
import type { Assignment, MemorizationProgress, SurahContent } from '../types/database'

export type TargetPeriod = 'daily' | 'weekly'

export function todayLocalDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Calendar week starting Monday — matches "assigns 5 ayahs to memorize by
// next week" (a fixed weekly window, not a rolling 7 days from assignment).
function weekStartLocalDate(): Date {
  const d = new Date()
  const day = d.getDay() // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? 6 : day - 1
  const monday = new Date(d)
  monday.setDate(d.getDate() - diffToMonday)
  monday.setHours(0, 0, 0, 0)
  return monday
}

// Returns the kid's current assignment regardless of status — not just
// 'learning'. A 'mastered' assignment is still what KidHome should show
// (the surah-complete screen, with its "revise while you wait" option) until
// the parent assigns the next one; filtering to 'learning' only made that
// screen disappear on any fresh page load after mastery (it only worked
// within the same live session that just finished the last ayah). Ordering
// by assigned_at desc and taking the first row is safe regardless of status
// — a reassignment always inserts a newer row and flips the old one to
// 'superseded', so the newest row is always the current one (same pattern
// ParentDashboard.tsx's loadAssignments already relies on).
export async function getActiveAssignment(kidId: string): Promise<Assignment | null> {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('kid_id', kidId)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as Assignment | null
}

export interface AyahRange {
  startAyah: number
  endAyah: number
}

// Assignment.start_ayah/end_ayah are only ever set together (null on both
// means "whole surah") — this is the one place that invariant gets turned
// back into an AyahRange for computeTodaysSet.
export function assignmentRange(assignment: Pick<Assignment, 'start_ayah' | 'end_ayah'>): AyahRange | undefined {
  return assignment.start_ayah != null && assignment.end_ayah != null
    ? { startAyah: assignment.start_ayah, endAyah: assignment.end_ayah }
    : undefined
}

export async function assignSurah(
  kidId: string,
  surahNumber: number,
  target: number,
  period: TargetPeriod,
  range?: AyahRange,
): Promise<void> {
  // Supersede any existing active assignment first — old progress rows stay
  // untouched as history (milestone 7's manzil bucket needs them).
  const { error: supersedeError } = await supabase
    .from('assignments')
    .update({ status: 'superseded' })
    .eq('kid_id', kidId)
    .eq('status', 'learning')
  if (supersedeError) throw supersedeError

  // Re-picking a surah that's already mastered for this kid is a deliberate
  // "start over" (forgotten material, marked complete by mistake, etc.) —
  // supersede the old mastered row(s) too and wipe this surah's memorized
  // progress, so the kid actually redoes the practice flow instead of
  // landing straight back on the surah-complete screen (computeTodaysSet
  // only looks at memorization_progress — a fresh 'learning' row alone,
  // without this, changes nothing there).
  const { data: masteredRows, error: masteredError } = await supabase
    .from('assignments')
    .select('id')
    .eq('kid_id', kidId)
    .eq('surah_number', surahNumber)
    .eq('status', 'mastered')
  if (masteredError) throw masteredError

  if (masteredRows && masteredRows.length > 0) {
    const { error: supersedeMasteredError } = await supabase
      .from('assignments')
      .update({ status: 'superseded' })
      .in(
        'id',
        masteredRows.map((r) => r.id as string),
      )
    if (supersedeMasteredError) throw supersedeMasteredError

    const { error: wipeProgressError } = await supabase
      .from('memorization_progress')
      .delete()
      .eq('kid_id', kidId)
      .eq('surah_number', surahNumber)
    if (wipeProgressError) throw wipeProgressError
  }

  const { error: insertError } = await supabase.from('assignments').insert({
    kid_id: kidId,
    surah_number: surahNumber,
    daily_ayah_target: target,
    target_period: period,
    status: 'learning',
    start_ayah: range?.startAyah ?? null,
    end_ayah: range?.endAyah ?? null,
  })
  if (insertError) throw insertError
}

export type TodaysSet =
  | { kind: 'surah-complete' }
  | { kind: 'done-for-period'; period: TargetPeriod; doneInPeriod: number; target: number }
  | { kind: 'session'; ayahs: SurahContent['ayahs']; period: TargetPeriod; doneInPeriod: number; target: number }

// Uses memorization_progress.last_reviewed_at as a same-period cap instead of
// a naive "next N unmemorized" recompute, so resuming mid-period doesn't
// overshoot the target (completing ayah 1 shouldn't make ayah 2 *and* 3
// "next"). Daily periods cap by calendar day; weekly periods cap by calendar
// week (Monday start) — a weekly target has no forced daily pacing, whatever
// is left in the week's quota is all available in one sitting.
export async function computeTodaysSet(
  kidId: string,
  surahNumber: number,
  surahContent: SurahContent,
  target: number,
  period: TargetPeriod,
  range?: AyahRange,
): Promise<TodaysSet> {
  const { data, error } = await supabase
    .from('memorization_progress')
    .select('ayah_number, status, last_reviewed_at')
    .eq('kid_id', kidId)
    .eq('surah_number', surahNumber)
  if (error) throw error

  const rows = (data ?? []) as Pick<MemorizationProgress, 'ayah_number' | 'status' | 'last_reviewed_at'>[]
  const memorized = new Set(rows.filter((r) => r.status === 'memorized').map((r) => r.ayah_number))

  // A range scopes the assignment to part of the surah — the working pool
  // is just that slice, and "complete" means the slice is fully memorized,
  // not the whole surah.
  const pool = range
    ? surahContent.ayahs.filter((a) => a.numberInSurah >= range.startAyah && a.numberInSurah <= range.endAyah)
    : surahContent.ayahs

  if (pool.every((a) => memorized.has(a.numberInSurah))) {
    return { kind: 'surah-complete' }
  }

  const periodStart = period === 'weekly' ? weekStartLocalDate() : null
  const today = todayLocalDate()
  const doneInPeriod = rows.filter((r) => {
    if (r.status !== 'memorized' || !r.last_reviewed_at) return false
    return period === 'weekly' ? new Date(r.last_reviewed_at) >= periodStart! : r.last_reviewed_at.startsWith(today)
  }).length

  const remainingSlots = Math.max(0, target - doneInPeriod)
  if (remainingSlots === 0) {
    return { kind: 'done-for-period', period, doneInPeriod, target }
  }

  const ayahs = pool.filter((a) => !memorized.has(a.numberInSurah)).slice(0, remainingSlots)
  return { kind: 'session', ayahs, period, doneInPeriod, target }
}

export async function markAyahMemorized(kidId: string, surahNumber: number, ayahNumber: number): Promise<void> {
  // Goes straight new -> memorized (no intermediate 'learning' write — nothing
  // in this milestone reads that state, and this is what lets the daily
  // selection progress through the surah). review_bucket defaults to
  // 'sabqi' ("recently memorized") — unread until milestone 7's review query.
  const { error } = await supabase.from('memorization_progress').upsert(
    {
      kid_id: kidId,
      surah_number: surahNumber,
      ayah_number: ayahNumber,
      status: 'memorized',
      review_bucket: 'sabqi',
      last_reviewed_at: new Date().toISOString(),
    },
    { onConflict: 'kid_id,surah_number,ayah_number' },
  )
  if (error) throw error
}

// practice_log has no ayah-level granularity, but it represents "did the kid
// practice today" for streak purposes (milestone 4) — so this is called
// after every completed ayah, not just once the full target is reached
// (a weekly target could otherwise go days without ever writing a row even
// though the kid practiced). The upsert makes repeat calls the same day
// harmless.
export async function logPracticeSessionComplete(kidId: string): Promise<void> {
  const { error } = await supabase
    .from('practice_log')
    .upsert(
      { kid_id: kidId, date: todayLocalDate(), track: 'memorization', completed: true },
      { onConflict: 'kid_id,date,track' },
    )
  if (error) throw error
}

export async function markAssignmentMastered(assignmentId: string): Promise<void> {
  const { error } = await supabase.from('assignments').update({ status: 'mastered' }).eq('id', assignmentId)
  if (error) throw error
}

export async function getMasteredSurahNumbers(kidId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select('surah_number')
    .eq('kid_id', kidId)
    .eq('status', 'mastered')
  if (error) throw error
  return Array.from(new Set((data ?? []).map((r) => r.surah_number as number)))
}

// For a kid who already memorized surahs before using the app — lets a
// parent backfill an assignment + all its ayahs as mastered directly,
// without going through the practice flow. Safe to call repeatedly on an
// already-mastered surah (e.g. re-confirming a pre-checked selection) —
// skips the assignment insert so it doesn't pile up duplicate rows, but
// still re-upserts progress (harmless, keeps last_reviewed_at fresh).
export async function markSurahAlreadyCompleted(
  kidId: string,
  surahNumber: number,
  numberOfAyahs: number,
): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from('assignments')
    .select('id')
    .eq('kid_id', kidId)
    .eq('surah_number', surahNumber)
    .eq('status', 'mastered')
    .limit(1)
    .maybeSingle()
  if (existingError) throw existingError

  if (!existing) {
    const { error: insertError } = await supabase.from('assignments').insert({
      kid_id: kidId,
      surah_number: surahNumber,
      daily_ayah_target: numberOfAyahs,
      target_period: 'daily',
      status: 'mastered',
    })
    if (insertError) throw insertError
  }

  const now = new Date().toISOString()
  const rows = Array.from({ length: numberOfAyahs }, (_, i) => ({
    kid_id: kidId,
    surah_number: surahNumber,
    ayah_number: i + 1,
    status: 'memorized' as const,
    review_bucket: 'sabqi' as const,
    last_reviewed_at: now,
  }))

  const { error: progressError } = await supabase
    .from('memorization_progress')
    .upsert(rows, { onConflict: 'kid_id,surah_number,ayah_number' })
  if (progressError) throw progressError
}

export async function getMemorizedAyahNumbers(kidId: string, surahNumber: number): Promise<number[]> {
  const { data, error } = await supabase
    .from('memorization_progress')
    .select('ayah_number')
    .eq('kid_id', kidId)
    .eq('surah_number', surahNumber)
    .eq('status', 'memorized')
    .order('ayah_number')
  if (error) throw error
  return (data ?? []).map((r) => r.ayah_number as number)
}

// Lets a parent explicitly flag an already-mastered surah for revision —
// either because it needs re-revising for any reason, or because the parent
// wants to choose (rather than wait for) what shows up in "Time to revise!"
// this week. Resets last_reviewed_at to null for all its memorized ayahs,
// which makes it the most-overdue surah and puts it at the front of
// getSurahsForReview's least-recently-reviewed rotation — no separate
// "pinned surah" state to track, and it naturally falls back to the normal
// rotation once it's actually been revised again. Doesn't touch `status`,
// so it has no effect on mastery/badges — purely a revision-ordering signal.
export async function flagSurahForRevision(kidId: string, surahNumber: number): Promise<void> {
  const { error } = await supabase
    .from('memorization_progress')
    .update({ last_reviewed_at: null })
    .eq('kid_id', kidId)
    .eq('surah_number', surahNumber)
    .eq('status', 'memorized')
  if (error) throw error
}

// Picks mastered surahs to revise today — least-recently-reviewed first.
// Not true independent randomness: it varies day to day as reviews happen,
// but also mathematically guarantees every mastered surah eventually
// rotates through, which plain random selection can't promise.
export async function getSurahsForReview(kidId: string, limit = 3): Promise<number[]> {
  const { data: masteredAssignments, error: assignmentsError } = await supabase
    .from('assignments')
    .select('surah_number')
    .eq('kid_id', kidId)
    .eq('status', 'mastered')
  if (assignmentsError) throw assignmentsError

  const surahNumbers = Array.from(new Set((masteredAssignments ?? []).map((r) => r.surah_number as number)))
  if (surahNumbers.length === 0) return []

  const { data: progressRows, error: progressError } = await supabase
    .from('memorization_progress')
    .select('surah_number, last_reviewed_at')
    .eq('kid_id', kidId)
    .eq('status', 'memorized')
    .in('surah_number', surahNumbers)
  if (progressError) throw progressError

  const oldestBySurah = new Map<number, string>()
  for (const row of (progressRows ?? []) as { surah_number: number; last_reviewed_at: string | null }[]) {
    const ts = row.last_reviewed_at ?? '1970-01-01T00:00:00.000Z'
    const current = oldestBySurah.get(row.surah_number)
    if (!current || ts < current) oldestBySurah.set(row.surah_number, ts)
  }

  return surahNumbers
    .sort((a, b) => (oldestBySurah.get(a) ?? '').localeCompare(oldestBySurah.get(b) ?? ''))
    .slice(0, limit)
}
