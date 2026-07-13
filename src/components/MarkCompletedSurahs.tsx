import { useEffect, useState } from 'react'
import { Search, Check, Lock } from 'lucide-react'
import { fetchSurahList } from '../lib/quran'
import { getMasteredSurahNumbers } from '../lib/memorization'
import type { ApiSurahMeta } from '../types/database'
import { playTap, playSuccess, playError } from '../lib/sounds'

interface MarkCompletedSurahsProps {
  kidId: string
  onConfirm: (surahs: ApiSurahMeta[]) => Promise<void>
  onClose: () => void
}

// For a kid who already memorized surahs before using the app — lets a
// parent select several at once and backfill them as mastered, rather than
// going through the practice flow one ayah at a time.
export function MarkCompletedSurahs({ kidId, onConfirm, onClose }: MarkCompletedSurahsProps) {
  const [surahs, setSurahs] = useState<ApiSurahMeta[] | null>(null)
  const [alreadyCompleted, setAlreadyCompleted] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Map<number, ApiSurahMeta>>(new Map())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchSurahList(), getMasteredSurahNumbers(kidId)])
      .then(([list, masteredNumbers]) => {
        if (cancelled) return
        setSurahs(list)
        const masteredSet = new Set(masteredNumbers)
        setAlreadyCompleted(masteredSet)
        // Pre-check surahs already marked complete, so the dialog reflects
        // current state instead of asking the parent to re-select them.
        const byNumber = new Map(list.map((s) => [s.number, s]))
        const preChecked = new Map<number, ApiSurahMeta>()
        for (const n of masteredNumbers) {
          const s = byNumber.get(n)
          if (s) preChecked.set(n, s)
        }
        setSelected(preChecked)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [kidId])

  const filtered = surahs?.filter((s) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      s.englishName.toLowerCase().includes(q) ||
      s.englishNameTranslation.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      String(s.number).includes(q)
    )
  })

  function toggle(s: ApiSurahMeta) {
    // Already-completed surahs are locked, not toggleable — this dialog only
    // adds new completions, it doesn't un-mark existing ones (that's a more
    // destructive action this UI isn't meant for).
    if (alreadyCompleted.has(s.number)) return
    playTap()
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(s.number)) next.delete(s.number)
      else next.set(s.number, s)
      return next
    })
  }

  async function handleConfirm() {
    // Only the newly-selected ones need writing — already-completed surahs
    // are already correct in the DB (markSurahAlreadyCompleted is also
    // idempotent regardless, as defense in depth).
    const newlySelected = Array.from(selected.values()).filter((s) => !alreadyCompleted.has(s.number))
    if (newlySelected.length === 0) {
      onClose()
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm(newlySelected)
      playSuccess()
      onClose()
    } catch (err) {
      playError()
      setError((err as Error).message)
      setSubmitting(false)
    }
  }

  const newCount = Array.from(selected.keys()).filter((n) => !alreadyCompleted.has(n)).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="animate-pop flex w-full max-w-sm flex-col items-center rounded-2xl bg-white p-6 text-center shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-semibold text-slate-800">Mark surahs as already completed</h2>
        <p className="mb-4 text-sm text-slate-500">For progress from before this app — select all that apply.</p>

        <div className="relative mb-3 w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or meaning…"
            className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900"
            autoFocus
          />
        </div>

        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

        {surahs === null ? (
          <p className="text-sm text-slate-400">Loading surahs…</p>
        ) : (
          <div className="flex max-h-72 w-full flex-col gap-1 overflow-y-auto">
            {filtered?.length === 0 && <p className="p-3 text-sm text-slate-400">No surahs match.</p>}
            {filtered?.map((s) => {
              const isSelected = selected.has(s.number)
              const isLocked = alreadyCompleted.has(s.number)
              return (
                <button
                  key={s.number}
                  type="button"
                  onClick={() => toggle(s)}
                  disabled={isLocked}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-left transition ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                      : 'hover:bg-slate-100'
                  } ${isLocked ? 'opacity-80' : ''}`}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        isSelected ? 'border-white bg-white/20' : 'border-slate-300'
                      }`}
                    >
                      {isLocked ? <Lock className="h-3 w-3" /> : isSelected && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span>
                      {s.number}. {s.englishName}
                      <span className={`block text-xs font-normal ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                        {s.englishNameTranslation}
                      </span>
                    </span>
                  </span>
                  <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                    {s.numberOfAyahs} ayahs
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <div className="mt-4 flex w-full gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : newCount > 0 ? `Mark ${newCount} complete` : 'Done'}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
