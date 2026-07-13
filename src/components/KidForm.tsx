import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { AvatarPicker } from './AvatarPicker'
import { ThemePicker } from './ThemePicker'
import { ReciterPicker } from './ReciterPicker'
import { FontSizePicker } from './FontSizePicker'
import { AnimationToggle } from './AnimationToggle'
import { DEFAULT_THEME_ID } from '../lib/themes'
import { assignSurah } from '../lib/memorization'
import { getOrderedAvatarKeys, getOrderedThemeIds, type ClaimedBadge } from '../lib/cosmeticUnlocks'
import { playSuccess, playError, playTap } from '../lib/sounds'
import type { Kid, TextSize } from '../types/database'

interface KidFormProps {
  kid?: Kid
  onDone: () => void
  onCancel?: () => void
}

const TABS = ['Avatar', 'Theme', 'Reciter', 'Settings'] as const
type Tab = (typeof TABS)[number]

// New kids start on Al-Fatiha by default (short, foundational) so they land
// on a real practice screen immediately instead of "No surah assigned yet" —
// the parent can always reassign from the dashboard afterward.
const DEFAULT_FIRST_SURAH = 1
const DEFAULT_FIRST_SURAH_TARGET = 2

export function KidForm({ kid, onDone, onCancel }: KidFormProps) {
  const { user } = useAuth()
  const [name, setName] = useState(kid?.name ?? '')
  const [avatar, setAvatar] = useState<string | null>(kid?.avatar ?? null)
  const [preferredReciter, setPreferredReciter] = useState(kid?.preferred_reciter ?? 'ar.alafasy')
  const [theme, setTheme] = useState(kid?.theme ?? DEFAULT_THEME_ID)
  const [textSize, setTextSize] = useState<TextSize>(kid?.text_size ?? 'medium')
  const [animationsEnabled, setAnimationsEnabled] = useState(kid?.animations_enabled ?? true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('Avatar')
  const [claimedBadges, setClaimedBadges] = useState<ClaimedBadge[]>([])

  // Only offer this specific kid's own unlocked avatars/themes — not every
  // avatar in the catalog, and not what a *different* kid has unlocked. A
  // brand-new kid (no `kid` prop, nothing fetched) just gets the starter set.
  useEffect(() => {
    if (!kid) return
    let cancelled = false
    supabase
      .from('badges')
      .select('badge_key, claimed_at')
      .eq('kid_id', kid.id)
      .then(({ data }) => {
        if (cancelled) return
        setClaimedBadges(
          (data ?? [])
            .filter((b): b is { badge_key: string; claimed_at: string } => Boolean(b.claimed_at))
            .map((b) => ({ badgeKey: b.badge_key, claimedAt: b.claimed_at })),
        )
      })
    return () => {
      cancelled = true
    }
  }, [kid])

  // Newest-unlocked first. The kid's current avatar/theme is always included
  // even if it somehow isn't in the unlocked set, so editing never hides
  // their existing selection.
  const avatarKeys = useMemo(() => {
    const ordered = getOrderedAvatarKeys(claimedBadges)
    return avatar && !ordered.includes(avatar) ? [avatar, ...ordered] : ordered
  }, [claimedBadges, avatar])
  const themeIds = useMemo(() => {
    const ordered = getOrderedThemeIds(claimedBadges)
    return !ordered.includes(theme) ? [theme, ...ordered] : ordered
  }, [claimedBadges, theme])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || !name.trim()) return

    setSubmitting(true)
    setError(null)

    const payload = {
      name: name.trim(),
      avatar,
      preferred_reciter: preferredReciter.trim() || 'ar.alafasy',
      theme,
      text_size: textSize,
      animations_enabled: animationsEnabled,
    }

    if (kid) {
      const { error: dbError } = await supabase.from('kids').update(payload).eq('id', kid.id)
      setSubmitting(false)
      if (dbError) {
        playError()
        setError(dbError.message)
        return
      }
      playSuccess()
      onDone()
      return
    }

    // kids.owner_id has no DB default, and the RLS policy's USING clause
    // doubles as the insert check — omitting owner_id here makes every
    // insert fail against RLS.
    const { data: newKid, error: dbError } = await supabase
      .from('kids')
      .insert({ ...payload, owner_id: user.id })
      .select()
      .single()
    setSubmitting(false)

    if (dbError) {
      playError()
      setError(dbError.message)
      return
    }

    try {
      await assignSurah(newKid.id, DEFAULT_FIRST_SURAH, DEFAULT_FIRST_SURAH_TARGET, 'daily')
    } catch {
      // Not fatal — the kid was created successfully either way, and a
      // parent can assign a surah manually from the dashboard if this fails.
    }

    playSuccess()
    onDone()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-fade-in-up flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm"
    >
      <h3 className="text-lg font-semibold text-slate-800">{kid ? 'Edit kid' : 'Add a kid'}</h3>

      <label className="flex flex-col gap-1 text-sm text-slate-600">
        Name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
        />
      </label>

      <div className="flex justify-center gap-1 rounded-full bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              playTap()
              setTab(t)
            }}
            aria-pressed={tab === t}
            className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold transition ${
              tab === t ? 'bg-emerald-600 text-white' : 'text-slate-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="max-h-[45vh] overflow-y-auto py-1">
        {tab === 'Avatar' && (
          <div className="flex flex-col items-center gap-2 text-sm text-slate-600">
            <AvatarPicker value={avatar} visibleKeys={avatarKeys} onChange={setAvatar} />
          </div>
        )}

        {tab === 'Theme' && (
          <div className="flex flex-col items-center gap-2 text-sm text-slate-600">
            <ThemePicker value={theme} visibleIds={themeIds} onChange={setTheme} />
          </div>
        )}

        {tab === 'Reciter' && (
          <div className="flex flex-col gap-2 text-sm text-slate-600">
            <ReciterPicker value={preferredReciter} onChange={setPreferredReciter} />
          </div>
        )}

        {tab === 'Settings' && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-2 text-sm text-slate-600">
              Text size
              <FontSizePicker value={textSize} onChange={setTextSize} />
            </div>
            <div className="flex flex-col items-center gap-2 text-sm text-slate-600">
              Animations
              <AnimationToggle value={animationsEnabled} onChange={setAnimationsEnabled} />
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="mt-2 flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2 font-semibold text-white transition hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : kid ? 'Save changes' : 'Add kid'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 font-semibold text-slate-500">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
