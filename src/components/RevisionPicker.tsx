import { useEffect, useState } from 'react'
import { Search, Check } from 'lucide-react'
import { fetchSurahList } from '../lib/quran'
import { getMasteredSurahNumbers } from '../lib/memorization'
import type { ApiSurahMeta } from '../types/database'
import { playTap, playSuccess, playError } from '../lib/sounds'

interface RevisionPickerProps {
  kidId: string
  onConfirm: (surahNumbers: number[]) => Promise<void>
  onClose: () => void
}

// Lets a parent pick which already-mastered surah(s) should surface in the
// kid's "Time to revise!" list — either to reassign one that needs revising
// again for any reason, or to choose this week's revision surah instead of
// leaving it to the automatic least-recently-reviewed rotation. Only lists
// mastered surahs (you can't prioritize revision of something not yet
// memorized) — pattern otherwise mirrors MarkCompletedSurahs.
export function RevisionPicker({ kidId, onConfirm, onClose }: RevisionPickerProps) {
  const [surahs, setSurahs] = useState<ApiSurahMeta[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchSurahList(), getMasteredSurahNumbers(kidId)])
      .then(([list, masteredNumbers]) => {
        if (cancelled) return
        const masteredSet = new Set(masteredNumbers)
        setSurahs(list.filter((s) => masteredSet.has(s.number)))
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
    playTap()
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(s.number)) next.delete(s.number)
      else next.add(s.number)
      return next
    })
  }

  async function handleConfirm() {
    if (selected.size === 0) {
      onClose()
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm(Array.from(selected))
      playSuccess()
      onClose()
    } catch (err) {
      playError()
      setError((err as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-8" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center">
        <div
          className="animate-pop flex w-full max-w-sm flex-col items-center rounded-2xl bg-white p-6 text-center shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="mb-1 text-lg font-semibold text-slate-800">Pick a surah to revise</h2>
          <p className="mb-4 text-sm text-slate-500">
            Prioritize a completed surah in "Time to revise!" — leave nothing selected to keep the usual rotation.
          </p>

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
          ) : surahs.length === 0 ? (
            <p className="p-3 text-sm text-slate-400">No completed surahs yet.</p>
          ) : (
            <div className="flex max-h-72 w-full flex-col gap-1 overflow-y-auto">
              {filtered?.length === 0 && <p className="p-3 text-sm text-slate-400">No surahs match.</p>}
              {filtered?.map((s) => {
                const isSelected = selected.has(s.number)
                return (
                  <button
                    key={s.number}
                    type="button"
                    onClick={() => toggle(s)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-left transition ${
                      isSelected ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white' : 'hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          isSelected ? 'border-white bg-white/20' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
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
              {submitting ? 'Saving…' : selected.size > 0 ? `Prioritize ${selected.size}` : 'Cancel'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
