import { useRef, useState } from 'react'
import { Play, Pause, ArrowRight, Eye, EyeOff, CheckCircle, RotateCcw } from 'lucide-react'
import type { Ayah } from '../../types/database'
import { playTap, playSuccess } from '../../lib/sounds'
import { TEXT_SIZES, type TextSizeScale } from '../../lib/textSize'
import { ProgressDots } from './ProgressDots'

interface MemorizationFlowProps {
  ayah: Ayah
  onGotIt: () => void
  textSize?: TextSizeScale
}

type Step = 'listen' | 'repeat' | 'recite'

// Keyed by ayah.number from the caller so this state cleanly resets when
// advancing to the next ayah (same trick as `KidForm key={editingKid.id}`).
export function MemorizationFlow({ ayah, onGotIt, textSize = TEXT_SIZES.medium }: MemorizationFlowProps) {
  const [step, setStep] = useState<Step>('listen')
  const [repeatCount, setRepeatCount] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [loopedBack, setLoopedBack] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function handlePlay() {
    // Called directly from the click handler (not after an await) so this
    // satisfies iOS's user-gesture requirement for audio playback.
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    audio.play()
    setPlaying(true)
    if (step === 'repeat') setRepeatCount((c) => Math.min(3, c + 1))
  }

  function goToRepeat() {
    playTap()
    setStep('repeat')
  }

  function goToRecite() {
    playTap()
    setLoopedBack(false)
    setStep('recite')
  }

  function handleNeedMorePractice() {
    playTap()
    setStep('repeat')
    setRepeatCount(0)
    setRevealed(false)
    setLoopedBack(true)
  }

  function handleGotIt() {
    playSuccess()
    onGotIt()
  }

  const playButton = (
    <button
      type="button"
      onClick={handlePlay}
      aria-label={playing ? 'Playing' : 'Play'}
      className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg transition active:scale-90"
    >
      {playing ? <Pause className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7" />}
    </button>
  )

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <audio ref={audioRef} src={ayah.audioUrl} preload="none" onEnded={() => setPlaying(false)} />

      {(step === 'listen' || step === 'repeat') && (
        <div key={step} className="animate-fade-in-up flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 shadow-sm">
            <p dir="rtl" className={`text-center leading-relaxed text-slate-800 ${textSize.arabic}`}>
              {ayah.arabic}
            </p>
            <p className={`text-center italic text-slate-500 ${textSize.translit}`}>{ayah.transliteration}</p>
          </div>

          {playButton}

          {step === 'listen' ? (
            <button
              type="button"
              onClick={goToRepeat}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-2.5 font-semibold text-white transition hover:from-emerald-600 hover:to-emerald-700 active:scale-95"
            >
              Repeat with me <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <>
              <ProgressDots total={3} filled={repeatCount} />
              {loopedBack && <p className="text-sm font-medium text-amber-600">Let's try that again!</p>}
              <button
                type="button"
                onClick={goToRecite}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-2.5 font-semibold text-white transition hover:from-emerald-600 hover:to-emerald-700 active:scale-95"
              >
                Recite alone <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )}

      {step === 'recite' && (
        <div className="animate-fade-in-up flex flex-col items-center gap-6">
          <div
            className={`flex flex-col items-center gap-3 rounded-2xl bg-white p-6 shadow-sm transition-[filter] duration-300 ${
              revealed ? '' : 'select-none blur-md'
            }`}
          >
            <p dir="rtl" className={`text-center leading-relaxed text-slate-800 ${textSize.arabic}`}>
              {ayah.arabic}
            </p>
            <p className={`text-center italic text-slate-500 ${textSize.translit}`}>{ayah.transliteration}</p>
          </div>

          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            className="flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200 active:scale-95"
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {revealed ? 'Hide' : 'Show me'}
          </button>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleGotIt}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-2.5 font-semibold text-white transition hover:from-emerald-600 hover:to-emerald-700 active:scale-95"
            >
              <CheckCircle className="h-4 w-4" /> I got it!
            </button>
            <button
              type="button"
              onClick={handleNeedMorePractice}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-5 py-2.5 font-medium text-slate-600 transition hover:bg-slate-200 active:scale-95"
            >
              <RotateCcw className="h-4 w-4" /> Need more practice
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
