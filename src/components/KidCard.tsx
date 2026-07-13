import type { Kid } from '../types/database'
import { AVATAR_ICONS } from '../lib/avatarIcons'
import { getTheme } from '../lib/themes'
import { playTap } from '../lib/sounds'

interface KidCardProps {
  kid: Kid
  onClick?: () => void
  reciterName?: string
}

export function KidCard({ kid, onClick, reciterName }: KidCardProps) {
  const initials = kid.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const Icon = kid.avatar ? AVATAR_ICONS[kid.avatar] : undefined
  const theme = getTheme(kid.theme)

  return (
    <button
      type="button"
      onClick={() => {
        playTap()
        onClick?.()
      }}
      className="animate-fade-in-up flex w-40 flex-col items-center gap-2 rounded-3xl bg-white p-6 shadow-md transition active:scale-95"
    >
      <div
        className={`flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white ${theme.accentBg}`}
      >
        {Icon ? <Icon className="h-12 w-12" /> : (initials || '?')}
      </div>
      <span className="text-xl font-semibold text-slate-800">{kid.name}</span>
      {reciterName && <span className="text-xs text-slate-400">{reciterName}</span>}
    </button>
  )
}
