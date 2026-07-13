import { Star } from 'lucide-react'
import type { Theme } from '../../lib/themes'

interface StarsChipProps {
  stars: number
  theme: Theme
}

// Keyed by value so the existing animate-pop class replays on every
// increment — stars animate in immediately per spec §7, no new animation
// needed for this.
export function StarsChip({ stars, theme }: StarsChipProps) {
  return (
    <div
      key={stars}
      className={`animate-pop flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold shadow-sm ${theme.cardBg} ${theme.heading}`}
    >
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
      {stars}
    </div>
  )
}
