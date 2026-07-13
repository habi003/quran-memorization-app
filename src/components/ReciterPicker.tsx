import { useEffect, useRef, useState } from 'react'
import { Search, Play, Pause, Check } from 'lucide-react'
import { fetchReciters, buildAudioUrl } from '../lib/quran'
import type { ApiReciter } from '../types/database'
import { playTap } from '../lib/sounds'

interface ReciterPickerProps {
  value: string
  onChange: (identifier: string) => void
}

export function ReciterPicker({ value, onChange }: ReciterPickerProps) {
  const [reciters, setReciters] = useState<ApiReciter[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [previewing, setPreviewing] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchReciters()
      .then((list) => {
        if (!cancelled) setReciters(list)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  function preview(identifier: string) {
    if (previewing === identifier) {
      audioRef.current?.pause()
      setPreviewing(null)
      return
    }

    if (!audioRef.current) audioRef.current = new Audio()
    const audio = audioRef.current
    // Ayah 1 is always Al-Fatiha 1:1 (global ayah number 1) — no API fetch
    // needed, just the CDN pattern, so comparing reciters stays instant.
    audio.src = buildAudioUrl(identifier, 1)
    audio.play()
    audio.onended = () => setPreviewing(null)
    setPreviewing(identifier)
  }

  const filtered = reciters?.filter((r) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return r.englishName.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
  })

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reciters…"
          className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {reciters === null ? (
        <p className="text-sm text-slate-400">Loading reciters…</p>
      ) : (
        <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-xl border border-slate-100 p-1">
          {filtered?.length === 0 && <p className="p-3 text-sm text-slate-400">No reciters match.</p>}
          {filtered?.map((r) => {
            const selected = value === r.identifier
            const isPreviewing = previewing === r.identifier
            return (
              <div
                key={r.identifier}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 transition ${
                  selected ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white' : 'hover:bg-slate-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => preview(r.identifier)}
                  aria-label={isPreviewing ? `Stop preview of ${r.englishName}` : `Preview ${r.englishName}`}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition active:scale-90 ${
                    selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isPreviewing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playTap()
                    onChange(r.identifier)
                  }}
                  className="flex flex-1 items-center justify-between text-left"
                >
                  <span className={`text-sm font-medium ${selected ? 'text-white' : 'text-slate-700'}`}>
                    {r.englishName}
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
