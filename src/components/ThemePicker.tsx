import { THEMES } from '../lib/themes'

interface ThemePickerProps {
  value: string
  onChange: (id: string) => void
}

export function ThemePicker({ value, onChange }: ThemePickerProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {THEMES.map((theme) => (
        <button
          key={theme.id}
          type="button"
          onClick={() => onChange(theme.id)}
          aria-pressed={value === theme.id}
          className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition active:scale-90 ${
            value === theme.id ? 'animate-pop border-emerald-600' : 'border-transparent'
          }`}
        >
          <span className={`h-8 w-8 rounded-full ${theme.swatch}`} />
          <span className="text-xs text-slate-600">{theme.label}</span>
        </button>
      ))}
    </div>
  )
}
