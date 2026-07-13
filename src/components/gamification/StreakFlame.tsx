import { Flame } from 'lucide-react'
import type { Theme } from '../../lib/themes'

interface StreakFlameProps {
  streak: number
  theme: Theme
}

// Sits at the top of the home screen always, per spec §7. A zero streak
// shows neutral, encouraging copy — never "you broke your streak."
export function StreakFlame({ streak, theme }: StreakFlameProps) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold shadow-sm ${theme.cardBg} ${theme.heading}`}
    >
      <Flame className={`h-4 w-4 ${streak > 0 ? 'text-orange-500' : 'text-slate-300'}`} />
      {streak > 0 ? `${streak}-day streak` : 'Start a streak today!'}
    </div>
  )
}
