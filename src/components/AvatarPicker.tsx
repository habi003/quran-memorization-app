import { Lock, Sparkle } from 'lucide-react'
import { AVATAR_ICONS } from '../lib/avatarIcons'

interface AvatarPickerProps {
  value: string | null
  onChange: (key: string) => void
  // Omitted = every avatar is open, exactly today's behavior. Provided
  // (KidHome's usage) = anything not in the set renders locked, since
  // reward-only avatars are gated behind milestone badges.
  unlockedKeys?: Set<string>
  // Just-unlocked, never-picked-yet avatars — gets a small pulsing "new"
  // badge so discovering a freshly-unlocked reward is its own little moment,
  // not just a silently-available option. Clears once the kid taps it.
  newKeys?: Set<string>
  // Which keys to render, and in what order. Omitted = every avatar, catalog
  // order. KidForm passes just the specific kid's own unlocked keys
  // (newest-unlocked first) so a parent never picks something that kid
  // hasn't actually earned — including rewards a *different* kid unlocked.
  visibleKeys?: string[]
}

export function AvatarPicker({ value, onChange, unlockedKeys, newKeys, visibleKeys }: AvatarPickerProps) {
  const keys = visibleKeys ?? Object.keys(AVATAR_ICONS)
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {keys.map((key) => {
        const Icon = AVATAR_ICONS[key]
        if (!Icon) return null
        const locked = unlockedKeys ? !unlockedKeys.has(key) : false
        const isNew = !locked && newKeys?.has(key)
        return (
          <button
            key={key}
            type="button"
            onClick={() => !locked && onChange(key)}
            disabled={locked}
            aria-label={locked ? `${key} (locked)` : key}
            aria-pressed={value === key}
            className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition active:scale-90 ${
              locked
                ? 'cursor-not-allowed border-transparent bg-slate-100 text-slate-300'
                : value === key
                  ? 'animate-pop border-emerald-600 bg-emerald-50 text-emerald-700'
                  : isNew
                    ? 'animate-pop border-amber-400 bg-amber-50 text-amber-700 ring-2 ring-amber-200'
                    : 'border-transparent bg-slate-100 text-slate-600'
            }`}
          >
            {locked ? <Lock className="h-4 w-4" /> : <Icon className="h-6 w-6" />}
            {isNew && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-white">
                <Sparkle className="h-2.5 w-2.5" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
