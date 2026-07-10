import { useState } from 'react'

interface PinPadProps {
  onSubmit: (pin: string) => void
  submitLabel?: string
  error?: string | null
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export function PinPad({ onSubmit, submitLabel = 'Enter', error }: PinPadProps) {
  const [pin, setPin] = useState('')

  function press(digit: string) {
    setPin((p) => (p + digit).slice(0, 8))
  }

  function backspace() {
    setPin((p) => p.slice(0, -1))
  }

  function submit() {
    if (pin.length === 0) return
    onSubmit(pin)
    setPin('')
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-6 items-center justify-center gap-2">
        {pin.length === 0 ? (
          <span className="text-sm text-slate-400">Enter PIN</span>
        ) : (
          Array.from(pin).map((_, i) => <span key={i} className="h-3 w-3 rounded-full bg-slate-700" />)
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        {DIGITS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => press(d)}
            className="h-16 w-16 rounded-full bg-slate-100 text-2xl font-semibold text-slate-800 active:bg-slate-200"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={backspace}
          className="h-16 w-16 rounded-full bg-slate-100 text-lg font-semibold text-slate-800 active:bg-slate-200"
        >
          ⌫
        </button>
        <button
          type="button"
          onClick={() => press('0')}
          className="h-16 w-16 rounded-full bg-slate-100 text-2xl font-semibold text-slate-800 active:bg-slate-200"
        >
          0
        </button>
        <button
          type="button"
          onClick={submit}
          className="h-16 w-16 rounded-full bg-slate-800 text-sm font-semibold text-white active:bg-slate-900"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  )
}
