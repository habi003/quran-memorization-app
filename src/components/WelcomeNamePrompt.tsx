import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { playSuccess, playError } from '../lib/sounds'

interface WelcomeNamePromptProps {
  suggestedName: string
}

// Shown once, the first time a parent lands on the Dashboard with no
// full_name set in their Supabase Auth user_metadata. Saving (or skipping,
// which just keeps the email-derived suggestion) updates user_metadata,
// which flows back through AuthContext's onAuthStateChange listener — so
// this component doesn't need to signal completion, the parent re-renders
// on its own once `user` updates and this prompt's condition stops matching.
export function WelcomeNamePrompt({ suggestedName }: WelcomeNamePromptProps) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(finalName: string) {
    setSubmitting(true)
    setError(null)
    const { error: updateError } = await supabase.auth.updateUser({ data: { full_name: finalName } })
    setSubmitting(false)
    if (updateError) {
      playError()
      setError(updateError.message)
      return
    }
    playSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="animate-pop w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-lg">
        <h2 className="mb-1 text-lg font-semibold text-slate-800">Welcome!</h2>
        <p className="mb-4 text-sm text-slate-500">What would you like us to call you?</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={suggestedName}
          className="mb-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-center text-slate-900"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) handleSave(name.trim())
          }}
        />

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => handleSave(name.trim() || suggestedName)}
            disabled={submitting}
            className="rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => handleSave(suggestedName)}
            disabled={submitting}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
