import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useDeviceMode } from './DeviceModeContext'

interface ParentGateContextValue {
  unlocked: boolean
  unlock: () => void
  lock: () => void
}

const ParentGateContext = createContext<ParentGateContextValue | undefined>(undefined)

// A parent's own device should land straight on the dashboard with no PIN
// prompt (spec §5), but once this session has visited Kid Mode, switching
// back to Parent Mode always requires the PIN — regardless of device type.
export function ParentGateProvider({ children }: { children: ReactNode }) {
  const { deviceType } = useDeviceMode()
  const [unlocked, setUnlocked] = useState(false)
  const [visitedKidMode, setVisitedKidMode] = useState(false)

  useEffect(() => {
    if (deviceType === 'parent' && !visitedKidMode) {
      setUnlocked(true)
    }
  }, [deviceType, visitedKidMode])

  // Stable references so effects that depend on them (e.g. KidPicker locking
  // on mount) don't re-run on every ParentGateProvider render.
  const lock = useCallback(() => {
    setVisitedKidMode(true)
    setUnlocked(false)
  }, [])

  const unlock = useCallback(() => {
    setUnlocked(true)
  }, [])

  return (
    <ParentGateContext.Provider value={{ unlocked, unlock, lock }}>
      {children}
    </ParentGateContext.Provider>
  )
}

export function useParentGate() {
  const ctx = useContext(ParentGateContext)
  if (!ctx) throw new Error('useParentGate must be used within ParentGateProvider')
  return ctx
}
