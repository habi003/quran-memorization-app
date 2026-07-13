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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-emerald-50 via-white to-white px-4">
      <div className="animate-fade-in-up flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <img src="/favicon.svg" alt="" className="h-20 w-20 rounded-2xl shadow-lg shadow-emerald-900/10" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Little Hafiz</h1>
            <p className="text-sm text-slate-500">Daily Quran memorization for your family</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4 rounded-2xl bg-white p-8 shadow-md">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Sign in to continue</h2>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
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
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
