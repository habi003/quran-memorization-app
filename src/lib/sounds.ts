// Simple procedural sound effects (Web Audio oscillators) — no audio files
// to source or license. iOS requires a user gesture before any audio can
// play, so the AudioContext is created lazily on first use (always called
// from a click/tap handler) rather than at module load.
let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return null
    ctx = new AudioContextClass()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

interface ToneOptions {
  frequency: number
  duration: number
  type?: OscillatorType
  delay?: number
  volume?: number
}

function playTone({ frequency, duration, type = 'sine', delay = 0, volume = 0.15 }: ToneOptions) {
  const audioCtx = getContext()
  if (!audioCtx) return

  const startTime = audioCtx.currentTime + delay
  const oscillator = audioCtx.createOscillator()
  const gain = audioCtx.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startTime)

  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

  oscillator.connect(gain)
  gain.connect(audioCtx.destination)

  oscillator.start(startTime)
  oscillator.stop(startTime + duration)
}

export function playTap() {
  playTone({ frequency: 480, duration: 0.08, type: 'sine', volume: 0.1 })
}

export function playSuccess() {
  playTone({ frequency: 523.25, duration: 0.14, type: 'sine' }) // C5
  playTone({ frequency: 659.25, duration: 0.18, delay: 0.08, type: 'sine' }) // E5
  playTone({ frequency: 783.99, duration: 0.22, delay: 0.16, type: 'sine' }) // G5
}

export function playError() {
  playTone({ frequency: 220, duration: 0.18, type: 'sine', volume: 0.12 })
  playTone({ frequency: 196, duration: 0.22, delay: 0.1, type: 'sine', volume: 0.12 })
}

// Reserved for the rarer badge-unlock moment — a longer, brighter arpeggio
// than playSuccess's 3-note one, since "I got it!" already plays playSuccess
// for the everyday interaction feedback.
export function playBadgeUnlock() {
  playTone({ frequency: 523.25, duration: 0.16, delay: 0, type: 'sine', volume: 0.18 }) // C5
  playTone({ frequency: 659.25, duration: 0.16, delay: 0.1, type: 'sine', volume: 0.18 }) // E5
  playTone({ frequency: 783.99, duration: 0.16, delay: 0.2, type: 'sine', volume: 0.18 }) // G5
  playTone({ frequency: 1046.5, duration: 0.3, delay: 0.3, type: 'sine', volume: 0.2 }) // C6
}
