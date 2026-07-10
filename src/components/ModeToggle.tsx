import { playTap } from '../lib/sounds'

interface ModeToggleProps {
  mode: 'kid' | 'parent'
  onSwitch: () => void
}

export function ModeToggle({ mode, onSwitch }: ModeToggleProps) {
  function handleClick(target: 'kid' | 'parent') {
    if (target === mode) return
    playTap()
    onSwitch()
  }

  return (
    <div className="inline-flex rounded-full bg-slate-200 p-1 text-sm font-semibold">
      <button
        type="button"
        onClick={() => handleClick('kid')}
        aria-pressed={mode === 'kid'}
        className={`rounded-full px-4 py-1.5 transition ${
          mode === 'kid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
        }`}
      >
        Kid Mode
      </button>
      <button
        type="button"
        onClick={() => handleClick('parent')}
        aria-pressed={mode === 'parent'}
        className={`rounded-full px-4 py-1.5 transition ${
          mode === 'parent' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
        }`}
      >
        Parent Mode
      </button>
    </div>
  )
}
