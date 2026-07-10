import { Navigate, Route, Routes } from 'react-router-dom'
import { useDeviceMode } from '../context/DeviceModeContext'
import { RequireAuth } from './RequireAuth'
import { RequireDeviceMode } from './RequireDeviceMode'
import { RequireParentUnlock } from './RequireParentUnlock'
import { SignIn } from '../pages/SignIn'
import { DeviceSetup } from '../pages/DeviceSetup'
import { KidPicker } from '../pages/KidPicker'
import { KidHome } from '../pages/KidHome'
import { ParentDashboard } from '../pages/ParentDashboard'
import { ParentUnlock } from '../pages/ParentUnlock'
import { ParentSettings } from '../pages/ParentSettings'
import { NotFound } from '../pages/NotFound'

function RootRedirect() {
  const { deviceType } = useDeviceMode()
  return <Navigate to={deviceType === 'kid' ? '/kids' : '/parent'} replace />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignIn />} />

      <Route element={<RequireAuth />}>
        <Route path="/device-setup" element={<DeviceSetup />} />

        <Route element={<RequireDeviceMode />}>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/kids" element={<KidPicker />} />
          <Route path="/kids/:kidId/home" element={<KidHome />} />
          <Route path="/parent/unlock" element={<ParentUnlock />} />

          <Route element={<RequireParentUnlock />}>
            <Route path="/parent" element={<ParentDashboard />} />
            <Route path="/parent/settings" element={<ParentSettings />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
