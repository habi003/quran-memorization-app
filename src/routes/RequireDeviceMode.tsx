import { Navigate, Outlet } from 'react-router-dom'
import { useDeviceMode } from '../context/DeviceModeContext'

export function RequireDeviceMode() {
  const { deviceType } = useDeviceMode()

  if (!deviceType) return <Navigate to="/device-setup" replace />

  return <Outlet />
}
