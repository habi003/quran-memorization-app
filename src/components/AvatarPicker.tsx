import { AVATAR_ICONS } from '../lib/avatarIcons'

interface AvatarPickerProps {
  value: string | null
  onChange: (key: string) => void
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {Object.entries(AVATAR_ICONS).map(([key, Icon]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-label={key}
          aria-pressed={value === key}
          className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition active:scale-90 ${
            value === key
              ? 'animate-pop border-emerald-600 bg-emerald-50 text-emerald-700'
              : 'border-transparent bg-slate-100 text-slate-600'
          }`}
        >
          <Icon className="h-6 w-6" />
        </button>
      ))}
    </div>
  )
}
