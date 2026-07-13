interface AnimationToggleProps {
  value: boolean
  onChange: (enabled: boolean) => void
}

export function AnimationToggle({ value, onChange }: AnimationToggleProps) {
  return (
    <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm font-semibold">
      <button
        type="button"
        onClick={() => onChange(true)}
        aria-pressed={value}
        className={`rounded-full px-4 py-1.5 transition ${
          value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
        }`}
      >
        On
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        aria-pressed={!value}
        className={`rounded-full px-4 py-1.5 transition ${
          !value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
        }`}
      >
        Off
      </button>
    </div>
  )
}
