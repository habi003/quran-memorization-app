import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { hasPin } from '../lib/pin'
import type { Kid } from '../types/database'
import { KidCard } from '../components/KidCard'
import { LoadingScreen } from '../components/LoadingScreen'
import { ModeToggle } from '../components/ModeToggle'
import { playTap } from '../lib/sounds'

export function ParentDashboard() {
  const navigate = useNavigate()
  const [kids, setKids] = useState<Kid[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadKids = useCallback(async () => {
    const { data, error: fetchError } = await supabase.from('kids').select('*').order('created_at')
    if (fetchError) setError(fetchError.message)
    else setKids((data ?? []) as Kid[])
  }, [])

  useEffect(() => {
    loadKids()
  }, [loadKids])

  function switchToKidMode() {
    // KidPicker locks the parent gate itself once it has actually mounted at
    // /kids — locking here instead would race with this navigation (the
    // context update can be seen by RequireParentUnlock while still matched
    // to /parent, bouncing through the PIN screen before /kids is reached).
    navigate('/kids')
  }

  function goToSettings() {
    playTap()
    navigate('/parent/settings')
  }

  if (kids === null) return <LoadingScreen />

  return (
    <div className="animate-fade-in-up mx-auto flex min-h-screen max-w-2xl flex-col gap-6 bg-slate-50 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="text-2xl font-bold text-slate-800">Parent Dashboard</h1>
        <div className="flex items-center gap-3">
          <ModeToggle mode="parent" onSwitch={switchToKidMode} />
          <button
            type="button"
            onClick={goToSettings}
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 active:scale-90"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {!hasPin() && (
        <div className="rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-800">
          Set a Parent PIN to protect Parent Mode →{' '}
          <button type="button" onClick={goToSettings} className="font-semibold underline">
            Settings
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-700">Kids</h2>
          <button
            type="button"
            onClick={goToSettings}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-200/60"
          >
            <Users className="h-4 w-4" />
            Manage kids
          </button>
        </div>
        {kids.length === 0 ? (
          <p className="text-slate-500">
            No kids yet —{' '}
            <button type="button" onClick={goToSettings} className="underline">
              add one in Settings
            </button>
            .
          </p>
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            {kids.map((kid) => (
              <KidCard key={kid.id} kid={kid} onClick={() => navigate(`/kids/${kid.id}/home`)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
