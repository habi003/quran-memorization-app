import { createContext, useContext, useState, type ReactNode } from 'react'
import {
  clearDeviceType as clearStoredDeviceType,
  getDeviceType,
  setDeviceType as persistDeviceType,
  type DeviceType,
} from '../lib/deviceMode'

interface DeviceModeContextValue {
  deviceType: DeviceType | null
  setDeviceType: (type: DeviceType) => void
  clearDeviceType: () => void
}

const DeviceModeContext = createContext<DeviceModeContextValue | undefined>(undefined)

export function DeviceModeProvider({ children }: { children: ReactNode }) {
  const [deviceType, setDeviceTypeState] = useState<DeviceType | null>(() => getDeviceType())

  function setDeviceType(type: DeviceType) {
    persistDeviceType(type)
    setDeviceTypeState(type)
  }

  function clearDeviceType() {
    clearStoredDeviceType()
    setDeviceTypeState(null)
  }

  return (
    <DeviceModeContext.Provider value={{ deviceType, setDeviceType, clearDeviceType }}>
      {children}
    </DeviceModeContext.Provider>
  )
}

export function useDeviceMode() {
  const ctx = useContext(DeviceModeContext)
  if (!ctx) throw new Error('useDeviceMode must be used within DeviceModeProvider')
  return ctx
}
