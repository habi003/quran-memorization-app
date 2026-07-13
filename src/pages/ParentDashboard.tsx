import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { hasPin } from '../lib/pin'
import { fetchSurahList, fetchReciters } from '../lib/quran'
import { assignSurah, markSurahAlreadyCompleted, type TargetPeriod } from '../lib/memorization'
import { useAuth } from '../context/AuthContext'
import { getDisplayName, hasCustomName } from '../lib/displayName'
import type { ApiSurahMeta, Assignment, Kid, MemorizationProgress } from '../types/database'
import { KidCard } from '../components/KidCard'
import { LoadingScreen } from '../components/LoadingScreen'
import { ModeToggle } from '../components/ModeToggle'
import { AssignmentStatus } from '../components/AssignmentStatus'
import { SurahPicker } from '../components/SurahPicker'
import { MarkCompletedSurahs } from '../components/MarkCompletedSurahs'
import { WelcomeNamePrompt } from '../components/WelcomeNamePrompt'
import { playTap } from '../lib/sounds'

// Suggests the surah *before* the one just completed — many memorization
// programs work backward from the shorter/later surahs (e.g. finishing 96
// suggests 95), not forward through the Quran.
function suggestedNextSurah(assignment: Assignment | null): number | null {
  if (assignment?.status !== 'mastered') return null
  return assignment.surah_number > 1 ? assignment.surah_number - 1 : null
}

export function ParentDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [kids, setKids] = useState<Kid[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [assignments, setAssignments] = useState<Record<string, Assignment>>({})
  const [surahMetaByNumber, setSurahMetaByNumber] = useState<Record<number, ApiSurahMeta>>({})
  const [memorizedCounts, setMemorizedCounts] = useState<Record<string, number>>({})
  const [assignmentsLoading, setAssignmentsLoading] = useState(true)
  const [assigningKid, setAssigningKid] = useState<Kid | null>(null)
  const [markingCompletedKid, setMarkingCompletedKid] = useState<Kid | null>(null)
  const [reciterNames, setReciterNames] = useState<Record<string, string>>({})

  const loadKids = useCallback(async () => {
    const { data, error: fetchError } = await supabase.from('kids').select('*').order('created_at')
    if (fetchError) setError(fetchError.message)
    else setKids((data ?? []) as Kid[])
  }, [])

  useEffect(() => {
    loadKids()
  }, [loadKids])

  useEffect(() => {
    fetchReciters()
      .then((list) => {
        setReciterNames(Object.fromEntries(list.map((r) => [r.identifier, r.englishName])))
      })
      .catch(() => {
        // Reciter names are a display nicety — fine to just show nothing.
      })
  }, [])

  const loadAssignments = useCallback(async (kidList: Kid[]) => {
    if (kidList.length === 0) {
      setAssignments({})
      setMemorizedCounts({})
      setAssignmentsLoading(false)
      return
    }

    setAssignmentsLoading(true)
    const kidIds = kidList.map((k) => k.id)

    const [assignmentRes, progressRes, surahList] = await Promise.all([
      supabase.from('assignments').select('*').in('kid_id', kidIds).order('assigned_at', { ascending: false }),
      supabase.from('memorization_progress').select('kid_id, surah_number, status').in('kid_id', kidIds),
      fetchSurahList().catch(() => [] as ApiSurahMeta[]),
    ])

    if (assignmentRes.error) setError(assignmentRes.error.message)
    if (progressRes.error) setError(progressRes.error.message)

    // Rows are ordered newest-first, so the first row seen per kid is their
    // current assignment (learning or mastered) — superseded ones are always
    // older than whatever replaced them, so no extra filtering is needed.
    const currentByKid: Record<string, Assignment> = {}
    for (const row of (assignmentRes.data ?? []) as Assignment[]) {
      if (!currentByKid[row.kid_id]) currentByKid[row.kid_id] = row
    }

    const counts: Record<string, number> = {}
    for (const row of (progressRes.data ?? []) as Pick<MemorizationProgress, 'kid_id' | 'surah_number' | 'status'>[]) {
      if (row.status !== 'memorized') continue
      const key = `${row.kid_id}:${row.surah_number}`
      counts[key] = (counts[key] ?? 0) + 1
    }

    const surahMap: Record<number, ApiSurahMeta> = {}
    for (const s of surahList) surahMap[s.number] = s

    setAssignments(currentByKid)
    setMemorizedCounts(counts)
    setSurahMetaByNumber(surahMap)
    setAssignmentsLoading(false)
  }, [])

  useEffect(() => {
    if (kids) loadAssignments(kids)
  }, [kids, loadAssignments])

  async function handleAssign(surahNumber: number, target: number, period: TargetPeriod) {
    if (!assigningKid) return
    await assignSurah(assigningKid.id, surahNumber, target, period)
    if (kids) await loadAssignments(kids)
  }

  async function handleMarkCompleted(surahs: ApiSurahMeta[]) {
    if (!markingCompletedKid) return
    for (const s of surahs) {
      await markSurahAlreadyCompleted(markingCompletedKid.id, s.number, s.numberOfAyahs)
    }
    if (kids) await loadAssignments(kids)
  }

  function switchToKidMode() {
    // KidPicker locks the parent gate itself once it has actually mounted at
    // /kids — locking here instead would race with this navigation (the
    // context update can be seen by RequireParentUnlock while still matched
    // to /parent, bouncing through the PIN screen before /kids is reached).
    navigate('/kids')
  }

  function goToSettings() {
    playTap()
    navigate('/parent/settings')
  }

  if (kids === null) return <LoadingScreen />

  return (
    <div className="animate-fade-in-up mx-auto flex min-h-screen max-w-2xl flex-col gap-6 bg-gradient-to-b from-slate-50 to-white px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome, {getDisplayName(user)}</h1>
          <p className="text-sm text-slate-500">Here's how the family is doing.</p>
        </div>
        <div className="flex items-center gap-3">
          <ModeToggle mode="parent" onSwitch={switchToKidMode} />
          <button
            type="button"
            onClick={goToSettings}
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 active:scale-90"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {!hasPin() && (
        <div className="rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-800">
          Set a Parent PIN to protect Parent Mode →{' '}
          <button type="button" onClick={goToSettings} className="font-semibold underline">
            Settings
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-700">Kids</h2>
        {kids.length === 0 ? (
          <p className="text-slate-500">
            No kids yet —{' '}
            <button type="button" onClick={goToSettings} className="underline">
              add one in Settings
            </button>
            .
          </p>
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            {kids.map((kid) => (
              <KidCard
                key={kid.id}
                kid={kid}
                onClick={() => navigate(`/kids/${kid.id}/home`)}
                reciterName={reciterNames[kid.preferred_reciter]}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-700">Assignment</h2>
        {assignmentsLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : kids.length === 0 ? (
          <p className="text-slate-500">Add a kid first to assign a surah.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {kids.map((kid) => {
              const assignment = assignments[kid.id] ?? null
              const surahMeta = assignment ? (surahMetaByNumber[assignment.surah_number] ?? null) : null
              const memorizedCount = assignment ? (memorizedCounts[`${kid.id}:${assignment.surah_number}`] ?? 0) : 0
              const nextSurahNumber = suggestedNextSurah(assignment)
              const suggestedSurahMeta = nextSurahNumber ? (surahMetaByNumber[nextSurahNumber] ?? null) : null
              return (
                <AssignmentStatus
                  key={kid.id}
                  kid={kid}
                  assignment={assignment}
                  surahMeta={surahMeta}
                  suggestedSurahMeta={suggestedSurahMeta}
                  memorizedCount={memorizedCount}
                  onAssign={() => setAssigningKid(kid)}
                  onMarkCompleted={() => setMarkingCompletedKid(kid)}
                />
              )
            })}
          </ul>
        )}
      </section>

      {assigningKid &&
        (() => {
          const assignment = assignments[assigningKid.id] ?? null
          const isMastered = assignment?.status === 'mastered'
          const nextSurahNumber = suggestedNextSurah(assignment)
          const initialSurahNumber = isMastered ? (nextSurahNumber ?? undefined) : assignment?.surah_number
          return (
            <SurahPicker
              initialSurahNumber={initialSurahNumber}
              isSuggestion={isMastered && nextSurahNumber !== null}
              onAssign={handleAssign}
              onClose={() => setAssigningKid(null)}
            />
          )
        })()}

      {markingCompletedKid && (
        <MarkCompletedSurahs
          kidId={markingCompletedKid.id}
          onConfirm={handleMarkCompleted}
          onClose={() => setMarkingCompletedKid(null)}
        />
      )}

      {user && !hasCustomName(user) && <WelcomeNamePrompt suggestedName={getDisplayName(user)} />}
    </div>
  )
}
