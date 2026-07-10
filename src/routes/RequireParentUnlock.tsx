import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { hasPin } from '../lib/pin'
import { useParentGate } from '../context/ParentGateContext'

// No PIN has ever been set -> nothing to gate behind yet, let the parent in.
export function RequireParentUnlock() {
  const { unlocked } = useParentGate()
  const location = useLocation()

  if (!hasPin()) return <Outlet />
  if (!unlocked) return <Navigate to="/parent/unlock" state={{ from: location }} replace />

  return <Outlet />
}
