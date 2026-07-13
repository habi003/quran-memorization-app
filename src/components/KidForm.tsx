import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { AvatarPicker } from './AvatarPicker'
import { ThemePicker } from './ThemePicker'
import { ReciterPicker } from './ReciterPicker'
import { FontSizePicker } from './FontSizePicker'
import { AnimationToggle } from './AnimationToggle'
import { DEFAULT_THEME_ID } from '../lib/themes'
import { playSuccess, playError } from '../lib/sounds'
import type { Kid, TextSize } from '../types/database'

interface KidFormProps {
  kid?: Kid
  onDone: () => void
  onCancel?: () => void
}

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

    const { error: dbError } = kid
      ? await supabase.from('kids').update(payload).eq('id', kid.id)
      : // kids.owner_id has no DB default, and the RLS policy's USING clause
        // doubles as the insert check — omitting owner_id here makes every
        // insert fail against RLS.
        await supabase.from('kids').insert({ ...payload, owner_id: user.id })

    setSubmitting(false)

    if (dbError) {
      playError()
      setError(dbError.message)
      return
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

      <div className="flex flex-col gap-2 text-sm text-slate-600">
        Avatar
        <AvatarPicker value={avatar} onChange={setAvatar} />
      </div>

      <div className="flex flex-col gap-2 text-sm text-slate-600">
        Theme
        <ThemePicker value={theme} onChange={setTheme} />
      </div>

      <div className="flex flex-col gap-2 text-sm text-slate-600">
        Preferred reciter
        <ReciterPicker value={preferredReciter} onChange={setPreferredReciter} />
      </div>

      <div className="flex flex-col gap-2 text-sm text-slate-600">
        Text size
        <FontSizePicker value={textSize} onChange={setTextSize} />
      </div>

      <div className="flex flex-col gap-2 text-sm text-slate-600">
        Animations
        <AnimationToggle value={animationsEnabled} onChange={setAnimationsEnabled} />
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
