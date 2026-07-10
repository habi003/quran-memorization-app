import { useState } from 'react'
import { useLocation, useNavigate, type Location } from 'react-router-dom'
import { verifyPin } from '../lib/pin'
import { useParentGate } from '../context/ParentGateContext'
import { PinPad } from '../components/PinPad'
import { BackButton } from '../components/BackButton'
import { playSuccess, playError } from '../lib/sounds'

export function ParentUnlock() {
  const { unlock } = useParentGate()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(pin: string) {
    const ok = await verifyPin(pin)
    if (!ok) {
      playError()
      setError("That's not it — try again")
      return
    }

    playSuccess()
    setError(null)
    unlock()
    const from = (location.state as { from?: Location })?.from
    navigate(from?.pathname ?? '/parent', { replace: true })
  }

  return (
    <div className="animate-fade-in-up relative flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4">
      {/* Escape hatch for a kid who tapped Parent Mode by mistake — they
          don't know the PIN, so they must be able to leave without one. */}
      <div className="absolute left-4 top-4">
        <BackButton onClick={() => navigate('/kids')} label="Back to profiles" />
      </div>
      <h1 className="text-2xl font-bold text-slate-800">Enter Parent PIN</h1>
      <PinPad onSubmit={handleSubmit} submitLabel="Unlock" error={error} />
    </div>
  )
}
