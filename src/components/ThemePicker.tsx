import { Lock, Sparkle } from 'lucide-react'
import { THEMES } from '../lib/themes'

interface ThemePickerProps {
  value: string
  onChange: (id: string) => void
  // Omitted = every theme is open, exactly today's behavior. Provided
  // (KidHome's usage) = anything not in the set renders locked, since
  // reward-only themes are gated behind milestone badges.
  unlockedIds?: Set<string>
  // Just-unlocked, never-picked-yet themes — gets a small pulsing "new"
  // badge so discovering a freshly-unlocked reward is its own little moment,
  // not just a silently-available option. Clears once the kid taps it.
  newIds?: Set<string>
  // Which theme ids to render, and in what order. Omitted = every theme,
  // catalog order. KidForm passes just the specific kid's own unlocked ids
  // (newest-unlocked first) so a parent never picks something that kid
  // hasn't actually earned — including rewards a *different* kid unlocked.
  visibleIds?: string[]
}

export function ThemePicker({ value, onChange, unlockedIds, newIds, visibleIds }: ThemePickerProps) {
  const byId = new Map(THEMES.map((t) => [t.id, t]))
  const ids = visibleIds ?? THEMES.map((t) => t.id)
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {ids.map((id) => {
        const theme = byId.get(id)
        if (!theme) return null
        const locked = unlockedIds ? !unlockedIds.has(theme.id) : false
        const isNew = !locked && newIds?.has(theme.id)
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => !locked && onChange(theme.id)}
            disabled={locked}
            aria-pressed={value === theme.id}
            className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition active:scale-90 ${
              value === theme.id ? 'animate-pop border-emerald-600' : isNew ? 'animate-pop border-amber-400 ring-2 ring-amber-200' : 'border-transparent'
            } ${locked ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {locked ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200">
                <Lock className="h-4 w-4 text-slate-400" />
              </span>
            ) : (
              <span className={`h-8 w-8 rounded-full ${theme.swatch}`} />
            )}
            <span className="text-xs text-slate-600">{locked ? 'Locked' : theme.label}</span>
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
