import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, type Location } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { LoadingScreen } from '../components/LoadingScreen'
import { playError } from '../lib/sounds'

export function SignIn() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return <LoadingScreen />
  if (session) {
    const from = (location.state as { from?: Location })?.from
    return <Navigate to={from?.pathname ?? '/'} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    setSubmitting(false)
    if (signInError) {
      playError()
      setError(signInError.message)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="animate-fade-in-up flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-8 shadow-md"
      >
        <h1 className="text-2xl font-bold text-slate-800">Family Sign In</h1>

        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
