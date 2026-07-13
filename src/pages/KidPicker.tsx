import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { fetchReciters } from '../lib/quran'
import type { Kid } from '../types/database'
import { KidCard } from '../components/KidCard'
import { LoadingScreen } from '../components/LoadingScreen'
import { useParentGate } from '../context/ParentGateContext'

export function KidPicker() {
  const navigate = useNavigate()
  const { lock } = useParentGate()
  const [kids, setKids] = useState<Kid[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reciterNames, setReciterNames] = useState<Record<string, string>>({})

  useEffect(() => {
    // Entering Kid Mode always re-locks Parent Mode for the rest of this
    // session, regardless of device type.
    lock()
  }, [lock])

  useEffect(() => {
    fetchReciters()
      .then((list) => {
        setReciterNames(Object.fromEntries(list.map((r) => [r.identifier, r.englishName])))
      })
      .catch(() => {
        // Reciter names are a display nicety — fine to just show nothing.
      })
  }, [])

  useEffect(() => {
    let cancelled = false

    // RLS scopes this to the signed-in owner automatically — no manual filter needed.
    supabase
      .from('kids')
      .select('*')
      .order('created_at')
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError) setError(fetchError.message)
        else setKids((data ?? []) as Kid[])
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (kids === null) return <LoadingScreen />

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-slate-50 px-4 py-12">
      <h1 className="animate-fade-in-up text-3xl font-bold text-slate-800">Who's practicing today?</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {kids.length === 0 ? (
        <p className="text-slate-500">No kid profiles yet — ask a parent to add one in Parent Mode.</p>
      ) : (
        <div className="flex flex-wrap justify-center gap-6">
          {kids.map((kid) => (
            <KidCard
              key={kid.id}
              kid={kid}
              onClick={() => navigate(`/kids/${kid.id}/home`)}
              reciterName={reciterNames[kid.preferred_reciter]}
            />
          ))}
        </div>
      )}

      {/* Deliberately small and muted, not a prominent control — this shouldn't
          tempt a kid to tap it. The PIN gate is the real protection either way. */}
      <button
        type="button"
        onClick={() => navigate('/parent')}
        aria-label="Parent Mode"
        className="mt-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-slate-200/60 hover:text-slate-500 active:scale-90"
      >
        <Settings className="h-4 w-4" />
      </button>
    </div>
  )
}
