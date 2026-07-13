import type { TextSize } from '../types/database'
import { TEXT_SIZES } from '../lib/textSize'

interface FontSizePickerProps {
  value: TextSize
  onChange: (size: TextSize) => void
}

const SIZES = Object.keys(TEXT_SIZES) as TextSize[]

export function FontSizePicker({ value, onChange }: FontSizePickerProps) {
  return (
    <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm font-semibold">
      {SIZES.map((size) => (
        <button
          key={size}
          type="button"
          onClick={() => onChange(size)}
          aria-pressed={value === size}
          className={`rounded-full px-4 py-1.5 transition ${
            value === size ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          {TEXT_SIZES[size].label}
        </button>
      ))}
    </div>
  )
}
