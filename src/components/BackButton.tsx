import { ArrowLeft } from 'lucide-react'
import { playTap } from '../lib/sounds'

interface BackButtonProps {
  onClick: () => void
  label?: string
  className?: string
}

export function BackButton({ onClick, label = 'Back', className = '' }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        playTap()
        onClick()
      }}
      className={`flex items-center gap-1 rounded-full py-1.5 pl-2 pr-3 text-sm font-medium text-slate-600 transition hover:bg-slate-200/70 active:scale-95 ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  )
}
