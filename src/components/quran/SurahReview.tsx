import { useEffect, useRef, useState } from 'react'
import { Play, Pause, SkipForward, X } from 'lucide-react'
import { fetchSurah } from '../../lib/quran'
import { getMemorizedAyahNumbers, markAyahMemorized } from '../../lib/memorization'
import type { Ayah } from '../../types/database'
import { playTap } from '../../lib/sounds'
import { TEXT_SIZES, type TextSizeScale } from '../../lib/textSize'
import { ProgressDots } from './ProgressDots'

interface SurahReviewProps {
  kidId: string
  reciterEdition: string
  surahNumber: number
  surahName: string
  textSize?: TextSizeScale
  animationsEnabled?: boolean
  onClose: () => void
}

const FADE_MS = 500
const PAUSE_MS = 1000

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// Passive listen-through review for already-memorized ayahs — no
// Listen/Repeat/Recite gating, just an auto-advancing playlist. Bumps
// last_reviewed_at per ayah as it plays, which is what keeps the
// least-recently-reviewed rotation (getSurahsForReview) fair over time.
export function SurahReview({
  kidId,
  reciterEdition,
  surahNumber,
  surahName,
  textSize = TEXT_SIZES.medium,
  animationsEnabled = true,
  onClose,
}: SurahReviewProps) {
  const [ayahs, setAyahs] = useState<Ayah[] | null>(null)
  const [displayIndex, setDisplayIndex] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'out'>('idle')
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchSurah(surahNumber, reciterEdition)
      .then(async (surah) => {
        const memorizedNumbers = await getMemorizedAyahNumbers(kidId, surahNumber)
        if (cancelled) return
        const set = new Set(memorizedNumbers)
        setAyahs(surah.ayahs.filter((a) => set.has(a.numberInSurah)))
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [kidId, surahNumber, reciterEdition])

  // Fades/zooms the current ayah out, swaps content, fades/zooms the next
  // ayah in, then (for auto-advance) waits a beat before playing its audio —
  // so moving between ayahs feels like a deliberate transition, not an
  // instant cut. Sets `.src` and calls `.play()` directly on the element
  // rather than waiting on React's prop-driven re-render, so audio starts
  // reliably right after the pause instead of racing the next render.
  async function advanceTo(nextIndex: number, { pause, autoPlay }: { pause: boolean; autoPlay: boolean }) {
    if (animationsEnabled) {
      setPhase('out')
      await wait(FADE_MS)
    }
    setDisplayIndex(nextIndex)
    setPhase('idle')

    if (pause) await wait(PAUSE_MS)

    if (autoPlay && audioRef.current && ayahs) {
      audioRef.current.src = ayahs[nextIndex].audioUrl
      audioRef.current.play()
      setPlaying(true)
    }
  }

  function handlePlayPause() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play()
      setPlaying(true)
    }
  }

  function handleSkip() {
    if (!ayahs) return
    playTap()
    if (displayIndex + 1 < ayahs.length) {
      advanceTo(displayIndex + 1, { pause: false, autoPlay: playing })
    } else {
      onClose()
    }
  }

  function handleEnded() {
    if (!ayahs) return
    const ayah = ayahs[displayIndex]
    markAyahMemorized(kidId, surahNumber, ayah.numberInSurah).catch(() => {})
    if (displayIndex + 1 < ayahs.length) {
      advanceTo(displayIndex + 1, { pause: true, autoPlay: true })
    } else {
      setPlaying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="animate-pop flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl bg-white p-6 text-center shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex w-full items-center justify-center">
          <p className="text-sm font-semibold text-slate-700">Revising {surahName}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-0 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!error && ayahs === null && <p className="text-sm text-slate-400">Loading…</p>}

        {ayahs?.length === 0 && <p className="text-sm text-slate-500">Nothing to revise here yet.</p>}

        {ayahs && ayahs.length > 0 && (
          <>
            <audio ref={audioRef} src={ayahs[displayIndex].audioUrl} onEnded={handleEnded} />

            <ProgressDots total={ayahs.length} filled={displayIndex} />

            <div
              key={displayIndex}
              className={`flex w-full flex-col items-center justify-center gap-3 ${textSize.minHeight} ${
                animationsEnabled
                  ? `transition-all duration-500 ease-in-out ${
                      phase === 'out' ? 'scale-90 opacity-0' : 'animate-ayah-in scale-100 opacity-100'
                    }`
                  : ''
              }`}
            >
              <p dir="rtl" className={`text-center leading-relaxed text-slate-800 ${textSize.arabic}`}>
                {ayahs[displayIndex].arabic}
              </p>
              <p className={`text-center italic text-slate-500 ${textSize.translit}`}>
                {ayahs[displayIndex].transliteration}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handlePlayPause}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg transition active:scale-90"
              >
                {playing ? <Pause className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7" />}
              </button>
              <button
                type="button"
                onClick={handleSkip}
                aria-label="Skip"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition active:scale-90"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
