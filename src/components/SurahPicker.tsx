import { useEffect, useRef, useState } from 'react'
import { Search, Minus, Plus, ArrowLeft, Sparkles, AlertTriangle } from 'lucide-react'
import { fetchSurahList } from '../lib/quran'
import { getMasteredSurahNumbers, type AyahRange } from '../lib/memorization'
import type { ApiSurahMeta, TargetPeriod } from '../types/database'
import { playTap, playSuccess, playError } from '../lib/sounds'

interface SurahPickerProps {
  kidId: string
  onAssign: (surahNumber: number, target: number, period: TargetPeriod, range?: AyahRange) => Promise<void>
  onClose: () => void
  /** Pre-select this surah instead of showing the search list first. */
  initialSurahNumber?: number
  /** Show a "suggested next surah" banner instead of landing silently. */
  isSuggestion?: boolean
  /** Prefill the pace controls from the kid's current assignment, if any,
   * instead of always resetting to the daily/2 default — makes tweaking an
   * existing assignment's target a one-tap change rather than a redo. */
  initialTarget?: number
  initialPeriod?: TargetPeriod
  /** Prefill an existing custom ayah range, if the current assignment has one. */
  initialStartAyah?: number
  initialEndAyah?: number
}

export function SurahPicker({
  kidId,
  onAssign,
  onClose,
  initialSurahNumber,
  isSuggestion,
  initialTarget,
  initialPeriod,
  initialStartAyah,
  initialEndAyah,
}: SurahPickerProps) {
  const [surahs, setSurahs] = useState<ApiSurahMeta[] | null>(null)
  const [masteredNumbers, setMasteredNumbers] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ApiSurahMeta | null>(null)
  const [target, setTarget] = useState(initialTarget ?? 2)
  const [period, setPeriod] = useState<TargetPeriod>(initialPeriod ?? 'daily')
  const [customRange, setCustomRange] = useState(initialStartAyah != null && initialEndAyah != null)
  const [startAyah, setStartAyah] = useState(initialStartAyah ?? 1)
  const [endAyah, setEndAyah] = useState(initialEndAyah ?? 1)
  const [submitting, setSubmitting] = useState(false)
  const currentRowRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchSurahList(), getMasteredSurahNumbers(kidId)])
      .then(([list, mastered]) => {
        if (cancelled) return
        setSurahs(list)
        setMasteredNumbers(new Set(mastered))
        if (initialSurahNumber) {
          const match = list.find((s) => s.number === initialSurahNumber)
          if (match) {
            setSelected(match)
            setTarget((t) => Math.min(t, match.numberOfAyahs))
            if (initialEndAyah == null) setEndAyah(match.numberOfAyahs)
          }
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
    // Only ever apply the initial selection once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When browsing the list (e.g. after "Browse all surahs"), scroll the
  // currently-assigned surah into view so the parent doesn't have to hunt
  // for it among 114 entries.
  useEffect(() => {
    if (!selected && currentRowRef.current) {
      currentRowRef.current.scrollIntoView({ block: 'center' })
    }
  }, [selected])

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

  function selectSurah(s: ApiSurahMeta) {
    playTap()
    setSelected(s)
    // A surah can have as few as 3 ayahs (e.g. Al-Kawthar) — don't let a
    // target exceed the surah's own length.
    setTarget((t) => Math.min(t, s.numberOfAyahs))
    // A range from a previously-selected surah has no meaning for this one.
    setCustomRange(false)
    setStartAyah(1)
    setEndAyah(s.numberOfAyahs)
  }

  function choosePeriod(p: TargetPeriod) {
    if (p === period) return
    playTap()
    setPeriod(p)
  }

  function toggleCustomRange() {
    if (!selected) return
    playTap()
    setCustomRange((v) => {
      const next = !v
      if (!next) {
        // Turning it off means "whole surah" again.
        setStartAyah(1)
        setEndAyah(selected.numberOfAyahs)
        setTarget((t) => Math.min(t, selected.numberOfAyahs))
      }
      return next
    })
  }

  function changeStartAyah(value: number) {
    if (!selected || Number.isNaN(value)) return
    const clamped = Math.min(Math.max(1, value), endAyah)
    setStartAyah(clamped)
    setTarget((t) => Math.min(t, endAyah - clamped + 1))
  }

  function changeEndAyah(value: number) {
    if (!selected || Number.isNaN(value)) return
    const clamped = Math.min(Math.max(startAyah, value), selected.numberOfAyahs)
    setEndAyah(clamped)
    setTarget((t) => Math.min(t, clamped - startAyah + 1))
  }

  const poolSize = selected ? (customRange ? Math.max(1, endAyah - startAyah + 1) : selected.numberOfAyahs) : 1
  const isReassigningMastered = selected !== null && masteredNumbers.has(selected.number)

  async function handleConfirm() {
    if (!selected) return
    setSubmitting(true)
    setError(null)
    try {
      const range: AyahRange | undefined = customRange ? { startAyah, endAyah } : undefined
      await onAssign(selected.number, target, period, range)
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
          {!selected ? (
            <>
              <h2 className="mb-4 text-lg font-semibold text-slate-800">Assign a surah</h2>
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
                    const isCurrent = s.number === initialSurahNumber
                    return (
                      <button
                        key={s.number}
                        ref={isCurrent ? currentRowRef : undefined}
                        type="button"
                        onClick={() => selectSurah(s)}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-left transition ${
                          isCurrent ? 'bg-emerald-50 ring-1 ring-emerald-300' : 'hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-sm font-medium text-slate-700">
                          {s.number}. {s.englishName}
                          <span className="block text-xs font-normal text-slate-400">{s.englishNameTranslation}</span>
                        </span>
                        <span className="flex flex-col items-end gap-1 text-xs text-slate-400">
                          {isCurrent && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                              Current
                            </span>
                          )}
                          {masteredNumbers.has(s.number) && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500">
                              Completed
                            </span>
                          )}
                          {s.numberOfAyahs} ayahs
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              <button type="button" onClick={onClose} className="mt-4 text-sm text-slate-500">
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="mb-3 flex items-center gap-1 self-start text-sm text-slate-500"
              >
                <ArrowLeft className="h-4 w-4" /> Browse all surahs
              </button>

              {isSuggestion && (
                <div className="mb-3 flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                  <Sparkles className="h-3.5 w-3.5" /> Suggested next surah
                </div>
              )}

              <h2 className="mb-1 text-lg font-semibold text-slate-800">{selected.englishName}</h2>
              <p className="mb-4 text-sm text-slate-500">
                {selected.englishNameTranslation} · {selected.numberOfAyahs} ayahs
              </p>

              {isReassigningMastered && (
                <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-left text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <strong className="font-semibold">Already marked complete.</strong> Reassigning resets this
                    surah's progress — the kid will redo it from scratch.
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={toggleCustomRange}
                className="mb-2 self-start text-sm font-medium text-emerald-700 underline decoration-dotted"
              >
                {customRange ? 'Practicing a custom range' : 'Practice only part of this surah'}
              </button>

              {customRange && (
                <div className="mb-4 flex w-full items-end justify-center gap-3 rounded-xl bg-slate-50 p-3">
                  <label className="flex flex-col items-center gap-1 text-xs font-medium text-slate-500">
                    From ayah
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={endAyah}
                      value={startAyah}
                      onChange={(e) => changeStartAyah(Number(e.target.value))}
                      className="w-16 rounded-lg border border-slate-300 py-1 text-center text-sm text-slate-900"
                    />
                  </label>
                  <span className="pb-1.5 text-slate-400">–</span>
                  <label className="flex flex-col items-center gap-1 text-xs font-medium text-slate-500">
                    To ayah
                    <input
                      type="number"
                      inputMode="numeric"
                      min={startAyah}
                      max={selected.numberOfAyahs}
                      value={endAyah}
                      onChange={(e) => changeEndAyah(Number(e.target.value))}
                      className="w-16 rounded-lg border border-slate-300 py-1 text-center text-sm text-slate-900"
                    />
                  </label>
                </div>
              )}

              <label className="mb-2 block text-sm font-medium text-slate-600">Target pace</label>
              <div className="mb-4 inline-flex rounded-full bg-slate-100 p-1 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => choosePeriod('daily')}
                  className={`rounded-full px-4 py-1.5 transition ${
                    period === 'daily' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => choosePeriod('weekly')}
                  className={`rounded-full px-4 py-1.5 transition ${
                    period === 'weekly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Weekly
                </button>
              </div>

              <label className="mb-2 block text-sm font-medium text-slate-600">
                {period === 'daily' ? 'Ayahs per day' : 'Ayahs per week'}
              </label>
              <div className="mb-6 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setTarget((t) => Math.max(1, t - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition active:scale-90"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-lg font-semibold text-slate-800">{target}</span>
                <button
                  type="button"
                  onClick={() => setTarget((t) => Math.min(poolSize, t + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition active:scale-90"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={submitting}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
                    isReassigningMastered
                      ? 'bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
                      : 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                  }`}
                >
                  {submitting
                    ? 'Assigning…'
                    : isReassigningMastered
                      ? 'Reset progress & reassign'
                      : isSuggestion
                        ? 'Approve & assign'
                        : 'Confirm assignment'}
                </button>
                <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500">
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
